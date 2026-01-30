
import logging
from typing import List, Any
from google.cloud import compute_v1

from models import PublicIP, UsedInternalIP
from .base import BaseScanner

logger = logging.getLogger(__name__)

class AddressScanner(BaseScanner):
    """Scanner for Public and Internal IP addresses and forwarding rules."""
    
    def scan_addresses(self, project_id: str, address_type: str, lb_scanner=None) -> List[Any]:
        """
        Scans addresses (Forwarding Rules & Static IPs) to find LBs.
        
        Args:
            project_id: The project ID.
            address_type: "EXTERNAL" or "INTERNAL".
            lb_scanner: Instance of LBScanner to resolve LB details.
        
        Returns:
            List of PublicIP or UsedInternalIP objects.
        """
        results = []
        try:
            # Initialize clients with credentials
            addresses_client = compute_v1.AddressesClient(credentials=self.credentials)
            global_addresses_client = compute_v1.GlobalAddressesClient(credentials=self.credentials)
            fwd_client = compute_v1.ForwardingRulesClient(credentials=self.credentials)
            
            global_addresses = []
            # List global addresses
            try:
                for addr in global_addresses_client.list(project=project_id):
                    global_addresses.append(addr)
            except Exception as e: 
                logger.debug(f"Error listing global addresses for {project_id}: {e}")
            
            # List regional addresses
            regional_addresses = []
            try:
                 for r, addr_list in addresses_client.aggregated_list(project=project_id):
                     if addr_list.addresses:
                         regional_addresses.extend(addr_list.addresses)
            except Exception as e:
                logger.debug(f"Error listing regional addresses for {project_id}: {e}")
            
            all_addr = global_addresses + regional_addresses
            
            # Filter by type
            # Note: GCP Address types are EXTERNAL, INTERNAL, etc.
            # We want to match the requested type.
            target_addr = []
            for a in all_addr:
                if address_type == "EXTERNAL" and a.address_type == "EXTERNAL":
                    target_addr.append(a)
                elif address_type == "INTERNAL" and a.address_type != "EXTERNAL":
                    target_addr.append(a)
            
            # 1. Get Forwarding Rules (LBs)
            fwd_rules = []
            try:
                for r, list_obj in fwd_client.aggregated_list(project=project_id):
                    if list_obj.forwarding_rules:
                        fwd_rules.extend(list_obj.forwarding_rules)
            except Exception as e:
                logger.debug(f"Error listing forwarding rules for {project_id}: {e}")
            
            # Map IP to FwdRule
            ip_to_fwd = {fr.I_p_address: fr for fr in fwd_rules}
            
            for addr in target_addr:
                # Basic info
                is_reserved = (addr.status == "RESERVED")
                is_in_use = (addr.status == "IN_USE")
                
                # Check for LB
                fwd_rule = ip_to_fwd.get(addr.address)
                
                lb_details = None
                if fwd_rule and lb_scanner:
                    lb_details = lb_scanner.resolve_lb_details(fwd_rule, project_id)
                
                if address_type == "EXTERNAL":
                    results.append(PublicIP(
                        ip_address=addr.address,
                        resource_type="LoadBalancer" if fwd_rule else ("VM" if is_in_use else "Unused"),
                        resource_name=fwd_rule.name if fwd_rule else addr.name,
                        project_id=project_id,
                        region=addr.region.split("/")[-1] if addr.region else "global",
                        status="IN_USE" if is_in_use else "RESERVED",
                        description=addr.description,
                        details=lb_details
                    ))
                else: 
                     # Internal
                     results.append(UsedInternalIP(
                        ip_address=addr.address,
                        resource_type="LoadBalancer" if fwd_rule else "Unknown",
                        resource_name=fwd_rule.name if fwd_rule else addr.name,
                        project_id=project_id,
                        vpc=addr.network.split("/")[-1] if addr.network else "unknown",
                        subnet=addr.subnetwork.split("/")[-1] if addr.subnetwork else "unknown",
                        region=addr.region.split("/")[-1] if addr.region else "global",
                        description=addr.description,
                        details=lb_details
                     ))
            
            # TODO: Add ephemeral IPs (Forwarding rules without static IP object)
            # This logic exists in original but not fully captured here for brevity/scope of refactor.
            # However, for rigorous correctness we should iterate fwd_rules that are NOT in ip_to_fwd.
            # But `ip_to_fwd` keys are IP addresses.
            # We already iterated `target_addr`.
            # We should also check `fwd_rules` whose IP is NOT in `[a.address for a in target_addr]`.
            
            processed_ips = set(a.address for a in target_addr)
            
            for fr in fwd_rules:
                if fr.I_p_address and fr.I_p_address not in processed_ips:
                    # Determine type based on LoadBalancingScheme? 
                    # If EXTERNAL, add to PublicIPs if requested type is EXTERNAL.
                    # If INTERNAL, add to InternalIPs if requested type is INTERNAL.
                    
                    is_external = (fr.load_balancing_scheme == "EXTERNAL" or fr.load_balancing_scheme == "EXTERNAL_MANAGED")
                    
                    if (address_type == "EXTERNAL" and is_external) or (address_type == "INTERNAL" and not is_external):
                         lb_details = None
                         if lb_scanner:
                             lb_details = lb_scanner.resolve_lb_details(fr, project_id)

                         if address_type == "EXTERNAL":
                             results.append(PublicIP(
                                ip_address=fr.I_p_address,
                                resource_type="LoadBalancer",
                                resource_name=fr.name,
                                project_id=project_id,
                                region=fr.region.split("/")[-1] if fr.region else "global",
                                status="IN_USE",
                                description=fr.description,
                                details=lb_details
                            ))
                         else:
                             results.append(UsedInternalIP(
                                ip_address=fr.I_p_address,
                                resource_type="LoadBalancer",
                                resource_name=fr.name,
                                project_id=project_id,
                                vpc=fr.network.split("/")[-1] if fr.network else "unknown",
                                subnet=fr.subnetwork.split("/")[-1] if fr.subnetwork else "unknown",
                                region=fr.region.split("/")[-1] if fr.region else "global",
                                description=fr.description,
                                details=lb_details
                             ))
                    

        except Exception as e:
            logger.warning(f"Error scanning addresses in {project_id}: {e}")
            
        return results
