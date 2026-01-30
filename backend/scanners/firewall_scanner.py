
import logging
from typing import List, Optional
from google.cloud import compute_v1
from google.api_core import exceptions as gcp_exceptions

from models import FirewallRule, CloudArmorPolicy, CloudArmorRule
from .base import BaseScanner

logger = logging.getLogger(__name__)

class FirewallScanner(BaseScanner):
    """Scanner for Firewall Rules and Cloud Armor Policies."""
    
    def scan_firewalls(self, project_id: str) -> List[FirewallRule]:
        """List all firewall rules in a project."""
        rules = []
        firewalls_client = compute_v1.FirewallsClient(credentials=self.credentials)
        
        try:
            request = compute_v1.ListFirewallsRequest(project=project_id)
            
            for fw in firewalls_client.list(request=request):
                rule = FirewallRule(
                    name=fw.name,
                    direction=fw.direction,
                    action="ALLOW" if fw.allowed else "DENY",
                    priority=fw.priority,
                    source_ranges=list(fw.source_ranges),
                    destination_ranges=list(fw.destination_ranges),
                    source_tags=list(fw.source_tags),
                    target_tags=list(fw.target_tags),
                    allowed=[
                        {
                            "IPProtocol": allowed.I_p_protocol,
                            "ports": list(allowed.ports)
                        }
                        for allowed in fw.allowed
                    ],
                    denied=[
                        {
                            "IPProtocol": denied.I_p_protocol,
                            "ports": list(denied.ports)
                        }
                        for denied in fw.denied
                    ],
                    vpc_network=fw.network.split("/")[-1],
                    project_id=project_id,
                    disabled=fw.disabled,
                    description=fw.description
                )
                rules.append(rule)
                
        except gcp_exceptions.PermissionDenied:
            logger.warning(f"Permission denied listing firewalls in {project_id}")
        except Exception as e:
            logger.error(f"Error listing firewalls in {project_id}: {e}")
        
        return rules
    
    def scan_cloud_armor(self, project_id: str) -> List[CloudArmorPolicy]:
        """List all Cloud Armor security policies in a project."""
        policies = []
        security_policies_client = compute_v1.SecurityPoliciesClient(credentials=self.credentials)
        
        try:
            request = compute_v1.ListSecurityPoliciesRequest(project=project_id)
            
            for policy in security_policies_client.list(request=request):
                # Only scan CLOUD_ARMOR type policies (ignore EDGE or internal if needed, 
                # but generally we want them all if they are security policies)
                
                rules = []
                if policy.rules:
                    for r in policy.rules:
                        rules.append(CloudArmorRule(
                            priority=r.priority,
                            action=r.action,
                            description=r.description,
                            match_expression=r.match.expr.expression if r.match and r.match.expr else None,
                            preview=r.preview
                        ))
                
                policies.append(CloudArmorPolicy(
                    name=policy.name,
                    description=policy.description,
                    rules=rules,
                    adaptive_protection_enabled=False if not policy.adaptive_protection_config else policy.adaptive_protection_config.layer7_ddos_defense_config.enable,
                    project_id=project_id,
                    self_link=policy.self_link
                ))
                
        except gcp_exceptions.PermissionDenied:
            # Often Cloud Armor requires specific API enablement
            pass
        except Exception as e:
            logger.debug(f"Error listing Cloud Armor policies in {project_id}: {e}")
            
        return policies
