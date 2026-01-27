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
            
            return NetworkTopology(
                scan_id=scan_id,
                source_type=source_type,
                source_id=source_id,
                projects=projects,
                total_projects=total_projects,
                total_vpcs=total_vpcs,
                total_subnets=total_subnets,
                failed_projects=failed_projects
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

