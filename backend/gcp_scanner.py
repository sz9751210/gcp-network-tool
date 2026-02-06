
import logging
import uuid
import time
from datetime import datetime
from typing import List, Dict, Any, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

from google.cloud import compute_v1

from models import (
    Project, NetworkTopology, PublicIP, UsedInternalIP, 
    FirewallRule, CloudArmorPolicy, BackendService,
    GKEPod, GKEDeployment, GKEService, GKEIngress,
    GKEConfigMap, GKESecret, GKEPVC, GKECluster
)
from scanners.base import BaseScanner
from scanners.project_scanner import ProjectScanner
from scanners.network_scanner import NetworkScanner
from scanners.lb_scanner import LBScanner
from scanners.firewall_scanner import FirewallScanner
from scanners.address_scanner import AddressScanner
from scanners.instance_scanner import GCEInstanceScanner
from scanners.gke_scanner import GKEConsistentScanner
from scanners.storage_scanner import StorageScanner

logger = logging.getLogger(__name__)

class GCPScanner:
    """
    Main entry point for GCP Network Scanning.
    Orchestrates specialized scanners to build the full topology.
    """
    
    def __init__(self, max_workers: int = 20):
        self.max_workers = max_workers
        self.project_scanner = ProjectScanner(max_workers)
        self.network_scanner = NetworkScanner(max_workers)
        self.lb_scanner = LBScanner(max_workers)
        self.firewall_scanner = FirewallScanner(max_workers)
        self.address_scanner = AddressScanner(max_workers)
        self.instance_scanner = GCEInstanceScanner(max_workers)
        self.gke_scanner = GKEConsistentScanner(max_workers)
        self.storage_scanner = StorageScanner(max_workers)
        
    def scan_network_topology(
        self,
        source_type: str,
        source_id: str,
        include_shared_vpc: bool = True,
        scan_options: Dict[str, bool] = None
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
        elif source_type == "all_accessible":
            project_ids = self.project_scanner.list_all_accessible_projects()
        elif source_type == "project":
            if "," in source_id:
                project_ids = [p.strip() for p in source_id.split(",")]
            else:
                project_ids = [source_id]
        
        # Dedupe project IDs
        project_ids = sorted(list(set(project_ids)))
        logger.info(f"Discovered {len(project_ids)} unique projects to scan.")
        
        # 2. Scanning Phase (Parallel Projects)
        scanned_projects: List[Project] = []
        all_public_ips: List[PublicIP] = []
        all_internal_ips: List[UsedInternalIP] = []
        all_firewalls: List[FirewallRule] = []
        all_policies: List[CloudArmorPolicy] = []
        all_backend_services: List[BackendService] = []
        all_instances: List[Any] = []
        all_gke_clusters: List[Any] = []
        all_storage_buckets: List[Any] = []
        all_gke_pods: List[Any] = []
        all_gke_deployments: List[Any] = []
        all_gke_services: List[Any] = []
        all_gke_ingress: List[Any] = []
        all_gke_configmaps: List[Any] = []
        all_gke_secrets: List[Any] = []
        all_gke_pvcs: List[Any] = []
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_pid = {
                executor.submit(self._scan_single_project, pid, include_shared_vpc, scan_options): pid 
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
                        all_instances.extend(result['instances'])
                        all_gke_clusters.extend(result['gke_clusters'])
                        all_storage_buckets.extend(result['storage_buckets'])
                        all_gke_pods.extend(result['gke_pods'])
                        all_gke_deployments.extend(result['gke_deployments'])
                        all_gke_services.extend(result.get('gke_services', []))
                        all_gke_ingress.extend(result.get('gke_ingress', []))
                        all_gke_configmaps.extend(result.get('gke_configmaps', []))
                        all_gke_secrets.extend(result.get('gke_secrets', []))
                        all_gke_pvcs.extend(result.get('gke_pvcs', []))
                except Exception as e:
                    logger.error(f"Project {pid} scan failed unexpectedly: {e}")
                    
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
            backend_services=all_backend_services,
            instances=all_instances,
            gke_clusters=all_gke_clusters,
            storage_buckets=all_storage_buckets,
            gke_pods=all_gke_pods,
            gke_deployments=all_gke_deployments,
            gke_services=all_gke_services,
            gke_ingress=all_gke_ingress,
            gke_configmaps=all_gke_configmaps,
            gke_secrets=all_gke_secrets,
            gke_pvcs=all_gke_pvcs
        )
        
        logger.info(f"Scan finished in {time.time() - start_time:.2f}s")
        return topology

    def _scan_single_project(self, project_id: str, include_shared_vpc: bool, scan_options: Dict[str, bool] = None) -> Dict[str, Any]:
        """
        Scans a single project for all resources using parallel sub-tasks.
        """
        logger.info(f"Scanning project {project_id}...")
        
        # Default options
        opts = scan_options or {}
        include_instances = opts.get('include_instances', True)
        include_gke = opts.get('include_gke', True)
        include_storage = opts.get('include_storage', True)
        include_firewalls = opts.get('include_firewalls', True)

        # Get basic project info
        details = self.project_scanner.get_project_details(project_id)
        if not details:
            return {
                'project': Project(
                    project_id=project_id, project_name=project_id,
                    project_number="", scan_status="error",
                    error_message="Could not access project or permission denied"
                ),
                'public_ips': [], 'internal_ips': [], 'firewalls': [], 
                'policies': [], 'backend_services': [], 'instances': [],
                'gke_clusters': [], 'storage_buckets': []
            }

        try:
            # OPTIMIZATION: Scan sub-resources in parallel within the project
            with ThreadPoolExecutor(max_workers=8) as executor:
                # 1. Start all basic network scans
                f_vpcs = executor.submit(self.network_scanner.scan_vpc_networks, project_id, include_shared_vpc)
                
                # Conditional Scans
                f_firewalls = None
                f_policies = None
                if include_firewalls:
                    f_firewalls = executor.submit(self.firewall_scanner.scan_firewalls, project_id)
                    f_policies = executor.submit(self.firewall_scanner.scan_cloud_armor, project_id)
                
                f_instances = None
                if include_instances:
                    f_instances = executor.submit(self.instance_scanner.scan_instances, project_id)
                
                f_gke = None
                if include_gke:
                    f_gke = executor.submit(self.gke_scanner.scan_all, project_id)
                
                f_storage = None
                if include_storage:
                    f_storage = executor.submit(self.storage_scanner.scan_buckets, project_id)
                
                f_lb_context = executor.submit(self.lb_scanner.prefetch_resources, project_id)

                # Wait for core network results needed for IPs
                vpcs = f_vpcs.result()
                lb_context = f_lb_context.result()

                # Build Subnet Map for IP resolution
                subnet_map = {}
                for vpc in vpcs:
                    for subnet in vpc.subnets:
                        subnet_map[subnet.self_link] = vpc.name

                # Start Address Scans (depend on lb_context and subnet_map)
                f_public_ips = executor.submit(self.address_scanner.scan_addresses, project_id, "EXTERNAL", self.lb_scanner, lb_context=lb_context)
                f_internal_ips = executor.submit(self.address_scanner.scan_addresses, project_id, "INTERNAL", self.lb_scanner, subnet_map=subnet_map, lb_context=lb_context)

                # Collect all remaining results (handle skipped scans)
                firewalls = f_firewalls.result() if f_firewalls else []
                policies = f_policies.result() if f_policies else []
                instances = f_instances.result() if f_instances else []
                gke_data = f_gke.result() if f_gke else {}
                storage_buckets = f_storage.result() if f_storage else []
                
                public_ips = f_public_ips.result()
                internal_ips = f_internal_ips.result()

            # Result aggregation logic
            project_obj = Project(
                project_id=project_id,
                project_name=details['display_name'],
                project_number=details['project_number'],
                vpc_networks=vpcs,
                instances=instances,
                gke_clusters=gke_data.get('clusters', []),
                gke_pods=gke_data.get('pods', []),
                gke_deployments=gke_data.get('deployments', []),
                gke_services=gke_data.get('services', []),
                gke_ingress=gke_data.get('ingress', []),
                gke_configmaps=gke_data.get('configmaps', []),
                gke_secrets=gke_data.get('secrets', []),
                gke_pvcs=gke_data.get('pvcs', []),
                storage_buckets=storage_buckets,
                scan_status="success"
            )

            # Backend Services resolution (remains sequential but fast)
            all_ips = public_ips + internal_ips
            service_to_ips_map = {}
            for ip in all_ips:
                if ip.details and ip.details.routing_rules:
                    for rule in ip.details.routing_rules:
                        key = f"{project_id}|{ip.region}|{rule.backend_service}"
                        if key not in service_to_ips_map: service_to_ips_map[key] = []
                        if ip.ip_address not in service_to_ips_map[key]: service_to_ips_map[key].append(ip.ip_address)
            
            backend_services = self.lb_scanner.collect_backend_services(project_obj, service_to_ips_map, lb_context)

            return {
                'project': project_obj,
                'public_ips': public_ips, 'internal_ips': internal_ips,
                'firewalls': firewalls, 'policies': policies,
                'backend_services': backend_services, 'instances': instances,
                'gke_clusters': gke_data.get('clusters', []),
                'gke_pods': gke_data.get('pods', []),
                'gke_deployments': gke_data.get('deployments', []),
                'gke_services': gke_data.get('services', []),
                'gke_ingress': gke_data.get('ingress', []),
                'gke_configmaps': gke_data.get('configmaps', []),
                'gke_secrets': gke_data.get('secrets', []),
                'gke_pvcs': gke_data.get('pvcs', []),
                'storage_buckets': storage_buckets
            }

        except Exception as e:
            logger.error(f"Error scanning project {project_id}: {e}")
            return {
                'project': Project(
                    project_id=project_id, project_name=details.get('display_name', project_id),
                    project_number=details.get('project_number', ""), scan_status="error", error_message=str(e)
                ),
                'public_ips': [], 'internal_ips': [], 'firewalls': [], 
                'policies': [], 'backend_services': [], 'instances': [],
                'gke_clusters': [], 'storage_buckets': []
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



