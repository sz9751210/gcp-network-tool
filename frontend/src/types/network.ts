/**
 * TypeScript interfaces for GCP Network Planner.
 * Matches backend Pydantic models for type safety.
 */

export interface Subnet {
    name: string;
    region: string;
    ip_cidr_range: string;
    gateway_ip: string | null;
    private_ip_google_access: boolean;
    secondary_ip_ranges: SecondaryIPRange[];
    purpose: string | null;
    self_link: string;
    network: string | null;
}

export interface ScanHistoryItem {
    scanId: string;
    timestamp: string;
    status: string;
    sourceType: string;
    sourceId: string;
    totalProjects: number;
    totalVpcs: number;
    totalSubnets: number;
}

export interface SecondaryIPRange {
    range_name: string;
    ip_cidr_range: string;
}

export interface VPCPeering {
    name: string;
    network: string;
    state: string;
    state_details: string;
}

export interface VPCNetwork {
    name: string;
    self_link: string;
    project_id: string;
    auto_create_subnetworks: boolean;
    routing_mode: string;
    mtu: number;
    subnets: Subnet[];
    is_shared_vpc_host: boolean;
    shared_vpc_service_projects: string[];
    peerings: VPCPeering[];
}

export interface GCEInstance {
    name: string;
    project_id: string;
    zone: string;
    machine_type: string;
    status: string;
    internal_ip: string | null;
    external_ip: string | null;
    network: string;
    subnet: string;
    tags: string[];
    labels: Record<string, string>;
    service_accounts: string[];
    creation_timestamp: string | null;
    cpu_count?: number;
    memory_mb?: number;
}

export interface GKECluster {
    name: string;
    project_id: string;
    location: string;
    network: string;
    subnet: string;
    endpoint: string;
    version: string;
    status: string;
    services_ipv4_cidr: string | null;
    pods_ipv4_cidr: string | null;
    master_ipv4_cidr: string | null;
    node_count: number;
    labels: Record<string, string>;
}

export interface GKEContainer {
    name: string;
    image: string;
    ready: boolean;
}

export interface GKEPod {
    name: string;
    namespace: string;
    cluster_name: string;
    project_id: string;
    status: string;
    pod_ip: string | null;
    host_ip: string | null;
    node_name: string | null;
    creation_timestamp: string | null;
    labels: Record<string, string>;
    containers: GKEContainer[];
}

export interface GKEDeployment {
    name: string;
    namespace: string;
    cluster_name: string;
    project_id: string;
    replicas: number;
    available_replicas: number;
    updated_replicas: number;
    labels: Record<string, string>;
    selector: Record<string, string>;
    creation_timestamp: string | null;
}

export interface GKEService {
    name: string;
    namespace: string;
    cluster_name: string;
    project_id: string;
    type: string;
    cluster_ip: string | null;
    external_ip: string | null;
    ports: any[];
    selector: Record<string, string>;
    creation_timestamp: string | null;
}

export interface GKEIngress {
    name: string;
    namespace: string;
    cluster_name: string;
    project_id: string;
    hosts: string[];
    address: string | null;
    rules: any[];
    creation_timestamp: string | null;
}

export interface GKEConfigMap {
    name: string;
    namespace: string;
    cluster_name: string;
    project_id: string;
    data_keys: string[];
    creation_timestamp: string | null;
}

export interface GKESecret {
    name: string;
    namespace: string;
    cluster_name: string;
    project_id: string;
    type: string;
    data_keys: string[];
    creation_timestamp: string | null;
}

export interface GKEPVC {
    name: string;
    namespace: string;
    cluster_name: string;
    project_id: string;
    status: string;
    volume_name: string | null;
    capacity: string | null;
    access_modes: string[];
    storage_class: string | null;
    creation_timestamp: string | null;
}

export interface GCSBucket {
    name: string;
    project_id: string;
    location: string;
    storage_class: string;
    creation_time: string | null;
    labels: Record<string, string>;
    is_public: boolean;
    versioning_enabled: boolean;
}

export interface Project {
    project_id: string;
    project_name: string;
    project_number: string;
    vpc_networks: VPCNetwork[];
    is_shared_vpc_host: boolean;
    shared_vpc_host_project: string | null;
    scan_status: 'pending' | 'success' | 'error' | 'permission_denied';
    error_message: string | null;
    instances?: GCEInstance[];
    gke_clusters?: GKECluster[];
    storage_buckets?: GCSBucket[];
    gke_pods?: GKEPod[];
    gke_deployments?: GKEDeployment[];
    gke_services?: GKEService[];
    gke_ingress?: GKEIngress[];
    gke_configmaps?: GKEConfigMap[];
    gke_secrets?: GKESecret[];
    gke_pvcs?: GKEPVC[];
}

export interface PublicIP {
    ip_address: string;
    resource_type: string;  // "VM", "LoadBalancer", "CloudNAT"
    resource_name: string;
    project_id: string;
    region: string;
    status: string;  // "IN_USE", "RESERVED"
    description?: string;
    labels?: Record<string, string>;
    details?: LoadBalancerDetails;
    zone?: string;  // For VMs
}

export interface CertificateInfo {
    name: string;
    expiry: string | null;
    dns_names: string[];
    sha1_fingerprint: string | null;
}

export interface LBFrontend {
    protocol: string;
    ip_port: string;
    certificate?: string;
    ssl_policy?: string;
    network_tier?: string;
    certificate_details: CertificateInfo[];
}

export interface LBRoutingRule {
    hosts: string[];
    path: string;
    backend_service: string;
}

export interface LBBackend {
    name: string;
    type: string;
    description?: string;
    cdn_enabled: boolean;
    security_policy?: string;
    capacity_scaler?: number;
}

export interface LoadBalancerDetails {
    frontend?: LBFrontend;
    routing_rules: LBRoutingRule[];
    backends: LBBackend[];
    url_map?: string;
}

export interface UsedInternalIP {
    ip_address: string;
    resource_type: string;
    resource_name: string;
    project_id: string;
    vpc: string;
    subnet: string;
    region: string;
    description?: string;
    labels?: Record<string, string>;
    details?: LoadBalancerDetails;
}

export interface FirewallRule {
    name: string;
    direction: string;  // "INGRESS" or "EGRESS"
    action: string;  // "ALLOW" or "DENY"
    priority: number;
    source_ranges: string[];
    destination_ranges: string[];
    source_tags: string[];
    target_tags: string[];
    target_service_accounts: string[];
    allowed: { IPProtocol: string; ports: string[] }[];
    denied: { IPProtocol: string; ports: string[] }[];
    vpc_network: string;
    project_id: string;
    disabled: boolean;
    description?: string;
}

export interface CloudArmorRule {
    priority: number;
    action: string;  // "allow", "deny(403)", etc.
    description?: string;
    match_expression?: string;
    preview: boolean;
}

export interface CloudArmorPolicy {
    name: string;
    description?: string;
    rules: CloudArmorRule[];
    adaptive_protection_enabled: boolean;
    project_id: string;
    self_link: string;
}

export interface BackendService {
    name: string;
    protocol: string;
    session_affinity?: string;
    associated_ips: string[];
    project_id: string;
    region?: string | null;
    load_balancing_scheme?: string | null;
    description?: string;
    backends: LBBackend[];
    health_checks: string[];
    self_link: string;
}

export interface NetworkTopology {
    scan_id: string;
    scan_timestamp: string;
    source_type: 'folder' | 'organization' | 'project' | 'all_accessible';
    source_id: string;
    projects: Project[];
    total_projects: number;
    total_vpcs: number;
    total_subnets: number;
    failed_projects: number;
    public_ips: PublicIP[];
    used_internal_ips: UsedInternalIP[];
    firewall_rules: FirewallRule[];
    cloud_armor_policies: CloudArmorPolicy[];
    backend_services: BackendService[];
    instances?: GCEInstance[];
    gke_clusters?: GKECluster[];
    storage_buckets?: GCSBucket[];
    gke_pods?: GKEPod[];
    gke_deployments?: GKEDeployment[];
    gke_services?: GKEService[];
    gke_ingress?: GKEIngress[];
    gke_configmaps?: GKEConfigMap[];
    gke_secrets?: GKESecret[];
    gke_pvcs?: GKEPVC[];
}

export interface ScanRequest {
    source_type: 'folder' | 'organization' | 'project' | 'all_accessible';
    source_id: string;
    include_shared_vpc: boolean;
}

export interface ScanStatusResponse {
    scan_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    projects_scanned: number;
    total_projects: number;
    message: string | null;
}

export interface CIDRCheckRequest {
    cidr: string;
    vpc_self_link?: string;
    project_id?: string;
}

export interface CIDRConflict {
    conflicting_cidr: string;
    subnet_name: string;
    vpc_name: string;
    project_id: string;
    region: string;
    overlap_type: 'exact' | 'contains' | 'contained_by' | 'partial';
}

export interface CIDRCheckResponse {
    input_cidr: string;
    has_conflict: boolean;
    conflicts: CIDRConflict[];
    suggested_cidrs: string[];
}

export interface CIDRInfo {
    cidr: string;
    network_address: string;
    broadcast_address: string;
    netmask: string;
    prefix_length: number;
    total_hosts: number;
    usable_hosts: number;
    first_usable: string | null;
    last_usable: string | null;
    is_private: boolean;
}

export interface VPCUtilization {
    vpc_cidr: string;
    total_ips: number;
    used_ips: number;
    available_ips: number;
    utilization_percent: number;
    subnet_count: number;
}

export interface IPPlanRequest {
    source_project_id: string;
    source_vpc_id?: string;
    region: string;
    peer_projects: string[];
    cidr_mask: number;
    base_cidr: string;
}

export interface IPPlanResponse {
    available_cidrs: string[];
    checked_scope: string[];
}

export interface SecurityIssue {
    id: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    category: 'FIREWALL' | 'COST' | 'SECURITY' | 'COMPLIANCE';
    title: string;
    description: string;
    resource_name: string;
    project_id: string;
    metadata: Record<string, any>;
    remediation: string;
}

export interface SecurityReport {
    issues: SecurityIssue[];
    generated_at: string;
    summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        total: number;
        by_category: Record<string, number>;
    };
}

// Tree table row types for hierarchical display
export type RowType = 'project' | 'vpc' | 'subnet';

export interface TreeRow {
    id: string;
    type: RowType;
    depth: number;
    name: string;
    cidr?: string;
    region?: string;
    gatewayIp?: string;
    privateGoogleAccess?: boolean;
    isSharedVpcHost?: boolean;
    scanStatus?: string;
    errorMessage?: string;
    parentId?: string;
    children?: TreeRow[];
    isExpanded?: boolean;
    original: Project | VPCNetwork | Subnet;
}
