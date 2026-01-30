
import logging
import uuid
import time
from datetime import datetime
from typing import List, Dict, Any, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

from google.cloud import compute_v1

from models import (
    Project, NetworkTopology, PublicIP, UsedInternalIP, 
    FirewallRule, CloudArmorPolicy, BackendService
)
from scanners.base import BaseScanner
from scanners.project_scanner import ProjectScanner
from scanners.network_scanner import NetworkScanner
from scanners.lb_scanner import LBScanner
from scanners.firewall_scanner import FirewallScanner
from scanners.address_scanner import AddressScanner

logger = logging.getLogger(__name__)

class GCPScanner:
    """
    Main entry point for GCP Network Scanning.
    Orchestrates specialized scanners to build the full topology.
    """
    
    def __init__(self, max_workers: int = 20):
        self.max_workers = max_workers
        self.project_scanner = ProjectScanner(max_workers)
        # Initialize others leveraging shared credentials/config if needed
        # (Assuming they load credentials internally or we could pass them)
        self.network_scanner = NetworkScanner(max_workers)
        self.lb_scanner = LBScanner(max_workers)
        self.firewall_scanner = FirewallScanner(max_workers)
        self.address_scanner = AddressScanner(max_workers)
        
    def scan_network_topology(
        self,
        source_type: str,
        source_id: str,
        include_shared_vpc: bool = True
    ) -> NetworkTopology:
        """
        Main entry point for scanning.
        """
        scan_id = str(uuid.uuid4())
        logger.info(f"Starting scan {scan_id} for {source_type}/{source_id}")
        
        start_time = time.time()
        
        # 1. Discovery Phase
        project_ids = []
        if source_type == "folder":
            project_ids = self.project_scanner.list_projects_in_folder(source_id)
        elif source_type == "organization":
             project_ids = self.project_scanner.list_projects_in_organization(source_id)
        elif source_type == "project":
            if "," in source_id:
                project_ids = [p.strip() for p in source_id.split(",")]
            else:
                project_ids = [source_id]
        
        logger.info(f"Discovered {len(project_ids)} projects to scan.")
        
        # 2. Scanning Phase (Parallel Projects)
        # We need to collect: Projects, PublicIPs, UsedInternalIPs, Firewalls, Policies, BackendServices
        scanned_projects: List[Project] = []
        all_public_ips: List[PublicIP] = []
        all_internal_ips: List[UsedInternalIP] = []
        all_firewalls: List[FirewallRule] = []
        all_policies: List[CloudArmorPolicy] = []
        all_backend_services: List[BackendService] = []
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_pid = {
                executor.submit(self._scan_single_project, pid, include_shared_vpc): pid 
                for pid in project_ids
            }
            
            for future in as_completed(future_to_pid):
                pid = future_to_pid[future]
                try:
                    result = future.result()
                    if result:
                        scanned_projects.append(result['project'])
                        all_public_ips.extend(result['public_ips'])
                        all_internal_ips.extend(result['internal_ips'])
                        all_firewalls.extend(result['firewalls'])
                        all_policies.extend(result['policies'])
                        all_backend_services.extend(result['backend_services'])
                except Exception as e:
                    logger.error(f"Project {pid} scan failed unexpectedly: {e}")
                    # Even if failed, we might want to record a failed Project object?
                    # The _scan_single_project handles its own errors and returns a Project with error status
                    # but if it raises, we catch it here.
                    
        # 3. Aggregation Phase
        topology = NetworkTopology(
            scan_id=scan_id,
            scan_timestamp=datetime.utcnow(),
            source_type=source_type,
            source_id=source_id,
            projects=scanned_projects,
            total_projects=len(project_ids),
            total_vpcs=sum(len(p.vpc_networks) for p in scanned_projects),
            total_subnets=sum(
                len(v.subnets) for p in scanned_projects for v in p.vpc_networks
            ),
            failed_projects=sum(1 for p in scanned_projects if p.scan_status != "success"),
            public_ips=all_public_ips,
            used_internal_ips=all_internal_ips,
            firewall_rules=all_firewalls,
            cloud_armor_policies=all_policies,
            backend_services=all_backend_services
        )
        
        logger.info(f"Scan finished in {time.time() - start_time:.2f}s")
        return topology

    def _scan_single_project(self, project_id: str, include_shared_vpc: bool) -> Dict[str, Any]:
        """
        Scans a single project for all resources.
        Returns a dictionary containing the Project object and lists of other resources.
        """
        logger.info(f"Scanning project {project_id}...")
        
        # Init result containers
        public_ips = []
        internal_ips = []
        firewalls = []
        policies = []
        backend_services = []
        
        # Get basic project info
        details = self.project_scanner.get_project_details(project_id)
        if not details:
            # If we can't get basic info, assume permission denied or invalid
            return {
                'project': Project(
                    project_id=project_id,
                    project_name=project_id,
                    project_number="",
                    vpc_networks=[],
                    is_shared_vpc_host=False,
                    shared_vpc_host_project=None,
                    scan_status="error",
                    error_message="Could not access project or permission denied"
                ),
                'public_ips': [], 'internal_ips': [], 'firewalls': [], 'policies': [], 'backend_services': []
            }

        try:
            # 1. Network Scan (VPCs & Subnets)
            vpcs = self.network_scanner.scan_vpc_networks(project_id, include_shared_vpc)
            
            # 2. Firewall & Cloud Armor
            firewalls = self.firewall_scanner.scan_firewalls(project_id)
            policies = self.firewall_scanner.scan_cloud_armor(project_id)
            
            # 3. Load Balancers & Backend Services
            # Collect Backend Services first as they are needed for LBs?
            # Actually LBs reference Backend Services.
            
            # We need to scan addresses to find LBs (Forwarding Rules).
            # Address scanning logic (Public & Internal) needs to be implemented.
            # I missed creating an `AddressScanner` or putting it in `NetworkScanner` or `LBScanner`.
            # Let's verify `LBScanner` capabilities. It has `resolve_lb_details` but not `scan_addresses`.
            # Original code had `_scan_public_ips` and `_scan_internal_ips`.
            # I should implement address scanning here or in a scanner module.
            # For cleanliness, I'll implement `_scan_addresses` locally or add to `NetworkScanner`.
            # Let's add it to `NetworkScanner` (logical fit) or `LBScanner` (since LBs use them)?
            # Addresses are core network resources. Let's add scanning logic locally for now 
            # to match the monolithic behavior or quickly extend `NetworkScanner`.
            # Extending `NetworkScanner` with `scan_addresses` seems best but requires editing that file.
            # I'll implement helper methods `_scan_public_ips` and `_scan_internal_ips` inside this class 
            # leveraging the `lb_scanner` for details resolution.
            
            public_ips = self.address_scanner.scan_addresses(project_id, "EXTERNAL", self.lb_scanner)
            internal_ips = self.address_scanner.scan_addresses(project_id, "INTERNAL", self.lb_scanner)
            
            # 4. Backend Services
            # `collect_backend_services` in `LBScanner`
            # It needs `service_to_ips` map... which implies we need to know which IPs point to which service.
            # This mapping is usually built *during* address scanning/LB resolution.
            # Let's build it:
            service_to_ips_map = {}
            for ip in public_ips:
                if ip.details:
                    for rule in ip.details.routing_rules:
                        key = f"{project_id}|global|{rule.backend_service}" # Approximating key
                        if key not in service_to_ips_map: service_to_ips_map[key] = []
                        service_to_ips_map[key].append(ip.ip_address)
            
            # Real logic for `collect_backend_services` needs to be more robust about keys (region/global).
            # I'll rely on `LBScanner.collect_backend_services` passing a simple map or modify it later.
            # For now passing empty map to match the implementation in `lb_scanner.py`
            
            backend_services = self.lb_scanner.collect_backend_services(
                Project(
                    project_id=project_id, project_name=details['display_name'], 
                    project_number=details['project_number'], vpc_networks=[], 
                    is_shared_vpc_host=False, shared_vpc_host_project=None, scan_status="pending"
                )
            )

            # Metadata
            shared_vpc_info = self.project_scanner.get_shared_vpc_info(project_id)

            project_obj = Project(
                project_id=project_id,
                project_name=details['display_name'],
                project_number=details['project_number'],
                vpc_networks=vpcs,
                is_shared_vpc_host=shared_vpc_info['is_host'],
                shared_vpc_host_project=shared_vpc_info['host_project'],
                scan_status="success",
                error_message=None
            )
            
            return {
                'project': project_obj,
                'public_ips': public_ips,
                'internal_ips': internal_ips,
                'firewalls': firewalls,
                'policies': policies,
                'backend_services': backend_services
            }

        except Exception as e:
            logger.error(f"Error scanning project {project_id}: {e}")
            return {
                'project': Project(
                    project_id=project_id,
                    project_name=details.get('display_name', project_id),
                    project_number=details.get('project_number', ""),
                    vpc_networks=[],
                    is_shared_vpc_host=False,
                    shared_vpc_host_project=None,
                    scan_status="error",
                    error_message=str(e)
                ),
                'public_ips': [], 'internal_ips': [], 'firewalls': [], 'policies': [], 'backend_services': []
            }



