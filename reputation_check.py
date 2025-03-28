import asyncio
import socket
import dns.asyncresolver
import logging
from error_handling import DmarcError, DomainError, DnsLookupError

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# List of common DNS blacklists (IP-based)
DNSBL_SERVICES = [
    "zen.spamhaus.org",
    "bl.spamcop.net",
    "dnsbl.sorbs.net",
    "black.uribl.com",
    "dnsbl.abuse.ch"
]

# Domain-based blacklists
DOMAIN_BL_SERVICES = [
    "uribl.spameatingmonkey.net",
    "multi.surbl.org",
    "dbl.spamhaus.org"
]

async def check_domain_reputation(domain):
    """
    Check the reputation of a domain by checking various blacklists.
    
    Args:
        domain (str): The domain name to check
        
    Returns:
        dict: Reputation check results
    """
    if not domain:
        raise DomainError(
            "Domain parameter is required", 
            "MISSING_DOMAIN",
            ["Please provide a domain name to check."]
        )
    
    logging.debug(f"Starting reputation check for domain: {domain}")
    
    # Initialize results dictionary
    results = {
        "blacklisted": False,
        "blacklist_count": 0,
        "total_services": len(DNSBL_SERVICES) + len(DOMAIN_BL_SERVICES),
        "blacklist_details": [],
        "domain_services": {service: "clean" for service in DOMAIN_BL_SERVICES},
        "ip_services": {}
    }
    
    try:
        # Check domain-based blacklists
        domain_results = await check_domain_blacklists(domain)
        results.update(domain_results)
        
        # Get IPs associated with the domain
        ips = await resolve_domain_to_ips(domain)
        
        # Check IP-based blacklists for each IP
        ip_results = await check_ip_blacklists(ips)
        results.update(ip_results)
        
        # Determine overall blacklist status and count
        blacklisted_services = []
        for service, status in results["domain_services"].items():
            if status != "clean":
                blacklisted_services.append(service)
        
        for ip, services in results["ip_services"].items():
            for service, status in services.items():
                if status != "clean":
                    blacklisted_services.append(f"{service} ({ip})")
        
        results["blacklist_count"] = len(blacklisted_services)
        results["blacklist_details"] = blacklisted_services
        results["blacklisted"] = results["blacklist_count"] > 0
        
        # Calculate reputation score
        results["reputation_score"] = calculate_reputation_score(results)
        
        # Generate recommendations based on results
        results["recommendations"] = generate_recommendations(results)
        
        return results
    
    except Exception as e:
        logging.error(f"Error checking domain reputation: {e}")
        return {
            "error": f"Error checking domain reputation: {str(e)}",
            "error_code": "REPUTATION_CHECK_ERROR"
        }

async def resolve_domain_to_ips(domain):
    """
    Resolve a domain name to its IP addresses.
    
    Args:
        domain (str): The domain name to resolve
        
    Returns:
        list: List of IP addresses
    """
    try:
        resolver = dns.asyncresolver.Resolver()
        ips = []
        
        # Get IPv4 addresses
        try:
            answers = await resolver.resolve(domain, 'A')
            for rdata in answers:
                ips.append(rdata.to_text())
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            logging.debug(f"No A records found for {domain}")
        
        # Get IPv6 addresses
        try:
            answers = await resolver.resolve(domain, 'AAAA')
            for rdata in answers:
                ips.append(rdata.to_text())
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            logging.debug(f"No AAAA records found for {domain}")
        
        if not ips:
            logging.warning(f"No IP addresses found for domain: {domain}")
        
        return ips
    
    except Exception as e:
        logging.error(f"Error resolving domain to IPs: {e}")
        return []

async def check_domain_blacklists(domain):
    """
    Check if a domain is on any domain-based blacklists.
    
    Args:
        domain (str): The domain name to check
        
    Returns:
        dict: Results of domain blacklist checks
    """
    results = {
        "domain_services": {}
    }
    
    for service in DOMAIN_BL_SERVICES:
        try:
            logging.debug(f"Checking domain {domain} against {service}")
            
            # Construct the lookup hostname (domain.blacklist.service)
            lookup = f"{domain}.{service}"
            
            try:
                resolver = dns.asyncresolver.Resolver()
                await resolver.resolve(lookup, 'A')
                # If we get here, the domain is blacklisted
                results["domain_services"][service] = "blacklisted"
                logging.warning(f"Domain {domain} is blacklisted on {service}")
            except dns.resolver.NXDOMAIN:
                # Not blacklisted
                results["domain_services"][service] = "clean"
            except dns.resolver.NoAnswer:
                # No data, assume clean
                results["domain_services"][service] = "clean"
            except Exception as lookup_error:
                # Error in lookup, mark as unknown
                logging.error(f"Error checking {service}: {lookup_error}")
                results["domain_services"][service] = "unknown"
        
        except Exception as e:
            logging.error(f"Error in domain blacklist check for {service}: {e}")
            results["domain_services"][service] = "error"
    
    return results

async def check_ip_blacklists(ips):
    """
    Check if any IP addresses are on common IP-based blacklists.
    
    Args:
        ips (list): List of IP addresses to check
        
    Returns:
        dict: Results of IP blacklist checks
    """
    results = {
        "ip_services": {ip: {} for ip in ips}
    }
    
    for ip in ips:
        for service in DNSBL_SERVICES:
            try:
                logging.debug(f"Checking IP {ip} against {service}")
                
                # Reverse the IP address for the lookup
                if ":" in ip:  # IPv6
                    # Skip IPv6 for now as many RBLs don't support it fully
                    continue
                else:  # IPv4
                    octets = ip.split('.')
                    reversed_ip = '.'.join(octets[::-1])
                
                # Construct the lookup hostname (reversed_ip.blacklist.service)
                lookup = f"{reversed_ip}.{service}"
                
                try:
                    resolver = dns.asyncresolver.Resolver()
                    answers = await resolver.resolve(lookup, 'A')
                    # If we get here, the IP is blacklisted
                    
                    # Get the return code for more details
                    return_code = answers[0].to_text().split('.')[-1]
                    results["ip_services"][ip][service] = f"blacklisted (code: {return_code})"
                    logging.warning(f"IP {ip} is blacklisted on {service} with code {return_code}")
                except dns.resolver.NXDOMAIN:
                    # Not blacklisted
                    results["ip_services"][ip][service] = "clean"
                except dns.resolver.NoAnswer:
                    # No data, assume clean
                    results["ip_services"][ip][service] = "clean"
                except Exception as lookup_error:
                    # Error in lookup, mark as unknown
                    logging.error(f"Error checking {service} for IP {ip}: {lookup_error}")
                    results["ip_services"][ip][service] = "unknown"
            
            except Exception as e:
                logging.error(f"Error in IP blacklist check for {ip} on {service}: {e}")
                results["ip_services"][ip][service] = "error"
    
    return results

def calculate_reputation_score(results):
    """
    Calculate a reputation score based on blacklist results.
    
    Args:
        results (dict): Blacklist check results
        
    Returns:
        int: Reputation score (0-100)
    """
    # Start with a perfect score
    score = 100
    
    # Calculate the percentage of blacklists the domain/IPs are on
    blacklist_percentage = (results["blacklist_count"] / results["total_services"]) * 100 if results["total_services"] > 0 else 0
    
    # Deduct points based on blacklist percentage
    # The more blacklists, the lower the score
    if blacklist_percentage > 0:
        if blacklist_percentage <= 5:
            # On a few blacklists (minor issue)
            score -= 20
        elif blacklist_percentage <= 15:
            # On several blacklists (moderate issue)
            score -= 50
        else:
            # On many blacklists (severe issue)
            score -= 80
    
    # Ensure score is between 0 and 100
    return max(0, min(100, score))

def generate_recommendations(results):
    """
    Generate recommendations based on blacklist check results.
    
    Args:
        results (dict): Blacklist check results
        
    Returns:
        list: List of recommendations
    """
    recommendations = []
    
    if results["blacklisted"]:
        recommendations.append({
            "priority": "high",
            "title": "Address Blacklisting Issues",
            "description": "Your domain or its IP addresses are on email blacklists. This can severely impact email deliverability."
        })
        
        # Add specific recommendations based on the type of blacklisting
        domain_blacklisted = any(status != "clean" for status in results["domain_services"].values())
        ip_blacklisted = any(any(status != "clean" for status in services.values()) 
                            for services in results["ip_services"].values())
        
        if domain_blacklisted:
            recommendations.append({
                "priority": "high",
                "title": "Domain Blacklisting",
                "description": "Your domain is on domain blacklists. This often indicates the domain has been used for spam, phishing, or malicious activities. Contact the blacklist operators for removal instructions."
            })
        
        if ip_blacklisted:
            recommendations.append({
                "priority": "high",
                "title": "IP Address Blacklisting",
                "description": "IP addresses associated with your domain are on blacklists. This may be due to spam activity, compromised servers, or shared hosting. Contact your hosting provider and the blacklist operators."
            })
        
        # General advice for blacklisted domains
        recommendations.append({
            "priority": "medium",
            "title": "Blacklist Removal Steps",
            "description": "1. Identify and fix the issue that caused blacklisting (spam, security breach, etc.)\n2. Implement proper email authentication (SPF, DKIM, DMARC)\n3. Submit removal requests to each blacklist operator\n4. Monitor your domain reputation regularly"
        })
    else:
        # Good practices for maintaining good reputation
        recommendations.append({
            "priority": "low",
            "title": "Maintain Good Reputation",
            "description": "Your domain is not currently on any checked blacklists. To maintain a good reputation: 1. Keep your email authentication (SPF, DKIM, DMARC) configured correctly\n2. Monitor email sending patterns\n3. Ensure secure email practices\n4. Regularly check domain reputation"
        })
    
    return recommendations