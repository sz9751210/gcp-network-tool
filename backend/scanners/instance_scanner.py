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
        
        # Cache for machine types to avoid redundant API calls
        # Key: (zone, machine_type_name), Value: (cpu_count, memory_mb)
        machine_type_cache = {}
        
        try:
            client = compute_v1.InstancesClient(credentials=self.credentials)
            mt_client = compute_v1.MachineTypesClient(credentials=self.credentials)
            
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
                    
                    # Machine type info
                    mt_name = inst.machine_type.split('/')[-1]
                    cpu_count = None
                    memory_mb = None
                    
                    cache_key = (zone_name, mt_name)
                    if cache_key in machine_type_cache:
                        cpu_count, memory_mb = machine_type_cache[cache_key]
                    else:
                        try:
                            mt_info = mt_client.get(project=project_id, zone=zone_name, machine_type=mt_name)
                            cpu_count = mt_info.guest_cpus
                            memory_mb = mt_info.memory_mb
                            machine_type_cache[cache_key] = (cpu_count, memory_mb)
                        except Exception as mt_e:
                            logger.warning(f"Could not fetch machine type {mt_name} in {zone_name}: {mt_e}")
                    
                    instances.append(GCEInstance(
                        name=inst.name,
                        project_id=project_id,
                        zone=zone_name,
                        machine_type=mt_name,
                        status=inst.status,
                        internal_ip=internal_ip,
                        external_ip=external_ip,
                        network=network_url,
                        subnet=subnet_url,
                        tags=list(inst.tags.items) if inst.tags else [],
                        labels=dict(inst.labels) if inst.labels else {},
                        service_accounts=[sa.email for sa in inst.service_accounts] if inst.service_accounts else [],
                        creation_timestamp=datetime.fromisoformat(inst.creation_timestamp) if inst.creation_timestamp else None,
                        cpu_count=cpu_count,
                        memory_mb=memory_mb
                    ))
                    
            return instances
            
        except Exception as e:
            logger.error(f"Error scanning GCE instances in {project_id}: {e}")
            return []
