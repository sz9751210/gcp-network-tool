"""
GCP Scanner for Network Planner.
Handles recursive project discovery and network data extraction using GCP APIs.
"""
import logging
import uuid
from datetime import datetime
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from google.cloud import compute_v1
from google.cloud import resourcemanager_v3
from google.api_core import exceptions as gcp_exceptions

from models import (
    Project, VPCNetwork, Subnet, NetworkTopology
)
from credentials_manager import credentials_manager

logger = logging.getLogger(__name__)


class GCPScanner:
    """Scanner for GCP network resources across multiple projects."""
    
    def __init__(self, max_workers: int = 10):
        """
        Initialize the GCP Scanner.
        
        Args:
            max_workers: Maximum number of concurrent threads for scanning
        """
        self.max_workers = max_workers
        
        # Get active credential path
        cred_path = credentials_manager.get_active_credential_path()
        if cred_path:
            import os
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = cred_path
            logger.info(f"Using credential: {cred_path}")
        
        self.projects_client = resourcemanager_v3.ProjectsClient()
        self.folders_client = resourcemanager_v3.FoldersClient()
        
    def scan_folder(self, folder_id: str, include_shared_vpc: bool = True) -> NetworkTopology:
        """
        Scan all projects under a folder for network resources.
        
        Args:
            folder_id: GCP Folder ID (numeric)
            include_shared_vpc: Whether to include Shared VPC relationships
            
        Returns:
            NetworkTopology containing all discovered resources
        """
        scan_id = str(uuid.uuid4())
        logger.info(f"Starting folder scan: {folder_id}, scan_id: {scan_id}")
        
        # Get all projects under the folder (recursively)
        project_ids = self._list_projects_in_folder(folder_id)
        logger.info(f"Found {len(project_ids)} projects in folder {folder_id}")
        
        # Scan each project
        projects = self._scan_projects(project_ids, include_shared_vpc)
        
        # Build topology
        topology = NetworkTopology(
            scan_id=scan_id,
            scan_timestamp=datetime.utcnow(),
            source_type="folder",
            source_id=folder_id,
            projects=projects,
            total_projects=len(projects),
            total_vpcs=sum(len(p.vpc_networks) for p in projects),
            total_subnets=sum(
                len(v.subnets) for p in projects for v in p.vpc_networks
            ),
            failed_projects=sum(1 for p in projects if p.scan_status == "error")
        )
        
        return topology
    
    def scan_organization(self, org_id: str, include_shared_vpc: bool = True) -> NetworkTopology:
        """
        Scan all projects under an organization for network resources.
        
        Args:
            org_id: GCP Organization ID (numeric)
            include_shared_vpc: Whether to include Shared VPC relationships
            
        Returns:
            NetworkTopology containing all discovered resources
        """
        scan_id = str(uuid.uuid4())
        logger.info(f"Starting organization scan: {org_id}, scan_id: {scan_id}")
        
        # Get all projects under the organization
        project_ids = self._list_projects_in_organization(org_id)
        logger.info(f"Found {len(project_ids)} projects in organization {org_id}")
        
        # Scan each project
        projects = self._scan_projects(project_ids, include_shared_vpc)
        
        # Build topology
        topology = NetworkTopology(
            scan_id=scan_id,
            scan_timestamp=datetime.utcnow(),
            source_type="organization",
            source_id=org_id,
            projects=projects,
            total_projects=len(projects),
            total_vpcs=sum(len(p.vpc_networks) for p in projects),
            total_subnets=sum(
                len(v.subnets) for p in projects for v in p.vpc_networks
            ),
            failed_projects=sum(1 for p in projects if p.scan_status == "error")
        )
        
    def scan_network_topology(
        self, 
        source_type: str, 
        source_id: str, 
        include_shared_vpc: bool = True
    ) -> NetworkTopology:
        """
        Main entry point for scanning GCP network topology.
        
        Args:
            source_type: "folder", "organization", or "project"
            source_id: ID(s) corresponding to the source type. 
                      For "project", can be a single ID or comma-separated list.
            include_shared_vpc: Whether to include Shared VPC relationships
            
        Returns:
            NetworkTopology containing all discovered resources
        """
        scan_id = str(uuid.uuid4())
        projects = []
        
        try:
            if source_type == "folder":
                project_ids = self._list_projects_in_folder(source_id)
                projects = self._scan_projects(project_ids, include_shared_vpc)
                
            elif source_type == "organization":
                project_ids = self._list_projects_in_organization(source_id)
                projects = self._scan_projects(project_ids, include_shared_vpc)
                
            elif source_type == "project":
                # Support comma-separated list of project IDs
                project_ids = [pid.strip() for pid in source_id.split(",") if pid.strip()]
                projects = self._scan_projects(project_ids, include_shared_vpc)
                
            elif source_type == "all_accessible":
                project_ids = self._list_all_accessible_projects()
                logger.info(f"Auto-discovered {len(project_ids)} projects")
                projects = self._scan_projects(project_ids, include_shared_vpc)
                
            else:
                raise ValueError(f"Invalid source_type: {source_type}")

            # Filter out empty projects if they failed or have no networks (optional, keeping all for now)
            
            # Calculate stats
            total_projects = len(projects)
            total_vpcs = sum(len(p.vpc_networks) for p in projects)
            total_subnets = sum(sum(len(v.subnets) for v in p.vpc_networks) for p in projects)
            failed_projects = sum(1 for p in projects if p.scan_status != "success")
            
            # Collect public IPs from all projects
            public_ips = self._collect_public_ips(projects)
            
            # Collect used internal IPs from all projects
            used_internal_ips = self._collect_internal_ips(projects)
            
            # Collect firewall rules from all projects
            firewall_rules = self._collect_firewall_rules(projects)
            
            # Collect Cloud Armor policies from all projects
            cloud_armor_policies = self._collect_cloud_armor_policies(projects)
            
            return NetworkTopology(
                scan_id=scan_id,
                source_type=source_type,
                source_id=source_id,
                projects=projects,
                total_projects=total_projects,
                total_vpcs=total_vpcs,
                total_subnets=total_subnets,
                failed_projects=failed_projects,
                public_ips=public_ips,
                used_internal_ips=used_internal_ips,
                firewall_rules=firewall_rules,
                cloud_armor_policies=cloud_armor_policies
            )
            
        except Exception as e:
            logger.error(f"Scan failed: {e}")
            raisesources
    
    def scan_project(self, project_id: str, include_shared_vpc: bool = True) -> NetworkTopology:
        """
        Scan a single project for network resources.
        
        Args:
            project_id: GCP Project ID
            include_shared_vpc: Whether to include Shared VPC relationships
            
        Returns:
            NetworkTopology containing all discovered resources
        """
        scan_id = str(uuid.uuid4())
        logger.info(f"Starting single project scan: {project_id}, scan_id: {scan_id}")
        
        # Scan the single project
        projects = self._scan_projects([project_id], include_shared_vpc)
        
        # Build topology
        topology = NetworkTopology(
            scan_id=scan_id,
            scan_timestamp=datetime.utcnow(),
            source_type="project",
            source_id=project_id,
            projects=projects,
            total_projects=len(projects),
            total_vpcs=sum(len(p.vpc_networks) for p in projects),
            total_subnets=sum(
                len(v.subnets) for p in projects for v in p.vpc_networks
            ),
            failed_projects=sum(1 for p in projects if p.scan_status == "error")
        )
        
        return topology

    
    def _list_projects_in_folder(self, folder_id: str) -> list[str]:
        """Recursively list all project IDs under a folder."""
        project_ids = []
        
        try:
            # List projects directly in this folder
            request = resourcemanager_v3.ListProjectsRequest(
                parent=f"folders/{folder_id}"
            )
            for project in self.projects_client.list_projects(request=request):
                if project.state == resourcemanager_v3.Project.State.ACTIVE:
                    project_ids.append(project.project_id)
            
            # List subfolders and recurse
            folder_request = resourcemanager_v3.ListFoldersRequest(
                parent=f"folders/{folder_id}"
            )
            for subfolder in self.folders_client.list_folders(request=folder_request):
                if subfolder.state == resourcemanager_v3.Folder.State.ACTIVE:
                    # Extract folder ID from name (format: folders/FOLDER_ID)
                    subfolder_id = subfolder.name.split("/")[-1]
                    project_ids.extend(self._list_projects_in_folder(subfolder_id))
                    
        except gcp_exceptions.PermissionDenied as e:
            logger.warning(f"Permission denied for folder {folder_id}: {e}")
        except Exception as e:
            logger.error(f"Error listing projects in folder {folder_id}: {e}")
        
        return project_ids
    
    def _list_projects_in_organization(self, org_id: str) -> list[str]:
        """List all project IDs under an organization."""
        project_ids = []
        
        try:
            # List all projects with this organization as ancestor
            request = resourcemanager_v3.SearchProjectsRequest(
                query=f"parent:organizations/{org_id}"
            )
            for project in self.projects_client.search_projects(request=request):
                if project.state == resourcemanager_v3.Project.State.ACTIVE:
                    project_ids.append(project.project_id)
                    
        except gcp_exceptions.PermissionDenied as e:
            logger.warning(f"Permission denied for organization {org_id}: {e}")
        except Exception as e:
            logger.error(f"Error listing projects in organization {org_id}: {e}")
        
        return project_ids
    
    def _list_all_accessible_projects(self) -> list[str]:
        """List all active projects accesssible to the credential."""
        project_ids = []
        try:
            # Empty query returns all projects reachable by credentials
            # https://cloud.google.com/python/docs/reference/cloudresourcemanager/latest/google.cloud.resourcemanager_v3.services.projects.ProjectsClient#google_cloud_resourcemanager_v3_services_projects_ProjectsClient_search_projects
            request = resourcemanager_v3.SearchProjectsRequest(query="")
            for project in self.projects_client.search_projects(request=request):
                if project.state == resourcemanager_v3.Project.State.ACTIVE:
                    project_ids.append(project.project_id)
        except Exception as e:
            logger.error(f"Error searching for all projects: {e}")
        
        return project_ids
    
    def _collect_public_ips(self, projects: list) -> list:
        """
        Collect all public/external IP addresses from projects.
        Includes:
        - VM Instances (Access Configs)
        - Forwarding Rules (Global & Regional Load Balancers)
        - Static Addresses (Global & Regional, Cloud NAT, Reserved)
        
        Args:
            projects: List of scanned Project objects
            
        Returns:
            List of PublicIP objects
        """
        from models import PublicIP
        public_ips_map = {}  # Map ip_address -> PublicIP object to deduplicate
        
        for project in projects:
            if project.scan_status != "success":
                continue
                
            try:
                # 1. Scan Addresses (Global & Regional) - Most authoritative source for Static IPs
                addresses_client = compute_v1.AddressesClient(credentials=self.projects_client._transport._credentials)
                global_addresses_client = compute_v1.GlobalAddressesClient(credentials=self.projects_client._transport._credentials)

                # Regional Addresses
                agg_list_request = compute_v1.AggregatedListAddressesRequest(project=project.project_id)
                for zone_name, addresses_scoped_list in addresses_client.aggregated_list(request=agg_list_request):
                    if not addresses_scoped_list.addresses:
                        continue
                    
                    region = zone_name.split("/")[-1]
                    if region.startswith("regions/"):
                         region = region.split("/")[-1]

                    for addr in addresses_scoped_list.addresses:
                        if addr.address_type == "EXTERNAL":
                            # Determine usage
                            resource_type = "Static Address"
                            resource_name = addr.name
                            if addr.users:
                                # Try to identify what's using it
                                user_link = addr.users[0]
                                if "forwardingRules" in user_link:
                                    resource_type = "LoadBalancer"
                                    resource_name = user_link.split("/")[-1]
                                elif "instances" in user_link:
                                    resource_type = "VM"
                                    resource_name = user_link.split("/")[-1]
                                elif "routers" in user_link: # Cloud NAT often linked via router
                                    resource_type = "CloudNAT"
                                    resource_name = user_link.split("/")[-1]
                            elif addr.status == "RESERVED":
                                resource_type = "Unused Address"

                            public_ips_map[addr.address] = PublicIP(
                                ip_address=addr.address,
                                resource_type=resource_type,
                                resource_name=resource_name,
                                project_id=project.project_id,
                                region=region,
                                status=addr.status, # IN_USE or RESERVED
                                description=addr.description
                            )

                # Global Addresses
                for addr in global_addresses_client.list(project=project.project_id):
                     if addr.address_type == "EXTERNAL":
                        resource_type = "Global Address"
                        resource_name = addr.name
                        if addr.users:
                            user_link = addr.users[0]
                            if "forwardingRules" in user_link:
                                resource_type = "Global LoadBalancer"
                                resource_name = user_link.split("/")[-1]
                        elif addr.status == "RESERVED":
                            resource_type = "Unused Global Address"
                        
                        public_ips_map[addr.address] = PublicIP(
                            ip_address=addr.address,
                            resource_type=resource_type,
                            resource_name=resource_name,
                            project_id=project.project_id,
                            region="global",
                            status=addr.status,
                            description=addr.description
                        )

                # 2. Scan Forwarding Rules (Load Balancers that might use ephemeral IPs)
                forwarding_client = compute_v1.ForwardingRulesClient(credentials=self.projects_client._transport._credentials)
                global_forwarding_client = compute_v1.GlobalForwardingRulesClient(credentials=self.projects_client._transport._credentials)

                # Regional Forwarding Rules
                agg_fwd_request = compute_v1.AggregatedListForwardingRulesRequest(project=project.project_id)
                for zone_name, rules_scoped_list in forwarding_client.aggregated_list(request=agg_fwd_request):
                     if not rules_scoped_list.forwarding_rules:
                        continue
                     region = zone_name.split("/")[-1]
                     if region.startswith("regions/"):
                         region = region.split("/")[-1]

                     for rule in rules_scoped_list.forwarding_rules:
                        if rule.load_balancing_scheme in ["EXTERNAL", "EXTERNAL_MANAGED"] and rule.I_p_address:
                            # If already exists (from Address), update with more specific info from Forwarding Rule
                            if rule.I_p_address in public_ips_map:
                                existing = public_ips_map[rule.I_p_address]
                                if not existing.description and rule.description:
                                    existing.description = rule.description
                                if rule.labels:
                                    existing.labels = dict(rule.labels)
                                # Fetch details if missing
                                if not existing.details and rule.load_balancing_scheme in ["EXTERNAL", "EXTERNAL_MANAGED"]:
                                     existing.details = self._resolve_lb_details(rule, project.project_id)
                                # If the existing one is just a Static Address, upgrading it to LoadBalancer is more descriptive
                                if existing.resource_type == "Static Address":
                                    existing.resource_type = "LoadBalancer"
                                    # Don't overwrite resource_name if it was a user-defined static IP name, 
                                    # unless it's auto-generated and the FR name is better? 
                                    # Usually FR name is the service name in K8s, so it might be better.
                                    # But let's stick to description/labels for display and keep the underlying resource name as the IP name if it exists.
                            else:
                                public_ips_map[rule.I_p_address] = PublicIP(
                                    ip_address=rule.I_p_address,
                                    resource_type="LoadBalancer",
                                    resource_name=rule.name,
                                    project_id=project.project_id,
                                    region=region,
                                    status="IN_USE",
                                    description=rule.description,
                                    labels=dict(rule.labels) if rule.labels else {},
                                    details=self._resolve_lb_details(rule, project.project_id) if rule.load_balancing_scheme in ["EXTERNAL", "EXTERNAL_MANAGED"] else None
                                )

                # Global Forwarding Rules
                for rule in global_forwarding_client.list(project=project.project_id):
                    if rule.load_balancing_scheme in ["EXTERNAL", "EXTERNAL_MANAGED"] and rule.I_p_address:
                         if rule.I_p_address in public_ips_map:
                                existing = public_ips_map[rule.I_p_address]
                                if not existing.description and rule.description:
                                    existing.description = rule.description
                                if rule.labels:
                                    existing.labels = dict(rule.labels)
                                # Fetch details if missing
                                if not existing.details and rule.load_balancing_scheme in ["EXTERNAL", "EXTERNAL_MANAGED"]:
                                     existing.details = self._resolve_lb_details(rule, project.project_id)
                                if existing.resource_type == "Global Address":
                                    existing.resource_type = "Global LoadBalancer"
                         else:
                                public_ips_map[rule.I_p_address] = PublicIP(
                                    ip_address=rule.I_p_address,
                                    resource_type="Global LoadBalancer",
                                    resource_name=rule.name,
                                    project_id=project.project_id,
                                    region="global",
                                    status="IN_USE",
                                    description=rule.description,
                                    labels=dict(rule.labels) if rule.labels else {},
                                    details=self._resolve_lb_details(rule, project.project_id) if rule.load_balancing_scheme in ["EXTERNAL", "EXTERNAL_MANAGED"] else None
                                )
                
                # 3. Scan VM Instances (Catch ephemeral IPs not in Addresses)
                compute_client = compute_v1.InstancesClient(credentials=self.projects_client._transport._credentials)
                aggregated_list = compute_v1.AggregatedListInstancesRequest(project=project.project_id)
                
                for zone_name, instances_scoped_list in compute_client.aggregated_list(request=aggregated_list):
                    if not instances_scoped_list.instances:
                        continue
                        
                    zone = zone_name.split("/")[-1]
                    region = "-".join(zone.split("-")[:-1]) if "-" in zone else zone
                    
                    for instance in instances_scoped_list.instances:
                        for interface in instance.network_interfaces:
                            if interface.access_configs:
                                for access_config in interface.access_configs:
                                    if access_config.nat_i_p:
                                        # Only add if not in map (Static IPs take precedence)
                                        if access_config.nat_i_p not in public_ips_map:
                                            public_ips_map[access_config.nat_i_p] = PublicIP(
                                                ip_address=access_config.nat_i_p,
                                                resource_type="VM",
                                                resource_name=instance.name,
                                                project_id=project.project_id,
                                                region=region,
                                                zone=zone,
                                                status="IN_USE"
                                            )
                                        else:
                                            # Update existing entry with better VM info if generic
                                            existing = public_ips_map[access_config.nat_i_p]
                                            if existing.resource_type == "Static Address" or existing.resource_type == "VM":
                                                existing.resource_type = "VM"
                                                existing.resource_name = instance.name
                                                existing.zone = zone
                
            except Exception as e:
                logger.warning(f"Failed to collect public IPs from project {project.project_id}: {e}")
        
        return list(public_ips_map.values())
    
    def _collect_internal_ips(self, projects: list) -> list:
        """
        Collect all used internal IP addresses from projects.
        Includes:
        - VM Instances (Network Interfaces)
        - Internal Forwarding Rules
        - Reserved Internal Addresses
        
        Args:
            projects: List of scanned Project objects
            
        Returns:
            List of UsedInternalIP objects
        """
        from models import UsedInternalIP
        internal_ips_map = {}  # Map ip_address -> UsedInternalIP object
        
        for project in projects:
            if project.scan_status != "success":
                continue
                
            try:
                # 1. Scan Addresses (Internal)
                addresses_client = compute_v1.AddressesClient(credentials=self.projects_client._transport._credentials)
                
                # Regional Addresses
                agg_list_request = compute_v1.AggregatedListAddressesRequest(project=project.project_id)
                for zone_name, addresses_scoped_list in addresses_client.aggregated_list(request=agg_list_request):
                    if not addresses_scoped_list.addresses:
                        continue
                    
                    region = zone_name.split("/")[-1]
                    if region.startswith("regions/"):
                         region = region.split("/")[-1]

                    for addr in addresses_scoped_list.addresses:
                        if addr.address_type == "INTERNAL":
                            # Skip peering ranges or other non-endpoint purposes if needed
                            # But generally we want to know if an IP is "taken"
                            
                            resource_type = "Static Address"
                            resource_name = addr.name
                            if addr.users:
                                user_link = addr.users[0]
                                if "forwardingRules" in user_link:
                                    resource_type = "ForwardingRule"
                                    resource_name = user_link.split("/")[-1]
                                elif "instances" in user_link:
                                    resource_type = "VM"
                                    resource_name = user_link.split("/")[-1]
                            
                            vpc = addr.network.split("/")[-1] if addr.network else ""
                            subnet = addr.subnetwork.split("/")[-1] if addr.subnetwork else ""

                            internal_ips_map[addr.address] = UsedInternalIP(
                                ip_address=addr.address,
                                resource_type=resource_type,
                                resource_name=resource_name,
                                project_id=project.project_id,
                                vpc=vpc,
                                subnet=subnet,
                                region=region
                            )

                # 2. Scan Forwarding Rules (Internal)
                forwarding_client = compute_v1.ForwardingRulesClient(credentials=self.projects_client._transport._credentials)
                
                agg_fwd_request = compute_v1.AggregatedListForwardingRulesRequest(project=project.project_id)
                for zone_name, rules_scoped_list in forwarding_client.aggregated_list(request=agg_fwd_request):
                     if not rules_scoped_list.forwarding_rules:
                        continue
                     region = zone_name.split("/")[-1]
                     if region.startswith("regions/"):
                         region = region.split("/")[-1]

                     for rule in rules_scoped_list.forwarding_rules:
                        if rule.load_balancing_scheme in ["INTERNAL", "INTERNAL_MANAGED", "INTERNAL_SELF_MANAGED"] and rule.I_p_address:
                            # Only add if not already captured
                            if rule.I_p_address not in internal_ips_map:
                                vpc = rule.network.split("/")[-1] if rule.network else ""
                                subnet = rule.subnetwork.split("/")[-1] if rule.subnetwork else ""
                                
                                internal_ips_map[rule.I_p_address] = UsedInternalIP(
                                    ip_address=rule.I_p_address,
                                    resource_type="ForwardingRule",
                                    resource_name=rule.name,
                                    project_id=project.project_id,
                                    vpc=vpc,
                                    subnet=subnet,
                                    region=region
                                )
                
                # 3. Scan VM Instances
                compute_client = compute_v1.InstancesClient(credentials=self.projects_client._transport._credentials)
                aggregated_list = compute_v1.AggregatedListInstancesRequest(project=project.project_id)
                
                for zone_name, instances_scoped_list in compute_client.aggregated_list(request=aggregated_list):
                    if not instances_scoped_list.instances:
                        continue
                        
                    zone = zone_name.split("/")[-1]
                    region = "-".join(zone.split("-")[:-1]) if "-" in zone else zone
                    
                    for instance in instances_scoped_list.instances:
                        for interface in instance.network_interfaces:
                            if interface.network_i_p:
                                # Only add if not in map
                                if interface.network_i_p not in internal_ips_map:
                                    vpc = interface.network.split("/")[-1] if interface.network else ""
                                    subnet = interface.subnetwork.split("/")[-1] if interface.subnetwork else ""
                                    
                                    internal_ips_map[interface.network_i_p] = UsedInternalIP(
                                        ip_address=interface.network_i_p,
                                        resource_type="VM",
                                        resource_name=instance.name,
                                        project_id=project.project_id,
                                        vpc=vpc,
                                        subnet=subnet,
                                        region=region
                                    )
                                else:
                                    # Update with better info
                                    existing = internal_ips_map[interface.network_i_p]
                                    if existing.resource_type == "Static Address":
                                        existing.resource_type = "VM"
                                        existing.resource_name = instance.name
                
            except Exception as e:
                logger.warning(f"Failed to collect internal IPs from project {project.project_id}: {e}")
        
        return list(internal_ips_map.values())
    
    def _collect_firewall_rules(self, projects: list) -> list:
        """
        Collect all firewall rules from projects.
        
        Args:
            projects: List of scanned Project objects
            
        Returns:
            List of FirewallRule objects
        """
        from models import FirewallRule
        firewall_rules = []
        
        for project in projects:
            if project.scan_status != "success":
                continue
                
            try:
                firewall_client = compute_v1.FirewallsClient(credentials=self.projects_client._transport._credentials)
                
                for firewall in firewall_client.list(project=project.project_id):
                    # Determine action and rules
                    action = "ALLOW" if firewall.allowed else "DENY"
                    allowed_rules = [{"IPProtocol": rule.I_p_protocol, "ports": list(rule.ports) if rule.ports else []} for rule in firewall.allowed] if firewall.allowed else []
                    denied_rules = [{"IPProtocol": rule.I_p_protocol, "ports": list(rule.ports) if rule.ports else []} for rule in firewall.denied] if firewall.denied else []
                    
                    firewall_rules.append(FirewallRule(
                        name=firewall.name,
                        direction=firewall.direction if firewall.direction else "INGRESS",
                        action=action,
                        priority=firewall.priority if firewall.priority else 1000,
                        source_ranges=list(firewall.source_ranges) if firewall.source_ranges else [],
                        destination_ranges=list(firewall.destination_ranges) if firewall.destination_ranges else [],
                        source_tags=list(firewall.source_tags) if firewall.source_tags else [],
                        target_tags=list(firewall.target_tags) if firewall.target_tags else [],
                        allowed=allowed_rules,
                        denied=denied_rules,
                        vpc_network=firewall.network.split("/")[-1] if firewall.network else "",
                        project_id=project.project_id,
                        disabled=firewall.disabled if hasattr(firewall, 'disabled') else False,
                        description=firewall.description if firewall.description else None
                    ))
                
            except Exception as e:
                logger.warning(f"Failed to collect firewall rules from project {project.project_id}: {e}")
        
        return firewall_rules
    
    def _collect_cloud_armor_policies(self, projects: list) -> list:
        """
        Collect all Cloud Armor security policies from projects.
        
        Args:
            projects: List of scanned Project objects
            
        Returns:
            List of CloudArmorPolicy objects
        """
        from models import CloudArmorPolicy, CloudArmorRule
        policies = []
        
        for project in projects:
            if project.scan_status != "success":
                continue
                
            try:
                armor_client = compute_v1.SecurityPoliciesClient(credentials=self.projects_client._transport._credentials)
                
                for policy in armor_client.list(project=project.project_id):
                    # Collect rules
                    rules = []
                    if policy.rules:
                        for rule in policy.rules:
                            match_expr = None
                            if rule.match:
                                if rule.match.expr and rule.match.expr.expression:
                                    match_expr = rule.match.expr.expression
                                elif rule.match.config and rule.match.config.src_ip_ranges:
                                    # Synthesize CEL for Basic Mode rules to maintain frontend compatibility
                                    # This allows the frontend parser to extract IPs and the simulator to work
                                    ranges = [f"inIpRange(origin.ip, '{ip}')" for ip in rule.match.config.src_ip_ranges]
                                    match_expr = " || ".join(ranges)

                            rules.append(CloudArmorRule(
                                priority=rule.priority if rule.priority else 2147483647,
                                action=rule.action if rule.action else "allow",
                                description=rule.description if rule.description else None,
                                match_expression=match_expr,
                                preview=rule.preview if hasattr(rule, 'preview') else False
                            ))
                    
                    # Check adaptive protection
                    adaptive_enabled = False
                    if hasattr(policy, 'adaptive_protection_config') and policy.adaptive_protection_config:
                        adaptive_enabled = policy.adaptive_protection_config.layer_7_ddos_defense_config.enable if hasattr(policy.adaptive_protection_config, 'layer_7_ddos_defense_config') else False
                    
                    policies.append(CloudArmorPolicy(
                        name=policy.name,
                        description=policy.description if policy.description else None,
                        rules=rules,
                        adaptive_protection_enabled=adaptive_enabled,
                        project_id=project.project_id,
                        self_link=policy.self_link if policy.self_link else ""
                    ))
                
            except Exception as e:
                logger.warning(f"Failed to collect Cloud Armor policies from project {project.project_id}: {e}")
        
        return policies

    def _resolve_lb_details(self, forwarding_rule, project_id: str):
        """
        Deeply resolve Load Balancer details (Frontend, Routing, Backends).
        Traverses: ForwardingRule -> TargetProxy -> UrlMap -> BackendService -> InstanceGroup/Bucket
        """
        from models import LoadBalancerDetails, LBFrontend, LBRoutingRule, LBBackend
        
        details = LoadBalancerDetails()
        
        try:
            # 1. Frontend Details
            protocol = forwarding_rule.I_p_protocol
            port = forwarding_rule.port_range if forwarding_rule.port_range else (str(forwarding_rule.ports[0]) if forwarding_rule.ports else "All")
            ip_port = f"{forwarding_rule.I_p_address}:{port}"
            
            # Identify Proxy Type and Client
            target = forwarding_rule.target
            proxy_name = target.split("/")[-1]
            proxy_type = "Unknown"
            url_map_link = None
            cert_link = None
            ssl_policy_link = None

            if "targetHttpProxies" in target:
                proxy_type = "HTTP"
                client = compute_v1.TargetHttpProxiesClient(credentials=self.projects_client._transport._credentials)
                proxy = client.get(project=project_id, target_http_proxy=proxy_name)
                url_map_link = proxy.url_map
            elif "targetHttpsProxies" in target:
                proxy_type = "HTTPS"
                client = compute_v1.TargetHttpsProxiesClient(credentials=self.projects_client._transport._credentials)
                proxy = client.get(project=project_id, target_https_proxy=proxy_name)
                url_map_link = proxy.url_map
                if proxy.ssl_certificates:
                    cert_link = proxy.ssl_certificates[0]
                if proxy.ssl_policy:
                    ssl_policy_link = proxy.ssl_policy
            elif "targetTcpProxies" in target:
                proxy_type = "TCP"
                client = compute_v1.TargetTcpProxiesClient(credentials=self.projects_client._transport._credentials)
                proxy = client.get(project=project_id, target_tcp_proxy=proxy_name)
                if proxy.service: # TCP Proxy points directly to backend service usually
                    # Handle TCP Proxy structure if needed, but keeping it simple for now
                     pass
            elif "targetSslProxies" in target:
                proxy_type = "SSL"
                client = compute_v1.TargetSslProxiesClient(credentials=self.projects_client._transport._credentials)
                proxy = client.get(project=project_id, target_ssl_proxy=proxy_name)
                if proxy.service:
                    pass
                if proxy.ssl_certificates:
                    cert_link = proxy.ssl_certificates[0]
            
            details.frontend = LBFrontend(
                protocol=proxy_type,
                ip_port=ip_port,
                certificate=cert_link.split("/")[-1] if cert_link else None,
                ssl_policy=ssl_policy_link.split("/")[-1] if ssl_policy_link else None
            )

            # 2. Routing Rules (from URL Map)
            if url_map_link:
                url_maps_client = compute_v1.UrlMapsClient(credentials=self.projects_client._transport._credentials)
                url_map_name = url_map_link.split("/")[-1]
                url_map = url_maps_client.get(project=project_id, url_map=url_map_name)

                # Default Service
                if url_map.default_service:
                    details.routing_rules.append(LBRoutingRule(
                        hosts=["*"],
                        path="/* (Default)",
                        backend_service=url_map.default_service.split("/")[-1]
                    ))
                
                # Host Rules
                if url_map.host_rules:
                    for host_rule in url_map.host_rules:
                        path_matcher_name = host_rule.path_matcher
                        # Find corresponding path matcher
                        for pm in url_map.path_matchers:
                            if pm.name == path_matcher_name:
                                # Default for this host
                                if pm.default_service:
                                     details.routing_rules.append(LBRoutingRule(
                                        hosts=list(host_rule.hosts),
                                        path="/* (Default)",
                                        backend_service=pm.default_service.split("/")[-1]
                                    ))
                                # Path rules
                                for path_rule in pm.path_rules:
                                    details.routing_rules.append(LBRoutingRule(
                                        hosts=list(host_rule.hosts),
                                        path=", ".join(path_rule.paths),
                                        backend_service=path_rule.service.split("/")[-1]
                                    ))

            # 3. Backend Services Details
            # Collect unique backend services from routing rules
            backend_service_names = list(set([r.backend_service for r in details.routing_rules]))
            
            bs_client = compute_v1.BackendServicesClient(credentials=self.projects_client._transport._credentials)
            bb_client = compute_v1.BackendBucketsClient(credentials=self.projects_client._transport._credentials)

            for bs_name in backend_service_names:
                try:
                    # Try as Backend Service first (most common)
                    bs = bs_client.get(project=project_id, backend_service=bs_name)
                    details.backends.append(LBBackend(
                        name=bs_name,
                        type="Instance Group" if bs.backends else "Network Endpoint Group", # generic guess
                        description=bs.description,
                        cdn_enabled=bs.cdn_policy.cache_mode is not None if bs.cdn_policy else False,
                        security_policy=bs.security_policy.split("/")[-1] if bs.security_policy else None
                    ))
                except:
                    # Try as Backend Bucket
                    try:
                        bb = bb_client.get(project=project_id, backend_bucket=bs_name)
                        details.backends.append(LBBackend(
                            name=bs_name,
                            type="Bucket",
                            description=bb.description,
                            cdn_enabled=bb.cdn_policy.cache_mode is not None if bb.cdn_policy else False
                        ))
                    except Exception as e:
                        logger.warning(f"Could not fetch details for backend {bs_name}: {e}")

        except Exception as e:
            logger.warning(f"Error resolving deep details for LB {forwarding_rule.name}: {e}")
        
        return details


    def _scan_projects(
        self, 
        project_ids: list[str], 
        include_shared_vpc: bool
    ) -> list[Project]:
        """Scan multiple projects concurrently."""
        projects = []
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_project = {
                executor.submit(
                    self._scan_single_project, 
                    pid, 
                    include_shared_vpc
                ): pid for pid in project_ids
            }
            
            for future in as_completed(future_to_project):
                project_id = future_to_project[future]
                try:
                    project = future.result()
                    projects.append(project)
                except Exception as e:
                    logger.error(f"Error scanning project {project_id}: {e}")
                    projects.append(Project(
                        project_id=project_id,
                        project_name=project_id,
                        scan_status="error",
                        error_message=str(e)
                    ))
        
        return projects
    
    def _scan_single_project(
        self, 
        project_id: str, 
        include_shared_vpc: bool
    ) -> Project:
        """Scan a single project for network resources."""
        logger.debug(f"Scanning project: {project_id}")
        
        project = Project(
            project_id=project_id,
            project_name=project_id,  # Will be updated if we can get project details
            scan_status="pending"
        )
        
        try:
            # Get project details
            project_info = self._get_project_info(project_id)
            if project_info:
                project.project_name = project_info.get("display_name", project_id)
                project.project_number = project_info.get("project_number", "")
            
            # Check if this is a Shared VPC host project
            if include_shared_vpc:
                shared_vpc_info = self._get_shared_vpc_info(project_id)
                project.is_shared_vpc_host = shared_vpc_info.get("is_host", False)
                project.shared_vpc_host_project = shared_vpc_info.get("host_project")
            
            # List VPC networks
            project.vpc_networks = self._list_vpc_networks(project_id, include_shared_vpc)
            project.scan_status = "success"
            
        except gcp_exceptions.PermissionDenied as e:
            logger.warning(f"Permission denied for project {project_id}: {e}")
            project.scan_status = "permission_denied"
            project.error_message = f"Permission denied: {e.message}"
            
        except gcp_exceptions.NotFound as e:
            logger.warning(f"Project not found (may be deleted): {project_id}")
            project.scan_status = "error"
            project.error_message = "Project not found"
            
        except Exception as e:
            logger.error(f"Error scanning project {project_id}: {e}")
            project.scan_status = "error"
            project.error_message = str(e)
        
        return project
    
    def _get_project_info(self, project_id: str) -> Optional[dict]:
        """Get project details from Resource Manager."""
        try:
            request = resourcemanager_v3.GetProjectRequest(
                name=f"projects/{project_id}"
            )
            project = self.projects_client.get_project(request=request)
            return {
                "display_name": project.display_name,
                "project_number": project.name.split("/")[-1],
            }
        except Exception as e:
            logger.debug(f"Could not get project info for {project_id}: {e}")
            return None
    
    def _get_shared_vpc_info(self, project_id: str) -> dict:
        """Get Shared VPC information for a project."""
        result = {"is_host": False, "host_project": None}
        
        try:
            xpn_client = compute_v1.ProjectsClient()
            
            # Check if this project is a Shared VPC host
            try:
                xpn_resources = xpn_client.get_xpn_host(project=project_id)
                if xpn_resources:
                    result["is_host"] = True
            except gcp_exceptions.NotFound:
                pass
            except gcp_exceptions.BadRequest:
                # Project is not a host project
                pass
            
            # Check if this project is a service project
            try:
                xpn_host = xpn_client.get_xpn_host(project=project_id)
                # If we get here, the project itself might be the host
            except:
                pass
            
            # Try to get the host project if this is a service project
            try:
                request = compute_v1.GetXpnResourcesRequest(project=project_id)
                # This approach doesn't directly tell us the host, 
                # but we can infer from subnets in other projects
            except:
                pass
                
        except Exception as e:
            logger.debug(f"Could not get Shared VPC info for {project_id}: {e}")
        
        return result
    
    def _list_vpc_networks(
        self, 
        project_id: str, 
        include_shared_vpc: bool
    ) -> list[VPCNetwork]:
        """List all VPC networks in a project."""
        vpcs = []
        networks_client = compute_v1.NetworksClient()
        
        try:
            request = compute_v1.ListNetworksRequest(project=project_id)
            
            for network in networks_client.list(request=request):
                vpc = VPCNetwork(
                    name=network.name,
                    self_link=network.self_link,
                    project_id=project_id,
                    auto_create_subnetworks=network.auto_create_subnetworks or False,
                    routing_mode=network.routing_config.routing_mode if network.routing_config else "REGIONAL",
                    mtu=network.mtu or 1460,
                    peerings=[
                        {
                            "name": p.name,
                            "network": p.network,
                            "state": p.state,
                            "state_details": p.state_details,
                        }
                        for p in (network.peerings or [])
                    ]
                )
                
                # Check if this network is a Shared VPC host network
                if include_shared_vpc:
                    try:
                        xpn_client = compute_v1.ProjectsClient()
                        xpn_resources_request = compute_v1.ListXpnHostsProjectsRequest(
                            project=project_id
                        )
                        # If we can list XPN hosts, this project might be a host
                        vpc.is_shared_vpc_host = True
                    except:
                        pass
                
                # Get subnets for this network
                vpc.subnets = self._list_subnets(project_id, network.self_link)
                vpcs.append(vpc)
                
        except gcp_exceptions.PermissionDenied:
            logger.warning(f"Permission denied listing networks in {project_id}")
        except Exception as e:
            logger.error(f"Error listing networks in {project_id}: {e}")
        
        return vpcs
    
    def _list_subnets(self, project_id: str, network_self_link: str) -> list[Subnet]:
        """List all subnets in a VPC network."""
        subnets = []
        subnetworks_client = compute_v1.SubnetworksClient()
        
        try:
            request = compute_v1.AggregatedListSubnetworksRequest(project=project_id)
            
            for region, subnets_scoped_list in subnetworks_client.aggregated_list(request=request):
                if subnets_scoped_list.subnetworks:
                    for subnetwork in subnets_scoped_list.subnetworks:
                        # Only include subnets belonging to this network
                        if subnetwork.network != network_self_link:
                            continue
                        
                        subnet = Subnet(
                            name=subnetwork.name,
                            region=region.replace("regions/", ""),
                            ip_cidr_range=subnetwork.ip_cidr_range,
                            gateway_ip=subnetwork.gateway_address,
                            private_ip_google_access=subnetwork.private_ip_google_access or False,
                            purpose=subnetwork.purpose if hasattr(subnetwork, 'purpose') else None,
                            self_link=subnetwork.self_link,
                            network=subnetwork.network,
                            secondary_ip_ranges=[
                                {
                                    "range_name": r.range_name,
                                    "ip_cidr_range": r.ip_cidr_range,
                                }
                                for r in (subnetwork.secondary_ip_ranges or [])
                            ]
                        )
                        subnets.append(subnet)
                        
        except gcp_exceptions.PermissionDenied:
            logger.warning(f"Permission denied listing subnets in {project_id}")
        except Exception as e:
            logger.error(f"Error listing subnets in {project_id}: {e}")
        
        return subnets


def scan_network_topology(
    source_type: str,
    source_id: str,
    include_shared_vpc: bool = True
) -> NetworkTopology:
    """
    Main entry point for scanning GCP network topology.
    
    Args:
        source_type: "folder", "organization", "project", or "all_accessible"
        source_id: Folder ID, Organization ID, Project ID(s), or empty for all_accessible
        include_shared_vpc: Whether to include Shared VPC relationships
        
    Returns:
        NetworkTopology containing all discovered resources
    """
    scanner = GCPScanner()
    return scanner.scan_network_topology(source_type, source_id, include_shared_vpc)

