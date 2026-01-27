"""
GCP Network Planner API
FastAPI application for scanning and analyzing GCP network topology.
"""
import logging
from contextlib import asynccontextmanager
from typing import Optional, List
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from credentials_manager import credentials_manager, CredentialInfo

from models import (
    ScanRequest, CIDRCheckRequest, CIDRCheckResponse,
    NetworkTopology, ScanStatusResponse
)
from gcp_scanner import scan_network_topology
from cidr_analyzer import (
    find_all_conflicts, suggest_available_cidrs,
    get_cidr_info, calculate_ip_utilization
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# In-memory store for scan results (replace with Redis/DB in production)
scan_store: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Starting GCP Network Planner API")
    yield
    logger.info("Shutting down GCP Network Planner API")


app = FastAPI(
    title="GCP Network Planner",
    description="API for scanning and analyzing GCP network topology",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def run_scan_task(scan_id: str, source_type: str, source_id: str, include_shared_vpc: bool):
    """Background task for running network scan."""
    try:
        scan_store[scan_id]["status"] = "running"
        
        topology = scan_network_topology(
            source_type=source_type,
            source_id=source_id,
            include_shared_vpc=include_shared_vpc
        )
        
        scan_store[scan_id] = {
            "status": "completed",
            "topology": topology.model_dump(),
            "progress": 1.0,
            "projects_scanned": topology.total_projects,
            "total_projects": topology.total_projects,
        }
        
        logger.info(f"Scan {scan_id} completed: {topology.total_projects} projects, {topology.total_vpcs} VPCs")
        
    except Exception as e:
        logger.error(f"Scan {scan_id} failed: {e}")
        scan_store[scan_id] = {
            "status": "failed",
            "error": str(e),
            "progress": 0,
        }


@app.post("/api/scan", response_model=ScanStatusResponse)
async def start_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    """
    Start a network topology scan.
    
    Returns a scan ID that can be used to check status and retrieve results.
    """
    import uuid
    scan_id = str(uuid.uuid4())
    
    # Initialize scan status
    scan_store[scan_id] = {
        "status": "pending",
        "progress": 0,
        "projects_scanned": 0,
        "total_projects": 0,
    }
    
    # Start background scan
    background_tasks.add_task(
        run_scan_task,
        scan_id,
        request.source_type,
        request.source_id,
        request.include_shared_vpc
    )
    
    logger.info(f"Started scan {scan_id} for {request.source_type}/{request.source_id}")
    
    return ScanStatusResponse(
        scan_id=scan_id,
        status="pending",
        progress=0,
        projects_scanned=0,
        total_projects=0,
        message=f"Scan started for {request.source_type} {request.source_id}"
    )


@app.get("/api/scan/{scan_id}/status", response_model=ScanStatusResponse)
async def get_scan_status(scan_id: str):
    """Get the status of a running or completed scan."""
    if scan_id not in scan_store:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    scan_data = scan_store[scan_id]
    
    return ScanStatusResponse(
        scan_id=scan_id,
        status=scan_data.get("status", "unknown"),
        progress=scan_data.get("progress", 0),
        projects_scanned=scan_data.get("projects_scanned", 0),
        total_projects=scan_data.get("total_projects", 0),
        message=scan_data.get("error")
    )


@app.get("/api/scan/{scan_id}/results", response_model=NetworkTopology)
async def get_scan_results(scan_id: str):
    """Get the results of a completed scan."""
    if scan_id not in scan_store:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    scan_data = scan_store[scan_id]
    
    if scan_data.get("status") != "completed":
        raise HTTPException(
            status_code=400, 
            detail=f"Scan not completed. Current status: {scan_data.get('status')}"
        )
    
    return NetworkTopology(**scan_data["topology"])


@app.get("/api/networks", response_model=Optional[NetworkTopology])
async def get_latest_topology():
    """Get the most recent scan results."""
    # Find the latest completed scan
    latest = None
    for scan_id, data in scan_store.items():
        if data.get("status") == "completed":
            if latest is None or data["topology"]["scan_timestamp"] > latest["topology"]["scan_timestamp"]:
                latest = data
    
    if latest is None:
        return None
    
    return NetworkTopology(**latest["topology"])


@app.post("/api/check-cidr", response_model=CIDRCheckResponse)
async def check_cidr_conflict(request: CIDRCheckRequest):
    """
    Check if a CIDR conflicts with existing subnets.
    
    Uses the latest scan results to find conflicts.
    """
    # Get the latest topology
    latest = None
    for scan_id, data in scan_store.items():
        if data.get("status") == "completed":
            if latest is None or data["topology"]["scan_timestamp"] > latest["topology"]["scan_timestamp"]:
                latest = data
    
    if latest is None:
        raise HTTPException(
            status_code=400, 
            detail="No scan results available. Run a scan first."
        )
    
    topology = NetworkTopology(**latest["topology"])
    
    # Find conflicts
    conflicts = find_all_conflicts(
        input_cidr=request.cidr,
        topology=topology,
        vpc_self_link=request.vpc_self_link,
        project_id=request.project_id
    )
    
    # Suggest alternatives if conflicts found
    suggested_cidrs = []
    if conflicts:
        suggested_cidrs = suggest_available_cidrs(
            base_cidr="10.0.0.0/8",  # Default to RFC1918 space
            topology=topology,
            prefix_length=24,
            count=5
        )
    
    return CIDRCheckResponse(
        input_cidr=request.cidr,
        has_conflict=len(conflicts) > 0,
        conflicts=conflicts,
        suggested_cidrs=suggested_cidrs
    )


class CIDRInfoRequest(BaseModel):
    cidr: str


@app.post("/api/cidr-info")
async def get_cidr_details(request: CIDRInfoRequest):
    """Get detailed information about a CIDR block."""
    return get_cidr_info(request.cidr)


class UtilizationRequest(BaseModel):
    vpc_cidr: str
    project_id: str
    vpc_name: str


@app.post("/api/utilization")
async def get_vpc_utilization(request: UtilizationRequest):
    """Get IP utilization stats for a VPC."""
    # Get the latest topology
    latest = None
    for scan_id, data in scan_store.items():
        if data.get("status") == "completed":
            if latest is None:
                latest = data
    
    if latest is None:
        raise HTTPException(status_code=400, detail="No scan results available")
    
    topology = NetworkTopology(**latest["topology"])
    
    # Find the VPC
    for project in topology.projects:
        if project.project_id == request.project_id:
            for vpc in project.vpc_networks:
                if vpc.name == request.vpc_name:
                    return calculate_ip_utilization(request.vpc_cidr, vpc.subnets)
    
    raise HTTPException(status_code=404, detail="VPC not found")


# ============ Credentials Management Endpoints ============

@app.get("/api/credentials", response_model=List[CredentialInfo])
async def list_credentials():
    """List all stored credentials."""
    return credentials_manager.list_credentials()


@app.get("/api/credentials/active", response_model=Optional[CredentialInfo])
async def get_active_credential():
    """Get the currently active credential."""
    return credentials_manager.get_active_credential()


@app.post("/api/credentials/upload", response_model=CredentialInfo)
async def upload_credential(
    file: UploadFile = File(...),
    name: str = Form(...)
):
    """Upload a new credential file."""
    try:
        content = await file.read()
        return credentials_manager.add_credential(content, name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to upload credential: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload credential")


@app.post("/api/credentials/{cred_id}/activate", response_model=CredentialInfo)
async def activate_credential(cred_id: str):
    """Set a credential as the active one."""
    try:
        return credentials_manager.activate_credential(cred_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.delete("/api/credentials/{cred_id}")
async def delete_credential(cred_id: str):
    """Delete a credential."""
    try:
        credentials_manager.delete_credential(cred_id)
        return {"success": True, "message": f"Credential {cred_id} deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class CredentialUpdateRequest(BaseModel):
    name: str


@app.patch("/api/credentials/{cred_id}", response_model=CredentialInfo)
async def update_credential(cred_id: str, request: CredentialUpdateRequest):
    """Update a credential's display name."""
    try:
        return credentials_manager.update_credential_name(cred_id, request.name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
