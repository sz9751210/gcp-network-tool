
from datetime import datetime, timedelta
from typing import List
from uuid import uuid4

from models import NetworkTopology, FirewallRule, PublicIP, UsedInternalIP
from pydantic import BaseModel, Field

class SecurityIssue(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    category: str  # FIREWALL, COST, SECURITY, COMPLIANCE
    title: str
    description: str
    resource_name: str
    project_id: str
    metadata: dict = Field(default_factory=dict)
    remediation: str = ""

class SecurityReport(BaseModel):
    issues: List[SecurityIssue] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    summary: dict = Field(default_factory=dict)

def analyze_security(topology: NetworkTopology) -> SecurityReport:
    """Analyze the network topology for security risks and optimizations."""
    issues = []
    
    # 1. Firewall Analysis
    issues.extend(_analyze_firewalls(topology.firewall_rules))
    
    # 2. Unused IP Analysis (Cost)
    issues.extend(_analyze_public_ips(topology.public_ips))
    
    # 3. SSL Certificate Analysis
    issues.extend(_analyze_certificates(topology.public_ips, topology.used_internal_ips))
    
    # Generate Summary
    summary = {
        "critical": len([i for i in issues if i.severity == "CRITICAL"]),
        "high": len([i for i in issues if i.severity == "HIGH"]),
        "medium": len([i for i in issues if i.severity == "MEDIUM"]),
        "low": len([i for i in issues if i.severity == "LOW"]),
        "total": len(issues),
        "by_category": {}
    }
    
    for i in issues:
        summary["by_category"][i.category] = summary["by_category"].get(i.category, 0) + 1
        
    return SecurityReport(issues=issues, summary=summary)

def _analyze_firewalls(rules: List[FirewallRule]) -> List[SecurityIssue]:
    issues = []
    
    RISKY_PORTS = {
        "22": "SSH",
        "3389": "RDP",
        "21": "FTP",
        "23": "Telnet",
        "3306": "MySQL",
        "5432": "PostgreSQL"
    }
    
    for rule in rules:
        if rule.disabled or rule.action != "ALLOW" or rule.direction != "INGRESS":
            continue
            
        # Check source ranges for 0.0.0.0/0
        is_open_to_world = "0.0.0.0/0" in rule.source_ranges
        
        if not is_open_to_world:
            continue
            
        # Check allowed ports
        for allowed in rule.allowed:
            protocol = allowed.get("IPProtocol")
            ports = allowed.get("ports", [])
            
            if protocol == "all":
                 issues.append(SecurityIssue(
                    severity="CRITICAL",
                    category="FIREWALL",
                    title=f"Firewall allows all traffic from 0.0.0.0/0",
                    description=f"Rule {rule.name} allows all protocols/ports from the internet.",
                    resource_name=rule.name,
                    project_id=rule.project_id,
                    remediation="Restrict source ranges to specific IPs or use IAP."
                ))
                 continue

            if protocol in ["tcp", "udp"]:
                for port in ports:
                    # Handle ranges? e.g. "1-65535"
                    # Simple check for now
                    if port in RISKY_PORTS:
                        service = RISKY_PORTS[port]
                        issues.append(SecurityIssue(
                            severity="HIGH" if port in ["22", "3389"] else "MEDIUM",
                            category="FIREWALL",
                            title=f"Open {service} Port ({port}) to Internet",
                            description=f"Rule {rule.name} allows {service} traffic from 0.0.0.0/0.",
                            resource_name=rule.name,
                            project_id=rule.project_id,
                            remediation="Restrict source ranges or use IAP."
                        ))
                    elif "-" in port:
                        # naive range check
                        pass 
                        
    return issues

def _analyze_public_ips(public_ips: List[PublicIP]) -> List[SecurityIssue]:
    issues = []
    
    for ip in public_ips:
        # Check for RESERVED status which implies static but potentially unused if not attached
        # GCP `RESERVED` means Static IP. 
        # API also returns `users` field which tells if it's in use.
        # My PublicIP model doesn't explicitly track `users` list, but `status` usually reflects `IN_USE` vs `RESERVED` (meaning just reserved but not used?)
        # Let's assume if status is "RESERVED" and it has no details (LB) and likely no VM attached?
        # Actually gcp_scanner maps `address.status`. 
        # If `address.status == 'RESERVED'`, it is NOT in use by a resource (otherwise it would be 'IN_USE').
        
        if ip.status == "RESERVED":
            issues.append(SecurityIssue(
                severity="LOW",
                category="COST",
                title="Unused Static IP Address",
                description=f"IP {ip.ip_address} is reserved but not in use.",
                resource_name=ip.resource_name,
                project_id=ip.project_id,
                remediation="Release the static IP if not needed to save costs."
            ))
            
    return issues

def _analyze_certificates(public_ips: List[PublicIP], internal_ips: List[UsedInternalIP]) -> List[SecurityIssue]:
    issues = []
    now = datetime.utcnow()
    
    # Gather all certs to avoid duplicates? (Certs might be reused across LBs)
    # But reporting per-LB is actionable.
    
    # Public IPs
    for ip in public_ips:
        if ip.details and ip.details.frontend:
            for cert in ip.details.frontend.certificate_details:
                _check_cert(cert, ip.resource_name, ip.project_id, issues, now)

    # Internal IPs
    for ip in internal_ips:
         if ip.details and ip.details.frontend:
            for cert in ip.details.frontend.certificate_details:
                _check_cert(cert, ip.resource_name, ip.project_id, issues, now)
                
    return issues

def _check_cert(cert, resource_name, project_id, issues, now):
    if not cert.expiry:
        return
        
    days_to_expire = (cert.expiry - now).days
    
    if days_to_expire < 0:
        issues.append(SecurityIssue(
            severity="CRITICAL",
            category="SECURITY",
            title=f"SSL Certificate Expired: {cert.name}",
            description=f"Certificate expired {abs(days_to_expire)} days ago.",
            resource_name=resource_name,
            project_id=project_id,
            remediation="Renew or replace the certificate immediately."
        ))
    elif days_to_expire < 30:
        issues.append(SecurityIssue(
            severity="HIGH",
            category="SECURITY",
            title=f"SSL Certificate Expiring Soon: {cert.name}",
            description=f"Certificate expires in {days_to_expire} days.",
            resource_name=resource_name,
            project_id=project_id,
            remediation="Plan renewal."
        ))
    elif days_to_expire < 60:
        issues.append(SecurityIssue(
            severity="MEDIUM",
            category="SECURITY",
            title=f"SSL Certificate Expiring: {cert.name}",
            description=f"Certificate expires in {days_to_expire} days.",
            resource_name=resource_name,
            project_id=project_id,
            remediation="Monitor."
        ))
