"""
Pydantic models for GCP Network Planner.
Defines the data structures for network topology representation.
"""
from datetime import datetime
from typing import Optional, List, Dict
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
    details: Optional['LoadBalancerDetails'] = None
    zone: Optional[str] = None  # For VMs


class CertificateInfo(BaseModel):
    """SSL Certificate Details."""
    name: str
    expiry: Optional[datetime] = None
    dns_names: List[str] = Field(default_factory=list)
    sha1_fingerprint: Optional[str] = None


class LBFrontend(BaseModel):
    """Frontend configuration of a Load Balancer."""
    protocol: str  # HTTP, HTTPS, TCP, UDP
    ip_port: str  # e.g. "34.1.1.1:443"
    certificate: Optional[str] = None
    ssl_policy: Optional[str] = None

    network_tier: Optional[str] = None
    certificate_details: List[CertificateInfo] = Field(default_factory=list)


class LBRoutingRule(BaseModel):
    """Routing rule for a Load Balancer."""
    hosts: List[str]
    path: str
    backend_service: str


class LBBackend(BaseModel):
    """Backend service or bucket details."""
    name: str # e.g. "backend-service-1"
    type: str # "Instance Group", "NEG", "Bucket"
    description: Optional[str] = None
    cdn_enabled: bool = False
    security_policy: Optional[str] = None # Cloud Armor
    capacity_scaler: Optional[float] = None


class LoadBalancerDetails(BaseModel):
    """Deep details for a Load Balancer."""
    frontend: Optional[LBFrontend] = None
    routing_rules: List[LBRoutingRule] = Field(default_factory=list)
    backends: List[LBBackend] = Field(default_factory=list)
    url_map: Optional[str] = None # Name of the URL Map



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


class BackendService(BaseModel):
    """Represents a GCP Backend Service."""
    name: str
    protocol: str # HTTP, HTTPS, TCP, UDP, SSL
    session_affinity: Optional[str] = None
    associated_ips: list[str] = Field(default_factory=list) # List of IP addresses pointing to this service
    project_id: str
    region: Optional[str] = None # None for Global
    load_balancing_scheme: Optional[str] = None # e.g. EXTERNAL, INTERNAL_MANAGED
    description: Optional[str] = None
    backends: list[LBBackend] = Field(default_factory=list)
    health_checks: list[str] = Field(default_factory=list)
    self_link: str = ""


class GCEInstance(BaseModel):
    """Represents a GCE VM Instance."""
    name: str
    project_id: str
    zone: str
    machine_type: str
    status: str
    internal_ip: Optional[str] = None
    external_ip: Optional[str] = None
    network: str
    subnet: str
    tags: List[str] = Field(default_factory=list)
    labels: Dict[str, str] = Field(default_factory=dict)
    service_accounts: List[str] = Field(default_factory=list)
    creation_timestamp: Optional[datetime] = None
    cpu_count: Optional[int] = None
    memory_mb: Optional[int] = None


class GKECluster(BaseModel):
    """Represents a GKE Cluster."""
    name: str
    project_id: str
    location: str
    network: str
    subnet: str
    endpoint: str
    version: str
    status: str
    services_ipv4_cidr: Optional[str] = None
    pods_ipv4_cidr: Optional[str] = None
    master_ipv4_cidr: Optional[str] = None
    node_count: int = 0
    labels: Dict[str, str] = Field(default_factory=dict)

class GKEContainer(BaseModel):
    name: str
    image: str
    ready: bool

class GKEPod(BaseModel):
    """Represents a Pod in a GKE Cluster."""
    name: str
    namespace: str
    cluster_name: str
    project_id: str
    status: str
    pod_ip: Optional[str] = None
    host_ip: Optional[str] = None
    node_name: Optional[str] = None
    creation_timestamp: Optional[datetime] = None
    labels: Dict[str, str] = Field(default_factory=dict)
    containers: List[GKEContainer] = Field(default_factory=list)

class GKEDeployment(BaseModel):
    """Represents a Deployment in a GKE Cluster."""
    name: str
    namespace: str
    cluster_name: str
    project_id: str
    replicas: int
    available_replicas: int
    updated_replicas: int
    labels: Dict[str, str] = Field(default_factory=dict)
    selector: Dict[str, str] = Field(default_factory=dict)
    creation_timestamp: Optional[datetime] = None

class GKEService(BaseModel):
    """Represents a Service in a GKE Cluster."""
    name: str
    namespace: str
    cluster_name: str
    project_id: str
    type: str # ClusterIP, NodePort, LoadBalancer
    cluster_ip: Optional[str] = None
    external_ip: Optional[str] = None
    ports: List[dict] = Field(default_factory=list) # [{"port": 80, "targetPort": 8080}]
    selector: Dict[str, str] = Field(default_factory=dict)
    creation_timestamp: Optional[datetime] = None

class GKEIngress(BaseModel):
    """Represents an Ingress in a GKE Cluster."""
    name: str
    namespace: str
    cluster_name: str
    project_id: str
    hosts: List[str] = Field(default_factory=list)
    address: Optional[str] = None # External IP
    rules: List[dict] = Field(default_factory=list)
    creation_timestamp: Optional[datetime] = None

class GKEConfigMap(BaseModel):
    name: str
    namespace: str
    cluster_name: str
    project_id: str
    data_keys: List[str] = Field(default_factory=list)
    creation_timestamp: Optional[datetime] = None

class GKESecret(BaseModel):
    name: str
    namespace: str
    cluster_name: str
    project_id: str
    type: str
    data_keys: List[str] = Field(default_factory=list)
    creation_timestamp: Optional[datetime] = None

class GKEPVC(BaseModel):
    name: str
    namespace: str
    cluster_name: str
    project_id: str
    status: str
    volume_name: Optional[str] = None
    capacity: Optional[str] = None
    access_modes: List[str] = Field(default_factory=list)
    storage_class: Optional[str] = None
    creation_timestamp: Optional[datetime] = None


class GCSBucket(BaseModel):
    """Represents a Cloud Storage Bucket."""
    name: str
    project_id: str
    location: str
    storage_class: str
    creation_time: Optional[datetime] = None
    labels: Dict[str, str] = Field(default_factory=dict)
    is_public: bool = False
    versioning_enabled: bool = False


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
    backend_services: list['BackendService'] = Field(default_factory=list)
    instances: list[GCEInstance] = Field(default_factory=list)
    gke_clusters: list[GKECluster] = Field(default_factory=list)
    storage_buckets: list[GCSBucket] = Field(default_factory=list)
    gke_pods: list[GKEPod] = Field(default_factory=list)
    gke_deployments: list[GKEDeployment] = Field(default_factory=list)
    gke_services: list[GKEService] = Field(default_factory=list)
    gke_ingress: list[GKEIngress] = Field(default_factory=list)
    gke_configmaps: list[GKEConfigMap] = Field(default_factory=list)
    gke_secrets: list[GKESecret] = Field(default_factory=list)
    gke_pvcs: list[GKEPVC] = Field(default_factory=list)


class UsedInternalIP(BaseModel):
    """Represents a used internal IP address."""
    ip_address: str
    resource_type: str  # "VM", "ForwardingRule", "Reservation"
    resource_name: str
    project_id: str
    vpc: str
    subnet: str
    region: str
    description: Optional[str] = None
    labels: dict = Field(default_factory=dict)
    details: Optional['LoadBalancerDetails'] = None


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
    backend_services: list['BackendService'] = Field(default_factory=list)
    instances: list[GCEInstance] = Field(default_factory=list)
    gke_clusters: list[GKECluster] = Field(default_factory=list)
    storage_buckets: list[GCSBucket] = Field(default_factory=list)
    gke_pods: list[GKEPod] = Field(default_factory=list)
    gke_deployments: list[GKEDeployment] = Field(default_factory=list)
    gke_services: list[GKEService] = Field(default_factory=list)
    gke_ingress: list[GKEIngress] = Field(default_factory=list)
    gke_configmaps: list[GKEConfigMap] = Field(default_factory=list)
    gke_secrets: list[GKESecret] = Field(default_factory=list)
    gke_pvcs: list[GKEPVC] = Field(default_factory=list)


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
