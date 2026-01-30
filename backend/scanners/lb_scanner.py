
import logging
from typing import List, Optional, Dict
from google.cloud import compute_v1

from models import (
    LoadBalancerDetails, LBFrontend, LBRoutingRule, LBBackend, BackendService,
    CertificateInfo, Project
)
from .base import BaseScanner

logger = logging.getLogger(__name__)

class LBScanner(BaseScanner):
    """Scanner for Load Balancers and related resources."""
    
    class ProjectLBContext:
        """Holds prefetched resources to avoid N+1 API calls."""
        def __init__(self):
            self.target_http_proxies = {}
            self.target_https_proxies = {}
            self.target_tcp_proxies = {}
            self.target_ssl_proxies = {}
            self.url_maps = {}
            self.backend_services = {} # Name -> Object
            self.ssl_certificates = {}

    def prefetch_resources(self, project_id: str) -> 'ProjectLBContext':
        """Fetch all relevant global resources once."""
        context = self.ProjectLBContext()
        try:
            # 1. Proxies
            try:
                client = compute_v1.TargetHttpProxiesClient(credentials=self.credentials)
                for r in client.list(project=project_id):
                    context.target_http_proxies[r.name] = r
            except Exception: pass
            
            try:
                client = compute_v1.TargetHttpsProxiesClient(credentials=self.credentials)
                for r in client.list(project=project_id):
                    context.target_https_proxies[r.name] = r
            except Exception: pass

            try:
                client = compute_v1.TargetTcpProxiesClient(credentials=self.credentials)
                for r in client.list(project=project_id):
                    context.target_tcp_proxies[r.name] = r
            except Exception: pass

            try:
                client = compute_v1.TargetSslProxiesClient(credentials=self.credentials)
                for r in client.list(project=project_id):
                    context.target_ssl_proxies[r.name] = r
            except Exception: pass

            # 2. URL Maps
            try:
                client = compute_v1.UrlMapsClient(credentials=self.credentials)
                for r in client.list(project=project_id):
                    context.url_maps[r.name] = r
            except Exception: pass

            # 3. Certificates
            try:
                client = compute_v1.SslCertificatesClient(credentials=self.credentials)
                for r in client.list(project=project_id):
                    context.ssl_certificates[r.name] = r
            except Exception: pass

            # 4. Backend Services (Aggregated)
            try:
                client = compute_v1.BackendServicesClient(credentials=self.credentials)
                for r, list_obj in client.aggregated_list(project=project_id):
                    if list_obj.backend_services:
                         for bs in list_obj.backend_services:
                             context.backend_services[bs.name] = bs
            except Exception: pass
            
        except Exception as e:
            logger.warning(f"Error prefetching resources for {project_id}: {e}")
        
        return context

    def resolve_lb_details(self, forwarding_rule, project_id: str, context: Optional['ProjectLBContext'] = None) -> LoadBalancerDetails:
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
            
            proxy = None

            if "targetHttpProxies" in target:
                proxy_type = "HTTP"
                if context and proxy_name in context.target_http_proxies:
                    proxy = context.target_http_proxies[proxy_name]
                else:
                    client = compute_v1.TargetHttpProxiesClient(credentials=self.credentials)
                    proxy = client.get(project=project_id, target_http_proxy=proxy_name)
                
                if proxy: url_map_link = proxy.url_map

            elif "targetHttpsProxies" in target:
                proxy_type = "HTTPS"
                if context and proxy_name in context.target_https_proxies:
                    proxy = context.target_https_proxies[proxy_name]
                else:
                    client = compute_v1.TargetHttpsProxiesClient(credentials=self.credentials)
                    proxy = client.get(project=project_id, target_https_proxy=proxy_name)
                
                if proxy:
                    url_map_link = proxy.url_map
                    if proxy.ssl_certificates:
                        cert_link = proxy.ssl_certificates[0]
                    if proxy.ssl_policy:
                        ssl_policy_link = proxy.ssl_policy

            elif "targetTcpProxies" in target:
                proxy_type = "TCP"
                if context and proxy_name in context.target_tcp_proxies:
                    proxy = context.target_tcp_proxies[proxy_name]
                else:
                    client = compute_v1.TargetTcpProxiesClient(credentials=self.credentials)
                    proxy = client.get(project=project_id, target_tcp_proxy=proxy_name)

            elif "targetSslProxies" in target:
                proxy_type = "SSL"
                if context and proxy_name in context.target_ssl_proxies:
                    proxy = context.target_ssl_proxies[proxy_name]
                else:
                    client = compute_v1.TargetSslProxiesClient(credentials=self.credentials)
                    proxy = client.get(project=project_id, target_ssl_proxy=proxy_name)
                
                if proxy and proxy.ssl_certificates:
                     cert_link = proxy.ssl_certificates[0]
            
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

            # Helper for constructing Cert details
            cert_details = []
            if proxy and (hasattr(proxy, 'ssl_certificates') and proxy.ssl_certificates):
                 self._resolve_certs(project_id, proxy.ssl_certificates, cert_details, context)

            details.frontend = LBFrontend(
                protocol=proxy_type,
                ip_port=ip_port,
                certificate=cert_link.split("/")[-1] if cert_link else None,
                ssl_policy=ssl_policy_link.split("/")[-1] if ssl_policy_link else None,
                certificate_details=cert_details
            )

            # 2. Routing Rules (from URL Map)
            if url_map_link:
                url_map_name = url_map_link.split("/")[-1]
                details.url_map = url_map_name
                
                url_map = None
                if context and url_map_name in context.url_maps:
                    url_map = context.url_maps[url_map_name]
                else:
                    url_maps_client = compute_v1.UrlMapsClient(credentials=self.credentials)
                    url_map = url_maps_client.get(project=project_id, url_map=url_map_name)

                if url_map:
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
                # Try context first
                bs = None
                if context and bs_name in context.backend_services:
                    bs = context.backend_services[bs_name]
                
                if bs:
                     self._append_backend_details(details, bs)
                else:
                    try:
                        # Backend Service (fetch)
                        bs = bs_client.get(project=project_id, backend_service=bs_name)
                        self._append_backend_details(details, bs)
                    except:
                        # Backend Bucket (Context doesn't cover buckets yet, optimizing services mostly)
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

    def _append_backend_details(self, details, bs):
        """Helper to append backend service details."""
        details.backends.append(LBBackend(
            name=bs.name,
            type="Instance Group" if bs.backends else "Network Endpoint Group",
            description=bs.description,
            cdn_enabled=bs.cdn_policy.cache_mode is not None if bs.cdn_policy else False,
            security_policy=bs.security_policy.split("/")[-1] if bs.security_policy else (bs.edge_security_policy.split("/")[-1] if bs.edge_security_policy else None)
        ))

    def _resolve_certs(self, project_id: str, cert_urls: List[str], target_list: List[CertificateInfo], context: Optional['ProjectLBContext']):
        """Helper to resolve SSL cert details using context or fetch."""
        
        cert_client = None
        
        for cert_url in cert_urls:
            cert_name = cert_url.split("/")[-1]
            cert = None
            
            if context and cert_name in context.ssl_certificates:
                cert = context.ssl_certificates[cert_name]
            else:
                 if not cert_client:
                      try: 
                          cert_client = compute_v1.SslCertificatesClient(credentials=self.credentials)
                      except: pass
                 
                 if cert_client:
                     try:
                        cert = cert_client.get(project=project_id, ssl_certificate=cert_name)
                     except: pass
            
            if cert:
                target_list.append(CertificateInfo(
                    name=cert.name,
                    expiry=cert.expire_time, 
                    dns_names=list(cert.subject_alternative_names) if cert.subject_alternative_names else []
                ))

    def collect_backend_services(self, project: Project, service_to_ips: Dict[str, List[str]] = None) -> List[BackendService]:
        """Collect all Backend Services from a project."""
        services = []
        project_id = project.project_id
        
        # Use empty map for now if not provided
        service_to_ips = service_to_ips or {} 
        
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
