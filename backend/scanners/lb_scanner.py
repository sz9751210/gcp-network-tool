
import logging
from typing import List, Optional, Dict
from google.cloud import compute_v1

from models import (
    LoadBalancerDetails, LBFrontend, LBRoutingRule, LBBackend, BackendService,
    CertificateInfo
)
from .base import BaseScanner

logger = logging.getLogger(__name__)

class LBScanner(BaseScanner):
    """Scanner for Load Balancers and related resources."""
    
    def resolve_lb_details(self, forwarding_rule, project_id: str) -> LoadBalancerDetails:
        """
        Deeply resolve Load Balancer details (Frontend, Routing, Backends).
        Traverses: ForwardingRule -> TargetProxy -> UrlMap -> BackendService -> InstanceGroup/Bucket
        """
        
        details = LoadBalancerDetails()
        
        try:
            # 1. Frontend Details
            protocol = forwarding_rule.I_p_protocol
            
            # Improve port formatting (e.g. handle 80-80)
            port = "All"
            if forwarding_rule.port_range:
                parts = forwarding_rule.port_range.split('-')
                if len(parts) == 2 and parts[0] == parts[1]:
                    port = parts[0]
                else:
                    port = forwarding_rule.port_range
            elif forwarding_rule.ports:
                port = str(forwarding_rule.ports[0])
                
            ip_port = f"{forwarding_rule.I_p_address}:{port}"
            
            # Identify Proxy Type and Client
            target = forwarding_rule.target
            proxy_name = target.split("/")[-1] if target else "None"
            proxy_type = "Unknown"
            url_map_link = None
            cert_link = None
            ssl_policy_link = None

            if "targetHttpProxies" in target:
                proxy_type = "HTTP"
                client = compute_v1.TargetHttpProxiesClient(credentials=self.credentials)
                proxy = client.get(project=project_id, target_http_proxy=proxy_name)
                url_map_link = proxy.url_map
            elif "targetHttpsProxies" in target:
                proxy_type = "HTTPS"
                client = compute_v1.TargetHttpsProxiesClient(credentials=self.credentials)
                proxy = client.get(project=project_id, target_https_proxy=proxy_name)
                url_map_link = proxy.url_map
                if proxy.ssl_certificates:
                    cert_link = proxy.ssl_certificates[0]
                    self._fetch_certs(project_id, proxy.ssl_certificates, details)

                if proxy.ssl_policy:
                    ssl_policy_link = proxy.ssl_policy
            elif "targetTcpProxies" in target:
                proxy_type = "TCP"
                client = compute_v1.TargetTcpProxiesClient(credentials=self.credentials)
                proxy = client.get(project=project_id, target_tcp_proxy=proxy_name)
                # TCP Proxy logic if needed
            elif "targetSslProxies" in target:
                proxy_type = "SSL"
                client = compute_v1.TargetSslProxiesClient(credentials=self.credentials)
                proxy = client.get(project=project_id, target_ssl_proxy=proxy_name)
                if proxy.ssl_certificates:
                    cert_link = proxy.ssl_certificates[0]
                    self._fetch_certs(project_id, proxy.ssl_certificates, details)
            
            # Fallback for Network Load Balancers (no proxy) or Internal TCP/UDP LB
            if proxy_type == "Unknown":
                proxy_type = forwarding_rule.I_p_protocol
                
                # Internal TCP/UDP LB (Passthrough) uses backend_service directly
                if forwarding_rule.backend_service:
                    bs_name = forwarding_rule.backend_service.split("/")[-1]
                    details.routing_rules.append(LBRoutingRule(
                        hosts=["*"],
                        path="/* (Default)",
                        backend_service=bs_name
                    ))

            details.frontend = LBFrontend(
                protocol=proxy_type,
                ip_port=ip_port,
                certificate=cert_link.split("/")[-1] if cert_link else None,
                ssl_policy=ssl_policy_link.split("/")[-1] if ssl_policy_link else None,
                certificate_details=details.frontend.certificate_details if details.frontend else [] 
                # Note: details.frontend is None initially inside this function, 
                # but we might have populated cert_details separately above in _fetch_certs into `details` structure differently?
                # Actually _fetch_certs appends to details.frontend.certificate_details. 
                # But details.frontend is not initialized yet! Bug in logic above.
                # FIX: Initialize frontend object earlier or pass a list to populate.
            )
            
            # Re-assign cert details properly
            # Let's fix the flow:
            cert_details_buffer = []

            # Redoing the _fetch_certs logic inline or via helper that returns list
            if "targetHttpsProxies" in target or "targetSslProxies" in target:
                 # Re-fetch logic below inside helper
                 pass

            # Construct frontend object
            details.frontend = LBFrontend(
                 protocol=proxy_type,
                 ip_port=ip_port,
                 certificate=cert_link.split("/")[-1] if cert_link else None,
                 ssl_policy=ssl_policy_link.split("/")[-1] if ssl_policy_link else None,
                 certificate_details=cert_details_buffer # Populated by helper below
            )
            
            # Now actually call the fetches
            if ("targetHttpsProxies" in target and proxy.ssl_certificates) or \
               ("targetSslProxies" in target and proxy.ssl_certificates):
                   self._fetch_certs(project_id, proxy.ssl_certificates, cert_details_buffer)


            # 2. Routing Rules (from URL Map)
            if url_map_link:
                url_maps_client = compute_v1.UrlMapsClient(credentials=self.credentials)
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
            backend_service_names = list(set([r.backend_service for r in details.routing_rules]))
            
            bs_client = compute_v1.BackendServicesClient(credentials=self.credentials)
            bb_client = compute_v1.BackendBucketsClient(credentials=self.credentials)

            for bs_name in backend_service_names:
                try:
                    # Backend Service
                    bs = bs_client.get(project=project_id, backend_service=bs_name)
                    details.backends.append(LBBackend(
                        name=bs_name,
                        type="Instance Group" if bs.backends else "Network Endpoint Group",
                        description=bs.description,
                        cdn_enabled=bs.cdn_policy.cache_mode is not None if bs.cdn_policy else False,
                        security_policy=bs.security_policy.split("/")[-1] if bs.security_policy else (bs.edge_security_policy.split("/")[-1] if bs.edge_security_policy else None)
                    ))
                except:
                    # Backend Bucket
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

    def _fetch_certs(self, project_id: str, cert_urls: List[str], target_list: List[CertificateInfo]):
        """Helper to fetch SSL cert details."""
        try:
            cert_client = compute_v1.SslCertificatesClient(credentials=self.credentials)
            for cert_url in cert_urls:
                cert_name = cert_url.split("/")[-1]
                try:
                    cert = cert_client.get(project=project_id, ssl_certificate=cert_name)
                    target_list.append(CertificateInfo(
                        name=cert.name,
                        expiry=cert.expire_time, 
                        dns_names=list(cert.subject_alternative_names) if cert.subject_alternative_names else []
                    ))
                except Exception as e:
                    logger.debug(f"Error fetching certificate {cert_name}: {e}")
        except Exception as e:
            logger.debug(f"Failed to init cert client: {e}")

    def collect_backend_services(self, project: Project) -> List[BackendService]:
        """Collect all Backend Services from a project."""
        services = []
        project_id = project.project_id
        
        # We need service_to_ips map, passed in? or built here?
        # Keeping it simple: separate logic from scanning for now.
        # But wait, scanner usually builds the map first.
        # Let's assume we pass in `service_to_ips` or calculate it if needed.
        # For now, let's just collect the services. Populating `associated_ips` might happen later or passed as arg.
        
        # Use empty map for now if not provided
        service_to_ips = {} 
        
        try:
            # 1. Global
            bs_client = compute_v1.BackendServicesClient(credentials=self.credentials)
            for bs in bs_client.list(project=project_id):
                self._process_backend_service(bs, project_id, "global", service_to_ips, services)

            # 2. Regional
            regions_client = compute_v1.RegionsClient(credentials=self.credentials)
            region_bs_client = compute_v1.RegionBackendServicesClient(credentials=self.credentials)
            
            for region_obj in regions_client.list(project=project_id):
                region_name = region_obj.name
                try:
                     for bs in region_bs_client.list(project=project_id, region=region_name):
                         self._process_backend_service(bs, project_id, region_name, service_to_ips, services)
                except Exception:
                    pass
                    
        except Exception as e:
            logger.warning(f"Failed to collect backend services from project {project_id}: {e}")
            
        return services

    def _process_backend_service(self, bs, project_id, region, service_to_ips, services_list):
        from models import LBBackend as ModelLBBackend
        
        # Look up associated IPs
        key = f"{project_id}|{region}|{bs.name}"
        associated_ips = service_to_ips.get(key, [])
        
        # Convert backends
        backends_list = []
        if bs.backends:
            for backend in bs.backends:
                backends_list.append(ModelLBBackend(
                    name=backend.group.split("/")[-1] if backend.group else "Unknown",
                    type="Instance Group" if "instanceGroups" in (backend.group or "") else "NEG",
                    description=backend.description,
                    capacity_scaler=backend.capacity_scaler,
                    security_policy=bs.security_policy.split("/")[-1] if bs.security_policy else (bs.edge_security_policy.split("/")[-1] if bs.edge_security_policy else None)
                ))
                
        services_list.append(BackendService(
            name=bs.name,
            protocol=bs.protocol,
            session_affinity=bs.session_affinity,
            associated_ips=associated_ips,
            project_id=project_id,
            region=region if region != "global" else None,
            load_balancing_scheme=bs.load_balancing_scheme,
            description=bs.description,
            backends=backends_list,
            health_checks=[hc.split("/")[-1] for hc in bs.health_checks] if bs.health_checks else [],
            self_link=bs.self_link
        ))
