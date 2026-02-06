"""
GCP Network Planner API
FastAPI application for scanning and analyzing GCP network topology.
"""
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, List, Dict
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from credentials_manager import credentials_manager, CredentialInfo

from models import (
    ScanRequest, CIDRCheckRequest, CIDRCheckResponse,
    NetworkTopology, ScanStatusResponse,
    IPPlanRequest, IPPlanResponse, ScanHistoryItem,
    IPCheckRequest, IPCheckResponse,
    SuffixSearchRequest, SuffixSearchResponse,
    GKEHPA
)
from gcp_scanner import GCPScanner
from cidr_analyzer import (
    find_all_conflicts, suggest_available_cidrs, find_available_cidrs,
    calculate_ip_utilization,
    get_ip_details, find_common_suffix_ips
)
from security_analyzer import analyze_security, SecurityReport

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

from scan_manager import scan_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Starting GCP Network Planner API")
    scan_manager.load_scans()
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
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def run_scan_task(scan_id: str, source_type: str, source_id: str, include_shared_vpc: bool, scan_options: Optional[Dict[str, bool]] = None):
    """Background task for running network scan."""
    try:
        # Update running status
        current_data = scan_manager.get_scan(scan_id)
        if current_data:
            current_data["status"] = "running"
            scan_manager.save_scan(scan_id, current_data)
        
        scanner = GCPScanner()
        topology = scanner.scan_network_topology(
            source_type=source_type,
            source_id=source_id,
            include_shared_vpc=include_shared_vpc,
            scan_options=scan_options
        )
        
        # Prepare result
        result = {
            "status": "completed",
            "topology": topology.model_dump(),
            "progress": 1.0,
            "projects_scanned": topology.total_projects,
            "total_projects": topology.total_projects,
            "scan_id": scan_id
        }
        scan_manager.save_scan(scan_id, result)
        
        logger.info(f"Scan {scan_id} completed: {topology.total_projects} projects, {topology.total_vpcs} VPCs")
        
    except Exception as e:
        logger.error(f"Scan {scan_id} failed: {e}")
        scan_manager.save_scan(scan_id, {
            "scan_id": scan_id,
            "status": "failed",
            "error": str(e),
            "progress": 0,
        })


@app.get("/api/scan/{scan_id}/summary")
async def get_scan_summary(scan_id: str):
    """Get a light summary of scan results to avoid loading giant JSONs."""
    scan_data = scan_manager.get_scan(scan_id)
    if not scan_data:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    topo = scan_data.get("topology", {})
    return {
        "scan_id": scan_id,
        "status": scan_data.get("status"),
        "timestamp": topo.get("scan_timestamp"),
        "summary": {
            "projects": len(topo.get("projects", [])),
            "vpcs": topo.get("total_vpcs", 0),
            "subnets": topo.get("total_subnets", 0),
            "public_ips": len(topo.get("public_ips", [])),
            "internal_ips": len(topo.get("used_internal_ips", [])),
            "instances": len(topo.get("instances", [])),
            "gke_clusters": len(topo.get("gke_clusters", [])),
            "gke_pods": len(topo.get("gke_pods", [])),
            "gke_deployments": len(topo.get("gke_deployments", [])),
            "gke_services": len(topo.get("gke_services", [])),
            "storage_buckets": len(topo.get("storage_buckets", [])),
            "firewall_rules": len(topo.get("firewall_rules", [])),
        }
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
    scan_data = {
        "scan_id": scan_id,
        "status": "pending",
        "progress": 0,
        "projects_scanned": 0,
        "total_projects": 0,
    }
    scan_manager.save_scan(scan_id, scan_data)
    
    # Start background scan
    background_tasks.add_task(
        run_scan_task,
        scan_id,
        request.source_type,
        request.source_id,
        request.include_shared_vpc,
        request.scan_options
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
    scan_data = scan_manager.get_scan(scan_id)
    if not scan_data:
        raise HTTPException(status_code=404, detail="Scan not found")
    
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
    scan_data = scan_manager.get_scan(scan_id)
    if not scan_data:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    if scan_data.get("status") != "completed":
        raise HTTPException(
            status_code=400, 
            detail=f"Scan not completed. Current status: {scan_data.get('status')}"
        )
    
    return NetworkTopology(**scan_data["topology"])


@app.get("/api/scans", response_model=List[ScanHistoryItem])
async def list_scans():
    """List all available scans using metadata (memory efficient)."""
    history = []
    metadata = scan_manager.get_all_scans_metadata()
    for scan_id, data in metadata.items():
        history.append(ScanHistoryItem(
            scan_id=scan_id,
            timestamp=data.get("timestamp") or datetime.utcnow(),
            status=data.get("status", "unknown"),
            source_type=data.get("source_type", "unknown"),
            source_id=data.get("source_id", "unknown"),
            total_projects=data.get("total_projects", 0),
            total_vpcs=0, # Summary doesn't have these, frontend handles gracefully
            total_subnets=0
        ))
            
    # Sort by timestamp desc
    return sorted(history, key=lambda x: str(x.timestamp), reverse=True)


@app.get("/api/networks", response_model=Optional[NetworkTopology])
async def get_latest_topology():
    """Get the most recent scan results efficiently."""
    latest = scan_manager.get_latest_completed_scan()
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
    latest = scan_manager.get_latest_completed_scan()
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


@app.post("/api/plan-ip", response_model=IPPlanResponse)
async def plan_ip(request: IPPlanRequest):
    """
    Plan IP range for a new subnet.
    
    Checks for available CIDR blocks that do not conflict with:
    1. Subnets in the source project
    2. Subnets in specified peer projects
    """
    # Get the latest topology
    latest = scan_manager.get_latest_completed_scan()
    if latest is None:
        raise HTTPException(
            status_code=400, 
            detail="No scan results available. Run a scan first."
        )
    
    topology = NetworkTopology(**latest["topology"])
    
    # Collect conflict scopes
    projects_to_check = {request.source_project_id}
    if request.peer_projects:
        projects_to_check.update(request.peer_projects)
    
    existing_cidrs = []
    
    # Iterate through topology to gather relevant subnets
    for project in topology.projects:
        if project.project_id in projects_to_check:
            for vpc in project.vpc_networks:
                # If specific VPC is requested for source, we might filter?
                # But for safety, checking ALL subnets in the project is better 
                # to avoid future conflicts if peered within same project.
                # Logic: Gather ALL subnets from ALL checked projects.
                
                for subnet in vpc.subnets:
                    existing_cidrs.append(subnet.ip_cidr_range)
                    for secondary in subnet.secondary_ip_ranges:
                        existing_cidrs.append(secondary.get("ip_cidr_range", ""))
    
    # Find available CIDRs
    available = find_available_cidrs(
        base_cidr=request.base_cidr,
        existing_cidrs=existing_cidrs,
        prefix_length=request.cidr_mask,
        count=10
    )
    
    return IPPlanResponse(
        available_cidrs=available,
        checked_scope=list(projects_to_check)
    )


@app.post("/api/check-ip", response_model=IPCheckResponse)
async def check_ip_details(request: IPCheckRequest):
    """
    Check detailed information about an internal IP.
    """
    # Get the latest topology
    latest = scan_manager.get_latest_completed_scan()
    if latest is None:
        raise HTTPException(
            status_code=400, 
            detail="No scan results available. Run a scan first."
        )
    
    topology = NetworkTopology(**latest["topology"])
    
    return get_ip_details(request.ip_address, topology)


@app.post("/api/find-suffix-ips", response_model=SuffixSearchResponse)
async def find_suffix_ips(request: SuffixSearchRequest):
    """
    Find available IPs with a specific suffix.
    """
    # Get the latest topology
    latest = scan_manager.get_latest_completed_scan()
    if latest is None:
        raise HTTPException(
            status_code=400, 
            detail="No scan results available. Run a scan first."
        )
    
    topology = NetworkTopology(**latest["topology"])
    
    ips = find_common_suffix_ips(
        suffix=request.suffix,
        topology=topology,
        cidr_mask=request.cidr_mask,
        project_ids=request.project_ids,
        vpc_names=request.vpc_names
    )
    
    return SuffixSearchResponse(
        suffix=request.suffix,
        available_ips=ips
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
    latest = scan_manager.get_latest_completed_scan()
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


class DomainResolveRequest(BaseModel):
    domain: str


class DomainResolveResponse(BaseModel):
    domain: str
    ips: List[str]
    error: Optional[str] = None


@app.post("/api/resolve-domain", response_model=DomainResolveResponse)
async def resolve_domain(request: DomainResolveRequest):
    """Resolve domain name to IP addresses."""
    import socket
    try:
        # Use getaddrinfo to get IP addresses (AF_UNSPEC for both IPv4 and IPv6)
        # port 80 is just dummy to satisfy the call
        info = socket.getaddrinfo(request.domain, 80, proto=socket.IPPROTO_TCP)
        # Extract IPs (item[4] is the address tuple, item[4][0] is the IP)
        ips = sorted(list(set(item[4][0] for item in info)))
        return DomainResolveResponse(domain=request.domain, ips=ips)
    except socket.gaierror as e:
        return DomainResolveResponse(domain=request.domain, ips=[], error=f"Resolution failed: {e}")
    except Exception as e:
        logger.error(f"Domain resolution error: {e}")
        return DomainResolveResponse(domain=request.domain, ips=[], error=str(e))


@app.get("/api/audit/latest", response_model=SecurityReport)
async def get_security_audit():
    """Get security audit report for the latest scan."""
    latest = scan_manager.get_latest_completed_scan()
    if latest is None:
        raise HTTPException(status_code=404, detail="No scan results available")
    
    topology = NetworkTopology(**latest["topology"])
    return analyze_security(topology)


# ============ Granular Resource List Endpoints ============

@app.get("/api/resources/instances")
async def list_instances():
    """List all GCE instances from the latest scan."""
    latest = scan_manager.get_latest_completed_scan()
    if not latest:
        return []
    
    topo = latest.get("topology", {})
    all_instances = []
    # Collect from projects
    for project in topo.get("projects", []):
        for inst in project.get("instances", []):
            inst["project_name"] = project.get("project_name")
            all_instances.append(inst)
            
    # Also collect from top-level list if present
    if "instances" in topo:
        # Avoid duplicates if they are already in project lists
        seen = {inst["name"] + inst["project_id"] for inst in all_instances}
        for inst in topo["instances"]:
            if inst["name"] + inst["project_id"] not in seen:
                all_instances.append(inst)
                
    return all_instances


@app.get("/api/resources/gke-clusters")
async def list_gke_clusters():
    """List all GKE clusters from the latest scan."""
    latest = scan_manager.get_latest_completed_scan()
    if not latest:
        return []
    
    topo = latest.get("topology", {})
    all_clusters = []
    for project in topo.get("projects", []):
        for cluster in project.get("gke_clusters", []):
            cluster["project_name"] = project.get("project_name")
            all_clusters.append(cluster)
    
    if "gke_clusters" in topo:
        seen = {c["name"] + c["project_id"] for c in all_clusters}
        for cluster in topo["gke_clusters"]:
            if cluster["name"] + cluster["project_id"] not in seen:
                all_clusters.append(cluster)
                
    return all_clusters


@app.get("/api/resources/storage-buckets")
async def list_storage_buckets():
    """List all Storage buckets from the latest scan."""
    latest = scan_manager.get_latest_completed_scan()
    if not latest:
        return []
    
    topo = latest.get("topology", {})
    all_buckets = []
    for project in topo.get("projects", []):
        for bucket in project.get("storage_buckets", []):
            bucket["project_name"] = project.get("project_name")
            all_buckets.append(bucket)
            
    if "storage_buckets" in topo:
        seen = {b["name"] + b["project_id"] for b in all_buckets}
        for bucket in topo["storage_buckets"]:
            if bucket["name"] + bucket["project_id"] not in seen:
                all_buckets.append(bucket)
                
    return all_buckets


@app.get("/api/resources/vpcs")
async def list_vpcs():
    """List all VPC networks from the latest scan."""
    latest = scan_manager.get_latest_completed_scan()
    if not latest:
        return []
    
    topo = latest.get("topology", {})
    all_vpcs = []
    for project in topo.get("projects", []):
        for vpc in project.get("vpc_networks", []):
            vpc["project_id"] = project.get("project_id")
            vpc["project_name"] = project.get("project_name")
            all_vpcs.append(vpc)
    return all_vpcs

@app.get("/api/resources/gke-pods")
async def list_gke_pods():
    latest = scan_manager.get_latest_completed_scan()
    if not latest: return []
    topo = latest.get("topology", {})
    return topo.get("gke_pods", [])

@app.get("/api/resources/gke-deployments")
async def list_gke_deployments():
    latest = scan_manager.get_latest_completed_scan()
    if not latest: return []
    topo = latest.get("topology", {})
    return topo.get("gke_deployments", [])

@app.get("/api/resources/gke-services")
async def list_gke_services():
    latest = scan_manager.get_latest_completed_scan()
    if not latest: return []
    topo = latest.get("topology", {})
    return topo.get("gke_services", [])

@app.get("/api/resources/gke-ingress")
async def list_gke_ingress():
    latest = scan_manager.get_latest_completed_scan()
    if not latest: return []
    topo = latest.get("topology", {})
    return topo.get("gke_ingress", [])

@app.get("/api/resources/gke-configmaps")
async def list_gke_configmaps():
    latest = scan_manager.get_latest_completed_scan()
    if not latest: return []
    topo = latest.get("topology", {})
    return topo.get("gke_configmaps", [])

@app.get("/api/resources/gke-secrets")
async def list_gke_secrets():
    latest = scan_manager.get_latest_completed_scan()
    if not latest: return []
    topo = latest.get("topology", {})
    return topo.get("gke_secrets", [])

@app.get("/api/resources/gke-pvcs")
async def list_gke_pvcs():
    latest = scan_manager.get_latest_completed_scan()
    if not latest: return []
    topo = latest.get("topology", {})
    return topo.get("gke_pvcs", [])


@app.get("/api/resources/gke-hpa")
async def list_gke_hpa():
    latest = scan_manager.get_latest_completed_scan()
    if not latest: return []
    topo = latest.get("topology", {})
    return topo.get("gke_hpas", [])


@app.get("/api/resources/public-ips")
async def list_public_ips():
    """List all Public IPs from the latest scan."""
    latest = scan_manager.get_latest_completed_scan()
    if not latest:
        return []
    
    topo = latest.get("topology", {})
    return topo.get("public_ips", [])


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
