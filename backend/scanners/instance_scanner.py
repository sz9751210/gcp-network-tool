import logging
from typing import List, Dict, Any, Optional
from google.cloud import compute_v1
from scanners.base import BaseScanner
from models import GCEInstance
from datetime import datetime

logger = logging.getLogger(__name__)

class GCEInstanceScanner(BaseScanner):
    """Scanner for GCE VM Instances."""
    
    def scan_instances(self, project_id: str) -> List[GCEInstance]:
        """Scans for all GCE instances across all zones in a project."""
        logger.info(f"Scanning GCE instances in project {project_id}")
        instances = []
        
        try:
            client = compute_v1.InstancesClient(credentials=self.credentials)
            # Use aggregated_list to get instances across all zones
            request = compute_v1.AggregatedListInstancesRequest(project=project_id)
            
            for zone, instances_in_zone in client.aggregated_list(request=request):
                if not instances_in_zone.instances:
                    continue
                
                # Zone name is usually 'zones/us-central1-a'
                zone_name = zone.split('/')[-1]
                
                for inst in instances_in_zone.instances:
                    # Extract network and subnet info
                    network_interfaces = inst.network_interfaces
                    primary_if = network_interfaces[0] if network_interfaces else None
                    
                    internal_ip = primary_if.network_i_p if primary_if else None
                    external_ip = None
                    if primary_if and primary_if.access_configs:
                        external_ip = primary_if.access_configs[0].nat_i_p
                    
                    network_url = primary_if.network if primary_if else ""
                    subnet_url = primary_if.subnetwork if primary_if else ""
                    
                    instances.append(GCEInstance(
                        name=inst.name,
                        project_id=project_id,
                        zone=zone_name,
                        machine_type=inst.machine_type.split('/')[-1],
                        status=inst.status,
                        internal_ip=internal_ip,
                        external_ip=external_ip,
                        network=network_url,
                        subnet=subnet_url,
                        tags=list(inst.tags.items) if inst.tags else [],
                        labels=dict(inst.labels) if inst.labels else {},
                        service_accounts=[sa.email for sa in inst.service_accounts] if inst.service_accounts else [],
                        creation_timestamp=datetime.fromisoformat(inst.creation_timestamp) if inst.creation_timestamp else None
                    ))
                    
            return instances
            
        except Exception as e:
            logger.error(f"Error scanning GCE instances in {project_id}: {e}")
            return []
