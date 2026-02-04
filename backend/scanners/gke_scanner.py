import logging
import base64
import tempfile
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from google.cloud import container_v1
try:
    from kubernetes import client as k8s_client
    from kubernetes.client.configuration import Configuration
    K8S_AVAILABLE = True
except ImportError:
    k8s_client = None
    Configuration = None
    K8S_AVAILABLE = False

from scanners.base import BaseScanner
from models import (
    GKECluster, GKEPod, GKEDeployment, GKEService, 
    GKEIngress, GKEConfigMap, GKESecret, GKEPVC, GKEContainer, GKEHPA
)

logger = logging.getLogger(__name__)

class GKEConsistentScanner(BaseScanner):
    """Scanner for GKE Clusters and Workloads."""

    def scan_all(self, project_id: str) -> Dict[str, Any]:
        """Scans for clusters and all their workloads."""
        logger.info(f"Scanning all GKE resources in project {project_id}")
        
        raw_clusters = self._list_raw_clusters(project_id)
        clusters = []
        all_pods = []
        all_deployments = []
        all_services = []
        all_ingress = []
        all_configmaps = []
        all_secrets = []
        all_pvcs = []

        for c in raw_clusters:
            cluster_model = self._to_cluster_model(project_id, c)
            clusters.append(cluster_model)

        if not K8S_AVAILABLE:
            logger.warning("Kubernetes library not available, skipping workload scan")
            return {
                'clusters': clusters, 'pods': [], 'deployments': [], 
                'services': [], 'ingress': [], 'configmaps': [], 
                'secrets': [], 'pvcs': []
            }

        # Scan workloads in parallel across clusters
        with ThreadPoolExecutor(max_workers=min(len(raw_clusters) or 1, 10)) as executor:
            future_to_cluster = {
                executor.submit(self._scan_cluster_resources, project_id, c): c
                for c in raw_clusters
            }

            for future in as_completed(future_to_cluster):
                c_name = future_to_cluster[future].name
                try:
                    res = future.result()
                    all_pods.extend(res['pods'])
                    all_deployments.extend(res['deployments'])
                    all_services.extend(res['services'])
                    all_ingress.extend(res['ingress'])
                    all_configmaps.extend(res['configmaps'])
                    all_secrets.extend(res['secrets'])
                    all_pvcs.extend(res['pvcs'])
                except Exception as e:
                    logger.error(f"Error scanning workloads for cluster {c_name}: {e}")

        return {
            'clusters': clusters,
            'pods': all_pods,
            'deployments': all_deployments,
            'services': all_services,
            'ingress': all_ingress,
            'configmaps': all_configmaps,
            'secrets': all_secrets,
            'pvcs': all_pvcs
        }

    def _list_raw_clusters(self, project_id: str):
        try:
            client = container_v1.ClusterManagerClient(credentials=self.credentials)
            parent = f"projects/{project_id}/locations/-"
            request = container_v1.ListClustersRequest(parent=parent)
            response = client.list_clusters(request=request)
            return response.clusters
        except Exception as e:
            logger.error(f"Error listing clusters in {project_id}: {e}")
            return []

    def _to_cluster_model(self, project_id: str, cluster) -> GKECluster:
        return GKECluster(
            name=cluster.name,
            project_id=project_id,
            location=cluster.location,
            network=cluster.network,
            subnet=cluster.subnetwork,
            endpoint=cluster.endpoint,
            version=cluster.current_master_version,
            status=cluster.status.name,
            services_ipv4_cidr=cluster.ip_allocation_policy.services_ipv4_cidr_block,
            pods_ipv4_cidr=cluster.ip_allocation_policy.cluster_ipv4_cidr_block,
            node_count=cluster.current_node_count,
            labels=dict(cluster.resource_labels)
        )

    def _get_k8s_client(self, cluster) -> Optional[Any]:
        if not K8S_AVAILABLE:
            logger.warning(f"Skipping K8s client for {cluster.name}: Kubernetes library not available")
            return None
            
        if not cluster.master_auth or not cluster.master_auth.cluster_ca_certificate:
            logger.warning(f"Skipping K8s client for {cluster.name}: Missing master_auth or ca_certificate")
            return None
            
        try:
            # Lazy load credentials if missing
            if not self.credentials:
                import google.auth
                self.credentials, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
            
            # Refresh GCP credentials
            from google.auth.transport.requests import Request
            self.credentials.refresh(Request())
            
            configuration = Configuration()
            configuration.host = f"https://{cluster.endpoint}"
            configuration.api_key = {"authorization": "Bearer " + self.credentials.token}
            
            # CA certificate
            ca_cert_data = base64.b64decode(cluster.master_auth.cluster_ca_certificate)
            with tempfile.NamedTemporaryFile(delete=False) as f:
                f.write(ca_cert_data)
                configuration.ssl_ca_cert = f.name
            
            logger.info(f"Successfully created K8s client for cluster {cluster.name} at {cluster.endpoint}")
            return k8s_client.ApiClient(configuration)
        except Exception as e:
            logger.error(f"Error creating K8s client for {cluster.name}: {e}")
            return None

    def _scan_cluster_resources(self, project_id: str, cluster) -> Dict[str, List]:
        api_client = self._get_k8s_client(cluster)
        if not api_client:
            return {k: [] for k in ['pods', 'deployments', 'services', 'ingress', 'configmaps', 'secrets', 'pvcs']}

        res = {k: [] for k in ['pods', 'deployments', 'services', 'ingress', 'configmaps', 'secrets', 'pvcs', 'hpas']}
        cluster_name = cluster.name

        try:
            v1 = k8s_client.CoreV1Api(api_client)
            apps_v1 = k8s_client.AppsV1Api(api_client)
            networking_v1 = k8s_client.NetworkingV1Api(api_client)

            # Pods
            pods = v1.list_pod_for_all_namespaces(timeout_seconds=10)
            for p in pods.items:
                containers = []
                # Map container statuses
                ready_map = {}
                restart_count = 0
                if p.status.container_statuses:
                    for cs in p.status.container_statuses:
                        ready_map[cs.name] = cs.ready
                        restart_count += cs.restart_count
                
                for c in p.spec.containers:
                    containers.append(GKEContainer(
                        name=c.name,
                        image=c.image,
                        ready=ready_map.get(c.name, False)
                    ))

                res['pods'].append(GKEPod(
                    name=p.metadata.name,
                    namespace=p.metadata.namespace,
                    cluster_name=cluster_name,
                    project_id=project_id,
                    status=p.status.phase,
                    pod_ip=p.status.pod_ip,
                    host_ip=p.status.host_ip,
                    node_name=p.spec.node_name,
                    restart_count=restart_count,
                    qos_class=p.status.qos_class,
                    labels=p.metadata.labels or {},
                    containers=containers,
                    creation_timestamp=p.metadata.creation_timestamp
                ))

            # Deployments
            try:
                deps = apps_v1.list_deployment_for_all_namespaces(timeout_seconds=10)
                for d in deps.items:
                    conditions = []
                    if d.status.conditions:
                        for cond in d.status.conditions:
                            conditions.append({"type": cond.type, "status": cond.status, "reason": cond.reason})

                    max_surge = None
                    max_unavailable = None
                    if d.spec.strategy and d.spec.strategy.type == "RollingUpdate" and d.spec.strategy.rolling_update:
                        max_surge = str(d.spec.strategy.rolling_update.max_surge)
                        max_unavailable = str(d.spec.strategy.rolling_update.max_unavailable)

                    res['deployments'].append(GKEDeployment(
                        name=d.metadata.name,
                        namespace=d.metadata.namespace,
                        cluster_name=cluster_name,
                        project_id=project_id,
                        replicas=d.spec.replicas or 0,
                        available_replicas=d.status.available_replicas or 0,
                        updated_replicas=d.status.updated_replicas or 0,
                        strategy=d.spec.strategy.type if d.spec.strategy else None,
                        max_surge=max_surge,
                        max_unavailable=max_unavailable,
                        min_ready_seconds=d.spec.min_ready_seconds or 0,
                        revision_history_limit=d.spec.revision_history_limit,
                        conditions=conditions,
                        labels=d.metadata.labels or {},
                        selector=d.spec.selector.match_labels or {},
                        creation_timestamp=d.metadata.creation_timestamp
                    ))
            except Exception as e:
                logger.warning(f"Failed to list deployments for {cluster_name}: {e}")

            # HPA
            try:
                autoscaling_v1 = k8s_client.AutoscalingV1Api(api_client)
                hpas = autoscaling_v1.list_horizontal_pod_autoscaler_for_all_namespaces(timeout_seconds=10)
                for hpa in hpas.items:
                    res['hpas'].append(GKEHPA(
                        name=hpa.metadata.name,
                        namespace=hpa.metadata.namespace,
                        cluster_name=cluster_name,
                        project_id=project_id,
                        min_replicas=hpa.spec.min_replicas,
                        max_replicas=hpa.spec.max_replicas,
                        current_replicas=hpa.status.current_replicas or 0,
                        desired_replicas=hpa.status.desired_replicas or 0,
                        target_cpu_utilization_percentage=hpa.spec.target_cpu_utilization_percentage,
                        creation_timestamp=hpa.metadata.creation_timestamp
                    ))
            except Exception as e:
                logger.warning(f"Failed to list HPAs for {cluster_name}: {e}")

            # Services
            svcs = v1.list_service_for_all_namespaces(timeout_seconds=10)
            for s in svcs.items:
                ext_ip = None
                if s.status.load_balancer and s.status.load_balancer.ingress:
                    ext_ip = s.status.load_balancer.ingress[0].ip or s.status.load_balancer.ingress[0].hostname
                
                res['services'].append(GKEService(
                    name=s.metadata.name,
                    namespace=s.metadata.namespace,
                    cluster_name=cluster_name,
                    project_id=project_id,
                    type=s.spec.type,
                    cluster_ip=s.spec.cluster_ip,
                    external_ip=ext_ip,
                    ports=[{'port': p.port, 'targetPort': str(p.target_port), 'protocol': p.protocol} for p in s.spec.ports or []],
                    selector=s.spec.selector or {},
                    creation_timestamp=s.metadata.creation_timestamp
                ))

            # Ingress
            try:
                ingresses = networking_v1.list_ingress_for_all_namespaces(timeout_seconds=10)
                for i in ingresses.items:
                    addr = None
                    if i.status.load_balancer and i.status.load_balancer.ingress:
                        addr = i.status.load_balancer.ingress[0].ip or i.status.load_balancer.ingress[0].hostname
                    
                    res['ingress'].append(GKEIngress(
                        name=i.metadata.name,
                        namespace=i.metadata.namespace,
                        cluster_name=cluster_name,
                        project_id=project_id,
                        hosts=[rule.host for rule in i.spec.rules or [] if rule.host],
                        address=addr,
                        rules=[], # Simplified for now
                        creation_timestamp=i.metadata.creation_timestamp
                    ))
            except Exception:
                logger.warning(f"Ingress API not reachable or permitted in cluster {cluster_name}")

            # ConfigMaps
            cms = v1.list_config_map_for_all_namespaces(timeout_seconds=10)
            for cm in cms.items:
                res['configmaps'].append(GKEConfigMap(
                    name=cm.metadata.name,
                    namespace=cm.metadata.namespace,
                    cluster_name=cluster_name,
                    project_id=project_id,
                    data_keys=list((cm.data or {}).keys()),
                    creation_timestamp=cm.metadata.creation_timestamp
                ))

            # Secrets
            secs = v1.list_secret_for_all_namespaces(timeout_seconds=10)
            for sec in secs.items:
                res['secrets'].append(GKESecret(
                    name=sec.metadata.name,
                    namespace=sec.metadata.namespace,
                    cluster_name=cluster_name,
                    project_id=project_id,
                    type=sec.type,
                    data_keys=list((sec.data or {}).keys()),
                    creation_timestamp=sec.metadata.creation_timestamp
                ))

            # PVCs
            pvcs = v1.list_persistent_volume_claim_for_all_namespaces(timeout_seconds=10)
            for pvc in pvcs.items:
                res['pvcs'].append(GKEPVC(
                    name=pvc.metadata.name,
                    namespace=pvc.metadata.namespace,
                    cluster_name=cluster_name,
                    project_id=project_id,
                    status=pvc.status.phase,
                    volume_name=pvc.spec.volume_name,
                    capacity=pvc.status.capacity.get('storage') if pvc.status.capacity else None,
                    access_modes=pvc.spec.access_modes or [],
                    storage_class=pvc.spec.storage_class_name,
                    creation_timestamp=pvc.metadata.creation_timestamp
                ))

        except Exception as e:
            logger.error(f"Error calling Kubernetes API for {cluster_name}: {e}")
        finally:
            # Cleanup CA cert file
            if api_client.configuration.ssl_ca_cert and os.path.exists(api_client.configuration.ssl_ca_cert):
                try:
                    os.remove(api_client.configuration.ssl_ca_cert)
                except Exception:
                    pass

        return res
