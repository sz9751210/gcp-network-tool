
import logging
from typing import List, Optional
from google.cloud import compute_v1
from google.api_core import exceptions as gcp_exceptions

from models import VPCNetwork, Subnet
from .base import BaseScanner

logger = logging.getLogger(__name__)

class NetworkScanner(BaseScanner):
    """Scanner for Virtual Private Clouds (VPC) and Subnets."""
    
    def scan_vpc_networks(self, project_id: str, include_shared_vpc: bool) -> List[VPCNetwork]:
        """List all VPC networks in a project."""
        vpcs = []
        networks_client = compute_v1.NetworksClient(credentials=self.credentials)
        
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
                        xpn_client = compute_v1.ProjectsClient(credentials=self.credentials)
                        xpn_resources_request = compute_v1.ListXpnHostsProjectsRequest(
                            project=project_id
                        )
                        # If we can list XPN hosts, this project might be a host
                        # This logic is a bit implicit, refining it:
                        # Usually the project itself is marked as host.
                        # If project is host, its networks *can* be shared.
                        pass # Kept consistent with original logic for now
                    except:
                        pass
                
                # Get subnets for this network
                vpc.subnets = self.scan_subnets(project_id, network.self_link)
                vpcs.append(vpc)
                
        except gcp_exceptions.PermissionDenied:
            logger.warning(f"Permission denied listing networks in {project_id}")
        except Exception as e:
            logger.error(f"Error listing networks in {project_id}: {e}")
        
        return vpcs
    
    def scan_subnets(self, project_id: str, network_self_link: str) -> List[Subnet]:
        """List all subnets in a VPC network."""
        subnets = []
        subnetworks_client = compute_v1.SubnetworksClient(credentials=self.credentials)
        
        try:
            request = compute_v1.AggregatedListSubnetworksRequest(project=project_id)
            
            # aggregated_list returns (region, subnets_scoped_list)
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
