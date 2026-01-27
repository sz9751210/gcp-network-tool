"""
Pydantic models for GCP Network Planner.
Defines the data structures for network topology representation.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Subnet(BaseModel):
    """Represents a GCP Subnet within a VPC."""
    name: str
    region: str
    ip_cidr_range: str
    gateway_ip: Optional[str] = None
    private_ip_google_access: bool = False
    secondary_ip_ranges: list[dict] = Field(default_factory=list)
    purpose: Optional[str] = None  # e.g., "PRIVATE", "REGIONAL_MANAGED_PROXY"
    self_link: str = ""
    
    # For Service Projects using Shared VPC
    network: Optional[str] = None  # Full network URL


class VPCNetwork(BaseModel):
    """Represents a GCP VPC Network."""
    name: str
    self_link: str
    project_id: str
    auto_create_subnetworks: bool = False
    routing_mode: str = "REGIONAL"
    mtu: int = 1460
    subnets: list[Subnet] = Field(default_factory=list)
    
    # Shared VPC indicators
    is_shared_vpc_host: bool = False
    shared_vpc_service_projects: list[str] = Field(default_factory=list)
    
    # Peering connections
    peerings: list[dict] = Field(default_factory=list)


class PublicIP(BaseModel):
    """Represents a public/external IP address and its associated resource."""
    ip_address: str
    resource_type: str  # "VM", "LoadBalancer", "CloudNAT"
    resource_name: str
    project_id: str
    region: str
    status: str = "IN_USE"  # "IN_USE", "RESERVED"
    zone: Optional[str] = None  # For VMs


class Project(BaseModel):
    """Represents a GCP Project with its networks."""
    project_id: str
    project_name: str
    project_number: str = ""
    vpc_networks: list[VPCNetwork] = Field(default_factory=list)
    
    # Shared VPC
    is_shared_vpc_host: bool = False
    shared_vpc_host_project: Optional[str] = None  # For service projects
    
    # Scan metadata
    scan_status: str = "pending"  # pending, success, error, permission_denied
    error_message: Optional[str] = None


class NetworkTopology(BaseModel):
    """Root model containing the full network topology."""
    scan_id: str
    scan_timestamp: datetime = Field(default_factory=datetime.utcnow)
    source_type: str  # "folder" or "organization"
    source_id: str
    projects: list[Project] = Field(default_factory=list)
    
    # Summary stats
    total_projects: int = 0
    total_vpcs: int = 0
    total_subnets: int = 0
    failed_projects: int = 0
    public_ips: list[PublicIP] = Field(default_factory=list)


# Request/Response schemas
class ScanRequest(BaseModel):
    """Request to initiate a network scan."""
    source_type: str = Field(..., pattern="^(folder|organization|project|all_accessible)$")
    source_id: str
    include_shared_vpc: bool = True


class CIDRCheckRequest(BaseModel):
    """Request to check CIDR conflict."""
    cidr: str
    vpc_self_link: Optional[str] = None  # Optional: check within specific VPC
    project_id: Optional[str] = None  # Optional: check within specific project


class CIDRConflict(BaseModel):
    """Represents a CIDR conflict."""
    conflicting_cidr: str
    subnet_name: str
    vpc_name: str
    project_id: str
    region: str
    overlap_type: str  # "exact", "contains", "contained_by", "partial"


class CIDRCheckResponse(BaseModel):
    """Response for CIDR conflict check."""
    input_cidr: str
    has_conflict: bool
    conflicts: list[CIDRConflict] = Field(default_factory=list)
    suggested_cidrs: list[str] = Field(default_factory=list)


class ScanStatusResponse(BaseModel):
    """Response for scan status."""
    scan_id: str
    status: str  # "running", "completed", "failed"
    progress: float  # 0.0 to 1.0
    projects_scanned: int
    total_projects: int
    message: Optional[str] = None
