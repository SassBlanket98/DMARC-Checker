import asyncio
import socket
import dns.asyncresolver
import logging
from error_handling import DmarcError, DomainError, DnsLookupError

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Complete list of blacklists from MXToolBox
BLACKLISTS = [
    # Domain-based blacklists (RHSBL/SURBL)
    # {"name": "ivmURI", "service": "ivmuri.blacklist.com", "type": "domain"},
    {"name": "Nordspam DBL", "service": "dbl.nordspam.com", "type": "domain"},
    {"name": "SEM FRESH", "service": "fresh.spameatingmonkey.net", "type": "domain"},
    {"name": "SEM URI", "service": "uribl.spameatingmonkey.net", "type": "domain"},
    {"name": "SEM URIRED", "service": "urired.spameatingmonkey.net", "type": "domain"},
    {"name": "SORBS RHSBL BADCONF", "service": "rhsbl.sorbs.net", "type": "domain", "listing_type": "badconf"},
    {"name": "SORBS RHSBL NOMAIL", "service": "rhsbl.sorbs.net", "type": "domain", "listing_type": "nomail"},
    # {"name": "Spamhaus DBL", "service": "dbl.spamhaus.org", "type": "domain"},
    {"name": "SURBL multi", "service": "multi.surbl.org", "type": "domain"},
    # {"name": "URIBL", "service": "multi.uribl.com", "type": "domain"},
    # {"name": "URIBL RBL", "service": "black.uribl.com", "type": "domain"},
    
    # IP-based blacklists (DNSBL)
    {"name": "Abusix Mail Intelligence Blacklist", "service": "combined.mail.abusix.zone", "type": "ip"},
    {"name": "Abusix Mail Intelligence Domain Blacklist", "service": "combined-domain.mail.abusix.zone", "type": "domain"},
    {"name": "Abusix Mail Intelligence Exploit list", "service": "exploits.mail.abusix.zone", "type": "ip"},
    {"name": "Anonmails DNSBL", "service": "spam.dnsbl.anonmails.de", "type": "ip"},
    {"name": "BACKSCATTERER", "service": "ips.backscatterer.org", "type": "ip"},
    {"name": "BARRACUDA", "service": "b.barracudacentral.org", "type": "ip"},
    {"name": "BLOCKLIST.DE", "service": "bl.blocklist.de", "type": "ip"},
    {"name": "CALIVENT", "service": "calivent.bl.dns-servicios.com", "type": "ip"},
    {"name": "CYMRU BOGONS", "service": "bogons.cymru.com", "type": "ip"},
    {"name": "DAN TOR", "service": "tor.dan.me.uk", "type": "ip"},
    {"name": "DAN TOREXIT", "service": "torexit.dan.me.uk", "type": "ip"},
    {"name": "DRMX", "service": "dnsbl.dronebl.org", "type": "ip", "listing_type": "drones"},
    {"name": "DRONE BL", "service": "dnsbl.dronebl.org", "type": "ip"},
    {"name": "FABELSOURCES", "service": "bl.fabelsources.it", "type": "ip"},
    {"name": "HIL", "service": "hil.habeas.com", "type": "ip"},
    {"name": "HIL2", "service": "hil2.habeas.com", "type": "ip"},
    {"name": "Hostkarma Black", "service": "hostkarma.junkemailfilter.com", "type": "ip", "listing_type": "black"},
    {"name": "IBM DNS Blacklist", "service": "dnsbl.ibm.com", "type": "ip"},
    {"name": "ICMFORBIDDEN", "service": "forbidden.icm.edu.pl", "type": "ip"},
    # {"name": "IMP SPAM", "service": "ipbl-imp.spam-check.com", "type": "ip"},
    # {"name": "IMP WORM", "service": "wormbl-imp.spam-check.com", "type": "ip"},
    {"name": "INTERSERVER", "service": "rbl.interserver.net", "type": "ip"},
    # {"name": "ivmSIP", "service": "ivmsip.blacklist.com", "type": "ip"},
    # {"name": "ivmSIP24", "service": "ivmsip24.blacklist.com", "type": "ip"},
    {"name": "JIPPG", "service": "ubl.jippg.org", "type": "ip"},
    {"name": "KEMPTBL", "service": "spamrbl.imp.ch", "type": "ip"},
    {"name": "Konstant", "service": "bl.konstant.no", "type": "ip"},
    {"name": "LASHBACK", "service": "ubl.lashback.com", "type": "ip"},
    {"name": "MAILSPIKE BL", "service": "bl.mailspike.net", "type": "ip"},
    {"name": "MAILSPIKE Z", "service": "z.mailspike.net", "type": "ip"},
    {"name": "MSRBL Phishing", "service": "phishing.rbl.msrbl.net", "type": "ip"},
    {"name": "MSRBL Spam", "service": "spam.rbl.msrbl.net", "type": "ip"},
    {"name": "NETHERRELAYS", "service": "dnsbl.netherrelays.com", "type": "ip"},
    {"name": "NETHERUNSURE", "service": "dnsbl.netherunsure.com", "type": "ip"},
    {"name": "Nordspam BL", "service": "bl.nordspam.com", "type": "ip"},
    {"name": "PSBL", "service": "psbl.surriel.com", "type": "ip"},
    {"name": "RATS Dyna", "service": "dyna.spamrats.com", "type": "ip"},
    {"name": "RATS NoPtr", "service": "noptr.spamrats.com", "type": "ip"},
    {"name": "RATS Spam", "service": "spam.spamrats.com", "type": "ip"},
    {"name": "RBL JP", "service": "rbl.jp", "type": "ip"},
    {"name": "s5h.net", "service": "s5h.net", "type": "ip"},
    {"name": "SCHULTE", "service": "rbl.schulte.org", "type": "ip"},
    {"name": "SEM BACKSCATTER", "service": "backscatter.spameatingmonkey.net", "type": "ip"},
    {"name": "SEM BLACK", "service": "bl.spameatingmonkey.net", "type": "ip"},
    # {"name": "Sender Score Reputation Network", "service": "score.senderscore.com", "type": "ip"},
    # {"name": "SERVICESNET", "service": "spam.servicesnet.com", "type": "ip"},
    {"name": "SPAMCOP", "service": "bl.spamcop.net", "type": "ip"},
    # {"name": "Spamhaus ZEN", "service": "zen.spamhaus.org", "type": "ip"},
    {"name": "SPFBL DNSBL", "service": "dnsbl.spfbl.net", "type": "ip"},
    {"name": "Suomispam Reputation", "service": "spam.suomispam.net", "type": "ip"},
    {"name": "SWINOG", "service": "dnsrbl.swinog.ch", "type": "ip"},
    {"name": "TRIUMF", "service": "rbl.triumf.ca", "type": "ip"},
    {"name": "TRUNCATE", "service": "truncate.gbudb.net", "type": "ip"},
    {"name": "UCEPROTECT1", "service": "dnsbl-1.uceprotect.net", "type": "ip"},
    {"name": "UCEPROTECT2", "service": "dnsbl-2.uceprotect.net", "type": "ip"},
    {"name": "UCEPROTECT3", "service": "dnsbl-3.uceprotect.net", "type": "ip"},
    {"name": "Woodys SMTP Blacklist", "service": "blacklist.woody.ch", "type": "ip"},
    {"name": "ZapBL", "service": "dnsbl.zapbl.net", "type": "ip"},
    {"name": "KISA", "service": "rbl.kisa.or.kr", "type": "ip"},
    {"name": "NoSolicitado", "service": "bl.nosolicitado.org", "type": "ip"}
]

# Split into the required lists for backward compatibility
DNSBL_SERVICES = [item["service"] for item in BLACKLISTS if item["type"] == "ip"]
DOMAIN_BL_SERVICES = [item["service"] for item in BLACKLISTS if item["type"] == "domain"]

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
        "total_services": len(BLACKLISTS),
        "blacklist_details": [],
        "domain_services": {},
        "ip_services": {}
    }
    
    try:
        # Get IPs associated with the domain
        ips = await resolve_domain_to_ips(domain)
        
        # Create tasks for both domain and IP checks
        domain_task = check_domain_blacklists(domain)
        ip_task = check_ip_blacklists(ips)
        
        # Run tasks with a timeout
        try:
            domain_results, ip_results = await asyncio.wait_for(
                asyncio.gather(domain_task, ip_task),
                timeout=30  # Overall timeout of 30 seconds
            )
            
            # Update results
            results.update(domain_results)
            results.update(ip_results)
            
        except asyncio.TimeoutError:
            logging.warning(f"Timeout while checking blacklists for {domain}")
            # Include partial results if available
            if hasattr(domain_task, 'result') and domain_task.result():
                results.update(domain_task.result())
            if hasattr(ip_task, 'result') and ip_task.result():
                results.update(ip_task.result())
                
            # Add timeout information
            results["timeout"] = True
            results["timeout_message"] = "Some blacklist checks timed out. Results may be incomplete."
        
        # Determine overall blacklist status and count
        blacklisted_services = []
        
        # Check domain blacklists
        for service, status in results["domain_services"].items():
            if status == "blacklisted":
                blacklisted_services.append(service)
        
        # Check IP blacklists
        for ip, services in results["ip_services"].items():
            for service, status in services.items():
                if "blacklisted" in status:
                    blacklisted_services.append(f"{service} ({ip})")
        
        # Update blacklist count and details
        results["blacklist_count"] = len(blacklisted_services)
        results["blacklist_details"] = blacklisted_services
        results["blacklisted"] = results["blacklist_count"] > 0
        
        # Calculate reputation score
        results["reputation_score"] = calculate_reputation_score(results)
        
        # Generate recommendations based on results
        results["recommendations"] = generate_recommendations(results)
        
        # Map blacklist services to their friendly names
        results["service_names"] = {bl["service"]: bl["name"] for bl in BLACKLISTS}
        
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
    results = {"domain_services": {}}
    
    # Create tasks for all blacklist checks
    tasks = []
    domain_blacklists = []
    
    for blacklist in BLACKLISTS:
        if blacklist["type"] == "domain":
            service = blacklist["service"]
            domain_blacklists.append(service)
            tasks.append(check_single_domain_blacklist(domain, service))
    
    # Run all tasks concurrently
    service_results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Process results
    for i, service in enumerate(domain_blacklists):
        result = service_results[i]
        if isinstance(result, Exception):
            logging.error(f"Error checking {service}: {result}")
            results["domain_services"][service] = "error"
        else:
            results["domain_services"][service] = result
    
    return results

async def check_single_domain_blacklist(domain, service):
    try:
        logging.debug(f"Checking domain {domain} against {service}")
        
        # Construct the lookup hostname (domain.blacklist.service)
        lookup = f"{domain}.{service}"
        
        try:
            resolver = dns.asyncresolver.Resolver()
            resolver.lifetime = 3.0  # 3 second timeout
            await resolver.resolve(lookup, 'A')
            # If we get here, the domain is blacklisted
            logging.warning(f"Domain {domain} is blacklisted on {service}")
            return "blacklisted"
        except asyncio.TimeoutError:
            logging.warning(f"Timeout checking {service} for {domain}")
            return "timeout"
        except dns.resolver.NXDOMAIN:
            # Not blacklisted
            return "clean"
        except dns.resolver.NoAnswer:
            # No data, assume clean
            return "clean"
        except Exception as lookup_error:
            # Error in lookup, mark as unknown
            logging.error(f"Error checking {service}: {lookup_error}")
            return "unknown"
    except Exception as e:
        logging.error(f"Error in domain blacklist check for {service}: {e}")
        raise
    
async def check_single_ip_blacklist(ip, service):
    try:
        logging.debug(f"Checking IP {ip} against {service}")
        
        # Reverse the IP address for the lookup
        if ":" in ip:  # IPv6
            # Skip certain blacklists that don't support IPv6
            ipv6_unsupported = ["bl.spamcop.net", "zen.spamhaus.org", "psbl.surriel.com"]
            if service in ipv6_unsupported:
                return "unsupported"
                
            # Process IPv6 address for lookup - this is a simplified approach
            # For a complete IPv6 reverse, you'd need more complex logic
            reversed_ip = ip.replace(":", "")
            reversed_ip = ".".join(reversed(list(reversed_ip)))
        else:  # IPv4
            octets = ip.split('.')
            reversed_ip = '.'.join(octets[::-1])
        
        # Construct the lookup hostname (reversed_ip.blacklist.service)
        lookup = f"{reversed_ip}.{service}"
        
        try:
            resolver = dns.asyncresolver.Resolver()
            resolver.lifetime = 3.0  # 3 second timeout
            answers = await resolver.resolve(lookup, 'A')
            # If we get here, the IP is blacklisted
            
            # Get the return code for more details
            return_code = answers[0].to_text().split('.')[-1]
            logging.warning(f"IP {ip} is blacklisted on {service} with code {return_code}")
            return f"blacklisted (code: {return_code})"
        except asyncio.TimeoutError:
            logging.warning(f"Timeout checking {service} for IP {ip}")
            return "timeout"
        except dns.resolver.NXDOMAIN:
            # Not blacklisted
            return "clean"
        except dns.resolver.NoAnswer:
            # No data, assume clean
            return "clean"
        except Exception as lookup_error:
            # Error in lookup, mark as unknown
            logging.error(f"Error checking {service} for IP {ip}: {lookup_error}")
            return "unknown"
    except Exception as e:
        logging.error(f"Error in IP blacklist check for {ip} on {service}: {e}")
        raise
    
async def check_ip_blacklists(ips):
    """
    Check if any IP addresses are on common IP-based blacklists.
    
    Args:
        ips (list): List of IP addresses to check
        
    Returns:
        dict: Results of IP blacklist checks
    """
    results = {"ip_services": {ip: {} for ip in ips}}
    
    # Process each IP
    for ip in ips:
        tasks = []
        ip_blacklists = []
        
        for blacklist in BLACKLISTS:
            if blacklist["type"] == "ip":
                service = blacklist["service"]
                ip_blacklists.append(service)
                tasks.append(check_single_ip_blacklist(ip, service))
        
        # Run all tasks for this IP concurrently
        service_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, service in enumerate(ip_blacklists):
            result = service_results[i]
            if isinstance(result, Exception):
                logging.error(f"Error checking {service} for IP {ip}: {result}")
                results["ip_services"][ip][service] = "error"
            else:
                results["ip_services"][ip][service] = result
    
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
    
    # Define high-impact blacklists
    high_impact_blacklists = [
        "zen.spamhaus.org", 
        "b.barracudacentral.org", 
        "dbl.spamhaus.org",
        "spam.dnsbl.anonmails.de",
        "psbl.surriel.com",
        "bl.mailspike.net"
    ]
    
    # Define medium-impact blacklists
    medium_impact_blacklists = [
        "bl.spamcop.net",
        "bl.nordspam.com",
        "bl.spameatingmonkey.net",
        "dnsbl-1.uceprotect.net",
        "multi.surbl.org",
        "black.uribl.com"
    ]
    
    # Count blacklisting by impact level
    high_impact_count = 0
    medium_impact_count = 0
    low_impact_count = 0
    
    # Check domain blacklistings
    for service, status in results["domain_services"].items():
        if status == "blacklisted":
            if service in high_impact_blacklists:
                high_impact_count += 1
            elif service in medium_impact_blacklists:
                medium_impact_count += 1
            else:
                low_impact_count += 1
    
    # Check IP blacklistings
    for ip, services in results["ip_services"].items():
        for service, status in services.items():
            if "blacklisted" in status:
                if service in high_impact_blacklists:
                    high_impact_count += 1
                elif service in medium_impact_blacklists:
                    medium_impact_count += 1
                else:
                    low_impact_count += 1
    
    # Calculate deductions based on impact levels
    high_impact_deduction = min(60, high_impact_count * 20)  # Max 60 point deduction
    medium_impact_deduction = min(30, medium_impact_count * 10)  # Max 30 point deduction
    low_impact_deduction = min(20, low_impact_count * 5)  # Max 20 point deduction
    
    # Apply deductions
    score -= high_impact_deduction
    score -= medium_impact_deduction
    score -= low_impact_deduction
    
    # Calculate total blacklisted count
    total_blacklisted = high_impact_count + medium_impact_count + low_impact_count
    
    # If on many blacklists, cap score even lower
    if total_blacklisted >= 5:
        score = min(score, 40)
    elif total_blacklisted >= 3:
        score = min(score, 60)
    
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