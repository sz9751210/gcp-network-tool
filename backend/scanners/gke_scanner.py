import logging
from typing import List, Dict, Any, Optional
from google.cloud import container_v1
from scanners.base import BaseScanner
from models import GKECluster

logger = logging.getLogger(__name__)

class GKEConsistentScanner(BaseScanner):
    """Scanner for GKE Clusters."""
    
    def scan_clusters(self, project_id: str) -> List[GKECluster]:
        """Scans for all GKE clusters across all locations in a project."""
        logger.info(f"Scanning GKE clusters in project {project_id}")
        clusters = []
        
        try:
            client = container_v1.ClusterManagerClient(credentials=self.credentials)
            # Parent format: projects/{project_id}/locations/-
            parent = f"projects/{project_id}/locations/-"
            request = container_v1.ListClustersRequest(parent=parent)
            
            response = client.list_clusters(request=request)
            
            for cluster in response.clusters:
                # Extract network and subnet info
                # GKE uses full URLs for network/subnet
                network = cluster.network
                subnet = cluster.subnetwork
                
                # CIDR ranges
                pods_cidr = cluster.ip_allocation_policy.cluster_ipv4_cidr_block if cluster.ip_allocation_policy else None
                services_cidr = cluster.ip_allocation_policy.services_ipv4_cidr_block if cluster.ip_allocation_policy else None
                master_cidr = cluster.private_cluster_config.master_ipv4_cidr_block if cluster.private_cluster_config else None

                clusters.append(GKECluster(
                    name=cluster.name,
                    project_id=project_id,
                    location=cluster.location,
                    network=network,
                    subnet=subnet,
                    endpoint=cluster.endpoint,
                    version=cluster.current_master_version,
                    status=cluster.status.name,
                    services_ipv4_cidr=services_cidr,
                    pods_ipv4_cidr=pods_cidr,
                    master_ipv4_cidr=master_cidr,
                    node_count=cluster.current_node_count,
                    labels=dict(cluster.resource_labels) if cluster.resource_labels else {}
                ))
                    
            return clusters
            
        except Exception as e:
            logger.error(f"Error scanning GKE clusters in {project_id}: {e}")
            return []
