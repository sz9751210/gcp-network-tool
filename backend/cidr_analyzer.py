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
    base_network = parse_cidr(base_cidr)
    if base_network is None:
        return []
    
    # Collect all existing CIDRs
    existing_cidrs = []
    for project in topology.projects:
        for vpc in project.vpc_networks:
            for subnet in vpc.subnets:
                existing_cidrs.append(subnet.ip_cidr_range)
                for secondary in subnet.secondary_ip_ranges:
                    existing_cidrs.append(secondary.get("ip_cidr_range", ""))
    
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
        # prefix_length is invalid for this network
        pass
    
    return suggestions


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


def get_cidr_info(cidr: str) -> dict:
    """Get detailed information about a CIDR block."""
    network = parse_cidr(cidr)
    if network is None:
        return {"error": "Invalid CIDR"}
    
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
