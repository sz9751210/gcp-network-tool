"""
Pydantic models for GCP Network Planner.
Defines the data structures for network topology representation.
"""
from datetime import datetime
from typing import Optional, List
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
    description: Optional[str] = None
    labels: dict = Field(default_factory=dict)
    zone: Optional[str] = None  # For VMs


class FirewallRule(BaseModel):
    """Represents a VPC firewall rule."""
    name: str
    direction: str  # "INGRESS" or "EGRESS"
    action: str  # "ALLOW" or "DENY"
    priority: int
    source_ranges: list[str] = Field(default_factory=list)
    destination_ranges: list[str] = Field(default_factory=list)
    source_tags: list[str] = Field(default_factory=list)
    target_tags: list[str] = Field(default_factory=list)
    allowed: list[dict] = Field(default_factory=list)  # [{"IPProtocol": "tcp", "ports": ["80", "443"]}]
    denied: list[dict] = Field(default_factory=list)
    vpc_network: str
    project_id: str
    disabled: bool = False
    description: Optional[str] = None


class CloudArmorRule(BaseModel):
    """Represents a single rule within a Cloud Armor policy."""
    priority: int
    action: str  # "allow", "deny(403)", "deny(404)", "deny(502)", etc.
    description: Optional[str] = None
    match_expression: Optional[str] = None  # CEL expression
    preview: bool = False


class CloudArmorPolicy(BaseModel):
    """Represents a Cloud Armor security policy."""
    name: str
    description: Optional[str] = None
    rules: list[CloudArmorRule] = Field(default_factory=list)
    adaptive_protection_enabled: bool = False
    project_id: str
    self_link: str = ""


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


class UsedInternalIP(BaseModel):
    """Represents a used internal IP address."""
    ip_address: str
    resource_type: str  # "VM", "ForwardingRule", "Reservation"
    resource_name: str
    project_id: str
    vpc: str
    subnet: str
    region: str


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
    used_internal_ips: list[UsedInternalIP] = Field(default_factory=list)
    firewall_rules: list[FirewallRule] = Field(default_factory=list)
    cloud_armor_policies: list[CloudArmorPolicy] = Field(default_factory=list)


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


class IPCheckRequest(BaseModel):
    """Request to check details of an internal IP."""
    ip_address: str


class IPCheckResponse(BaseModel):
    """Response for IP detail check."""
    ip_address: str
    is_used: bool
    used_by: Optional[UsedInternalIP] = None
    subnet: Optional[Subnet] = None
    vpc: Optional[VPCNetwork] = None
    project: Optional[Project] = None


class SuffixSearchRequest(BaseModel):
    """Request to find available IPs with a specific suffix."""
    suffix: int = Field(..., ge=0, le=255)
    cidr_mask: int = 24  # Usually /24 for the suffix logic
    project_ids: Optional[list[str]] = None  # Optional: filter by project
    vpc_names: Optional[list[str]] = None # Optional: filter by VPC name pattern
    environment: Optional[str] = None # Optional: filter by environment (prod/dev/test etc using name match)


class SuffixSearchResponse(BaseModel):
    """Response for suffix search."""
    suffix: int
    available_ips: list[dict] = Field(default_factory=list) # {ip, subnet, vpc, project, region}


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


class ScanHistoryItem(BaseModel):
    """Summary of a past scan."""
    scan_id: str
    timestamp: datetime
    status: str
    source_type: str
    source_id: str
    total_projects: int
    total_vpcs: int
    total_subnets: int


class IPPlanRequest(BaseModel):
    """Request to plan IP ranges."""
    source_project_id: str
    source_vpc_id: Optional[str] = None  # Optional: specific VPC to plan for
    region: str
    peer_projects: List[str] = Field(default_factory=list)
    cidr_mask: int = 24
    base_cidr: str = "10.0.0.0/8"


class IPPlanResponse(BaseModel):
    """Response for IP planning."""
    available_cidrs: List[str]
    checked_scope: List[str]  # List of project IDs checked
