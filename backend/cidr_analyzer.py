"""
CIDR Analyzer for GCP Network Planner.
Provides IP range conflict detection and utilization analysis.
"""
import ipaddress
from typing import Optional
from models import CIDRConflict, Subnet, NetworkTopology


def parse_cidr(cidr: str) -> Optional[ipaddress.IPv4Network]:
    """Parse a CIDR string into an IPv4Network object."""
    try:
        return ipaddress.IPv4Network(cidr, strict=False)
    except ValueError:
        return None


def check_cidr_overlap(cidr1: str, cidr2: str) -> Optional[str]:
    """
    Check if two CIDRs overlap and return the overlap type.
    
    Returns:
        None if no overlap
        "exact" if CIDRs are identical
        "contains" if cidr1 contains cidr2
        "contained_by" if cidr1 is contained by cidr2
        "partial" if there's partial overlap
    """
    net1 = parse_cidr(cidr1)
    net2 = parse_cidr(cidr2)
    
    if net1 is None or net2 is None:
        return None
    
    # Check for exact match
    if net1 == net2:
        return "exact"
    
    # Check if one contains the other
    if net1.supernet_of(net2):
        return "contains"
    if net2.supernet_of(net1):
        return "contained_by"
    
    # Check for partial overlap
    if net1.overlaps(net2):
        return "partial"
    
    return None


def find_all_conflicts(
    input_cidr: str,
    topology: NetworkTopology,
    vpc_self_link: Optional[str] = None,
    project_id: Optional[str] = None
) -> list[CIDRConflict]:
    """
    Find all CIDR conflicts for a given input CIDR against existing subnets.
    
    Args:
        input_cidr: The CIDR to check for conflicts
        topology: The network topology to check against
        vpc_self_link: Optional specific VPC to check within
        project_id: Optional specific project to check within
        
    Returns:
        List of CIDRConflict objects describing each conflict
    """
    conflicts = []
    
    for project in topology.projects:
        # Filter by project if specified
        if project_id and project.project_id != project_id:
            continue
            
        for vpc in project.vpc_networks:
            # Filter by VPC if specified
            if vpc_self_link and vpc.self_link != vpc_self_link:
                continue
                
            for subnet in vpc.subnets:
                overlap_type = check_cidr_overlap(input_cidr, subnet.ip_cidr_range)
                
                if overlap_type:
                    conflicts.append(CIDRConflict(
                        conflicting_cidr=subnet.ip_cidr_range,
                        subnet_name=subnet.name,
                        vpc_name=vpc.name,
                        project_id=project.project_id,
                        region=subnet.region,
                        overlap_type=overlap_type
                    ))
                
                # Also check secondary IP ranges
                for secondary in subnet.secondary_ip_ranges:
                    secondary_cidr = secondary.get("ip_cidr_range", "")
                    secondary_overlap = check_cidr_overlap(input_cidr, secondary_cidr)
                    
                    if secondary_overlap:
                        conflicts.append(CIDRConflict(
                            conflicting_cidr=secondary_cidr,
                            subnet_name=f"{subnet.name}:{secondary.get('range_name', 'secondary')}",
                            vpc_name=vpc.name,
                            project_id=project.project_id,
                            region=subnet.region,
                            overlap_type=secondary_overlap
                        ))
    
    return conflicts


def find_available_cidrs(
    base_cidr: str,
    existing_cidrs: list[str],
    prefix_length: int = 24,
    count: int = 5
) -> list[str]:
    """
    Find available CIDR blocks given a list of existing CIDRs.
    """
    base_network = parse_cidr(base_cidr)
    if base_network is None:
        return []
    
    existing_networks = [parse_cidr(c) for c in existing_cidrs if parse_cidr(c)]
    
    # Generate candidate subnets
    suggestions = []
    try:
        for candidate in base_network.subnets(new_prefix=prefix_length):
            # Check if candidate conflicts with any existing
            has_conflict = False
            for existing in existing_networks:
                if candidate.overlaps(existing):
                    has_conflict = True
                    break
            
            if not has_conflict:
                suggestions.append(str(candidate))
                if len(suggestions) >= count:
                    break
    except ValueError:
        pass
    
    return suggestions


def suggest_available_cidrs(
    base_cidr: str,
    topology: NetworkTopology,
    prefix_length: int = 24,
    count: int = 5
) -> list[str]:
    """
    Suggest available CIDR blocks that don't conflict with existing subnets.
    
    Args:
        base_cidr: The base network to search within (e.g., "10.0.0.0/8")
        topology: The network topology containing existing subnets
        prefix_length: Desired prefix length for suggested CIDRs
        count: Number of suggestions to return
        
    Returns:
        List of available CIDR strings
    """
    # Collect all existing CIDRs
    existing_cidrs = []
    for project in topology.projects:
        for vpc in project.vpc_networks:
            for subnet in vpc.subnets:
                existing_cidrs.append(subnet.ip_cidr_range)
                for secondary in subnet.secondary_ip_ranges:
                    existing_cidrs.append(secondary.get("ip_cidr_range", ""))
    
    return find_available_cidrs(base_cidr, existing_cidrs, prefix_length, count)


def calculate_ip_utilization(
    vpc_cidr: str,
    subnets: list[Subnet]
) -> dict:
    """
    Calculate IP address utilization for a VPC.
    
    Args:
        vpc_cidr: The VPC's primary CIDR range
        subnets: List of subnets in the VPC
        
    Returns:
        Dict with utilization metrics
    """
    vpc_network = parse_cidr(vpc_cidr)
    if vpc_network is None:
        return {"error": "Invalid VPC CIDR"}
    
    total_ips = vpc_network.num_addresses
    used_ips = 0
    
    for subnet in subnets:
        subnet_network = parse_cidr(subnet.ip_cidr_range)
        if subnet_network:
            # GCP reserves 4 IPs per subnet (network, gateway, 2 reserved)
            used_ips += subnet_network.num_addresses
    
    available_ips = total_ips - used_ips
    utilization_percent = (used_ips / total_ips * 100) if total_ips > 0 else 0
    
    return {
        "vpc_cidr": vpc_cidr,
        "total_ips": total_ips,
        "used_ips": used_ips,
        "available_ips": available_ips,
        "utilization_percent": round(utilization_percent, 2),
        "subnet_count": len(subnets)
    }


    return {
        "cidr": cidr,
        "network_address": str(network.network_address),
        "broadcast_address": str(network.broadcast_address),
        "netmask": str(network.netmask),
        "prefix_length": network.prefixlen,
        "total_hosts": network.num_addresses,
        "usable_hosts": max(0, network.num_addresses - 4),  # GCP reserves 4
        "first_usable": str(network.network_address + 1) if network.num_addresses > 1 else None,
        "last_usable": str(network.broadcast_address - 1) if network.num_addresses > 2 else None,
        "is_private": network.is_private,
    }


def get_ip_details(ip_address: str, topology: NetworkTopology) -> dict:
    """
    Find details about an IP address within the topology.
    
    Args:
        ip_address: The IP address to check
        topology: The network topology
        
    Returns:
        Dict with status, used_by, subnet, vpc, project info
    """
    from models import UsedInternalIP, Subnet, VPCNetwork, Project
    
    ip = None
    try:
        ip = ipaddress.IPv4Address(ip_address)
    except ValueError:
        return {"error": "Invalid IP address"}
    
    result = {
        "ip_address": ip_address,
        "is_used": False,
        "used_by": None,
        "subnet": None,
        "vpc": None,
        "project": None
    }
    
    # Check if used
    for used_ip in topology.used_internal_ips:
        if used_ip.ip_address == ip_address:
            result["is_used"] = True
            result["used_by"] = used_ip
            # We can stop here for used_by, but we still want subnet info if possible
            # The used_ip object has subnet info, but we might want the full Subnet object
            break
            
    # Find subnet
    for project in topology.projects:
        for vpc in project.vpc_networks:
            for subnet in vpc.subnets:
                 try:
                    net = ipaddress.IPv4Network(subnet.ip_cidr_range)
                    if ip in net:
                        result["subnet"] = subnet
                        result["vpc"] = vpc
                        result["project"] = project
                        return result
                 except ValueError:
                    continue
                    
            # Also check secondary ranges can be done if needed, but primary is most important
    
    return result


def find_common_suffix_ips(
    suffix: int, 
    topology: NetworkTopology,
    cidr_mask: int = 24,
    project_ids: Optional[list[str]] = None,
    vpc_names: Optional[list[str]] = None
) -> list[dict]:
    """
    Find available IPs ending with a specific suffix across subnets.
    
    Args:
        suffix: The last octet (0-255)
        topology: Network topology
        cidr_mask: The mask to assume for "last octet" logic (default 24)
        project_ids: Filter by projects
        vpc_names: Filter by VPC names
        
    Returns:
        List of dicts {ip, subnet, vpc, project, region}
    """
    available_ips = []
    
    # Create set of used IPs for fast lookup
    used_ip_set = set(u.ip_address for u in topology.used_internal_ips)
    
    for project in topology.projects:
        if project_ids and project.project_id not in project_ids:
            continue
            
        for vpc in project.vpc_networks:
            if vpc_names:
                # Simple containment check or exact match
                if not any(name in vpc.name for name in vpc_names):
                    continue
            
            for subnet in vpc.subnets:
                try:
                    network = ipaddress.IPv4Network(subnet.ip_cidr_range)
                    
                    # We are looking for IPs where the LAST octet is 'suffix'
                    # For a /24, this is easy. For other masks, it's relative.
                    # But the requirement says "ending in 16" which usually implies /24 segmentation 
                    # or just the literal last octet of the IP string.
                    # Let's assume literal last octet.
                    
                    # Iterate specific IPs in this subnet that end with suffix
                    # Optimization: instead of iterating all hosts, we calculate potential matches.
                    
                    # If /24, there is only 1 candidate or 0.
                    # If /20, there are 16 candidates.
                    
                    # Let's simple iterate subnets, valid IPs.
                    # Since we want "tail number", it basically means X.X.X.suffix
                    
                    # Logic:
                    # 1. Start from network address.
                    # 2. Align to the first IP ending in suffix.
                    # 3. Step by 256.
                    
                    # Get network address integer
                    net_int = int(network.network_address)
                    
                    # Calculate first candidate
                    # We want the IP where ip_int % 256 == suffix
                    
                    # Current remainder
                    rem = net_int % 256
                    if rem <= suffix:
                        offset = suffix - rem
                    else:
                        offset = (256 - rem) + suffix
                        
                    first_candidate_int = net_int + offset
                    first_candidate = ipaddress.IPv4Address(first_candidate_int)
                    
                    if first_candidate not in network:
                        # Try next one if the first aligned one is outside (unlikely if subnet > /24)
                         pass
                    
                    # Iterate stepping by 256
                    candidate_int = first_candidate_int
                    while True:
                        candidate = ipaddress.IPv4Address(candidate_int)
                        if candidate not in network:
                            break
                            
                        # Check availability
                        # 1. Not Network or Broadcast
                        if candidate == network.network_address or candidate == network.broadcast_address:
                            pass
                        # 2. Not Gateway (usually .1) - heuristics
                        elif subnet.gateway_ip and str(candidate) == subnet.gateway_ip:
                            pass
                        # 3. Not Used
                        elif str(candidate) in used_ip_set:
                            pass
                        else:
                            available_ips.append({
                                "ip_address": str(candidate),
                                "subnet": subnet.name,
                                "vpc": vpc.name,
                                "project": project.project_id,
                                "region": subnet.region,
                                "cidr": subnet.ip_cidr_range
                            })
                            
                        candidate_int += 256
                        
                except ValueError:
                    continue
                    
    return available_ips
