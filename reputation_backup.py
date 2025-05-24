# reputation.py (Consolidated ip_checker.py and reputation_check.py)

import aiohttp
import asyncio
import socket
import dns.asyncresolver
import logging
import json
import re
import os # Ensure os is imported
from error_handling import DmarcError, DomainError, DnsLookupError
from cache import ip_info_cache, reputation_cache, external_api_cache

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# --- Configuration for new sources ---
ABUSEIPDB_API_KEY = os.getenv("ABUSEIPDB_API_KEY")
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")

# Placeholder for your existing DNSBL list or logic from reputation_check.py
# You might want to expand this list:
ADDITIONAL_DNSBLS = [
    "zen.spamhaus.org",
    "b.barracudacentral.org",
    "bl.spamcop.net",
    # ... add more reputable DNSBLs
]

# --- IP Checking Functions (from ip_checker.py) ---

async def get_ip_info(ip_address=None):
    """
    Fetch information about an IP address using multiple fallback services.
    """
    try:
        # Try the primary service (ipapi.co)
        try:
            # If no IP address is provided, it will return information about the client's IP
            api_url = f"https://ipapi.co/{ip_address if ip_address else 'json'}/json/"

            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()

                        # Check if the API returned an error
                        if 'error' in data and data.get('reason') != 'RateLimited': # Allow fallback on rate limit
                             logging.warning(f"Primary IP API error: {data.get('reason')}, trying fallback...")
                            # Don't return error here, try fallback instead
                        elif data.get('reserved'): # Handle reserved IPs
                             logging.warning(f"IP address {ip_address} is reserved.")
                             return format_ipapi_response(data, is_reserved=True)
                        else:
                            # Format the response data
                            return format_ipapi_response(data)
                    else:
                        logging.warning(f"Primary IP API HTTP error: {response.status}, trying fallback...")
        except Exception as e:
            logging.warning(f"Primary IP API exception: {e}, trying fallback...")

        # Fallback service 1 (ipinfo.io)
        try:
            fallback_url = f"https://ipinfo.io/{ip_address if ip_address else ''}/json"

            async with aiohttp.ClientSession() as session:
                async with session.get(fallback_url, timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        # Check for rate limit or other specific errors from ipinfo if necessary
                        if data.get('bogon'): # Handle bogon IPs
                             logging.warning(f"IP address {ip_address} is a bogon.")
                             return format_ipinfo_response(data, is_bogon=True)
                        return format_ipinfo_response(data)
                    else:
                        logging.warning(f"Fallback IP API HTTP error: {response.status}, trying final fallback...")
        except Exception as e:
            logging.warning(f"Fallback IP API exception: {e}, trying final fallback...")

        # Final fallback - use a simple service just to get the IP
        if not ip_address:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get("https://api.ipify.org?format=json", timeout=5) as response:
                        if response.status == 200:
                            data = await response.json()
                            ip = data.get('ip')

                            # Return minimal info with just the IP
                            return {
                                "ip": ip,
                                "version": "IPv4" if "." in ip else "IPv6",
                                "city": "Unknown",
                                "region": "Unknown",
                                "country": "Unknown",
                                "location": {
                                    "latitude": None, # Use None instead of 0
                                    "longitude": None
                                },
                                "isp": "Unknown",
                                "timezone": "Unknown",
                                "asn": "Unknown",
                                "recommendations": [{
                                    "priority": "low",
                                    "title": "Limited IP Information",
                                    "description": "We were able to detect your IP address, but detailed information is currently unavailable. Try again later for more complete results."
                                }]
                            }
            except Exception as e:
                logging.error(f"Final fallback IP API exception: {e}")

        # If all services failed
        return {
            "error": "Unable to retrieve IP information from multiple services",
            "error_code": "IP_SERVICES_UNAVAILABLE",
            "suggestions": [
                "There may be temporary issues with IP geolocation services",
                "Check your internet connection",
                "Try again in a few minutes"
            ]
        }
    except Exception as e:
        logging.exception(f"Error in get_ip_info: {e}")
        return {
            "error": f"Error retrieving IP information: {str(e)}",
            "error_code": "IP_INFO_ERROR",
            "suggestions": ["Please try again later"]
        }

def format_ipapi_response(data, is_reserved=False):
    """Format response from ipapi.co"""
    recommendations = []
    if is_reserved:
        recommendations.append({
            "priority": "info",
            "title": "Reserved IP Address",
            "description": f"The IP address {data.get('ip')} is reserved and not routable on the public internet (e.g., private network, loopback)."
        })
    else:
        recommendations = get_ip_recommendations("IPv4" if "." in data.get('ip', '') else "IPv6")

    return {
        "ip": data.get('ip'),
        "version": "IPv4" if "." in data.get('ip', '') else "IPv6",
        "city": data.get('city'),
        "region": data.get('region'),
        "country": data.get('country_name'),
        "location": {
            "latitude": data.get('latitude'),
            "longitude": data.get('longitude')
        },
        "isp": data.get('org'),
        "timezone": data.get('timezone'),
        "asn": data.get('asn'),
        "reserved": is_reserved,
        "recommendations": recommendations
    }

def format_ipinfo_response(data, is_bogon=False):
    """Format response from ipinfo.io"""
    loc = data.get('loc', '').split(',')
    lat = float(loc[0]) if len(loc) > 0 and loc[0] else None
    lng = float(loc[1]) if len(loc) > 1 and loc[1] else None

    recommendations = []
    if is_bogon:
        recommendations.append({
             "priority": "warning",
             "title": "Bogon IP Address",
             "description": f"The IP address {data.get('ip')} is a bogon (unallocated or reserved) address and should not appear on the public internet."
         })
    else:
        recommendations = get_ip_recommendations("IPv4" if "." in data.get('ip', '') else "IPv6")


    return {
        "ip": data.get('ip'),
        "version": "IPv4" if "." in data.get('ip', '') else "IPv6",
        "city": data.get('city'),
        "region": data.get('region'),
        "country": data.get('country'),
        "location": {
            "latitude": lat,
            "longitude": lng
        },
        "isp": data.get('org'),
        "timezone": data.get('timezone'),
        "asn": data.get('asn'), # ASN data might be in 'asn' field from ipinfo
        "bogon": is_bogon,
        "recommendations": recommendations
    }

def get_ip_recommendations(ip_version):
    """Get recommendations based on IP version"""
    recommendations = []

    if ip_version == "IPv4":
        recommendations.append({
            "priority": "medium",
            "title": "Consider IPv6 Support",
            "description": "IPv6 is the newest version of the Internet Protocol. Consider implementing IPv6 support for your network to future-proof your infrastructure."
        })

    return recommendations

async def check_ip_reputation(ip_address):
    """
    Check the reputation of an IP address against various blacklists.
    """
    if not ip_address:
        return {
            "error": "IP address is required for reputation check",
            "error_code": "MISSING_IP_FOR_REPUTATION"
        }

    logging.debug(f"Starting IP reputation check for: {ip_address}")
    results = {
        "ip": ip_address,
        "blacklisted": False,
        "blacklist_count": 0,
        "blacklist_details": [],
        "service_statuses": {},
        "reputation_score": 100 # Start with a perfect score
    }

    # Use the IP-based blacklists defined below
    ip_blacklists = [item for item in BLACKLISTS if item["type"] == "ip"]
    results["total_services"] = len(ip_blacklists)

    tasks = []
    for blacklist in ip_blacklists:
        tasks.append(check_single_ip_blacklist(ip_address, blacklist["service"]))

    # Run all tasks concurrently with a timeout
    try:
        service_results = await asyncio.wait_for(asyncio.gather(*tasks, return_exceptions=True), timeout=25)
    except asyncio.TimeoutError:
        logging.warning(f"Timeout during IP blacklist check for {ip_address}")
        return {**results, "error": "IP reputation check timed out", "error_code": "IP_REPUTATION_TIMEOUT"}

    # Process results
    listed_on = []
    for i, blacklist in enumerate(ip_blacklists):
        service = blacklist["service"]
        result = service_results[i]

        if isinstance(result, Exception):
            logging.error(f"Error checking {service} for IP {ip_address}: {result}")
            results["service_statuses"][service] = "error"
        elif result == "timeout":
            results["service_statuses"][service] = "timeout"
        elif "blacklisted" in result:
            results["service_statuses"][service] = result
            listed_on.append(f"{blacklist['name']} ({result.split(': ')[-1].strip(')')})") # Use friendly name
        else:
            results["service_statuses"][service] = result # clean, unsupported, unknown

    results["blacklist_count"] = len(listed_on)
    results["blacklisted"] = results["blacklist_count"] > 0
    results["blacklist_details"] = listed_on

    # Calculate reputation score based on listings
    # Simple scoring: -10 for each listing, min score 0
    results["reputation_score"] = max(0, 100 - (results["blacklist_count"] * 10))

    logging.info(f"IP Reputation check for {ip_address} complete. Listed: {results['blacklisted']}, Count: {results['blacklist_count']}")
    return results


async def query_abuseipdb(session, ip_address):
    if not ABUSEIPDB_API_KEY:
        return {"error": "AbuseIPDB API key not configured", "source": "AbuseIPDB"}
    
    # Check cache first
    cache_key = external_api_cache._generate_key("abuseipdb", ip_address)
    cached_result = external_api_cache.get(cache_key)
    if cached_result:
        logging.debug(f"Using cached AbuseIPDB result for {ip_address}")
        return cached_result
    
    url = "https://api.abuseipdb.com/api/v2/check"
    headers = {"Key": ABUSEIPDB_API_KEY, "Accept": "application/json"}
    params = {"ipAddress": ip_address, "maxAgeInDays": "90", "verbose": ""} # Added verbose for more details
    try:
        async with session.get(url, headers=headers, params=params) as response:
            if response.status == 200:
                result = {"data": await response.json(), "source": "AbuseIPDB"}
                external_api_cache.set(cache_key, result)  # Cache successful result
                return result
            # Handle rate limits (often 429) and other errors
            elif response.status == 429:
                error_result = {"error": "AbuseIPDB rate limit exceeded", "source": "AbuseIPDB"}
                # Don't cache rate limit errors
                return error_result
            else:
                error_result = {"error": f"AbuseIPDB API error: {response.status}", "details": await response.text(), "source": "AbuseIPDB"}
                # Cache API errors for a short time to avoid hammering the API
                external_api_cache.set(cache_key, error_result, ttl=60)
                return error_result
    except Exception as e:
        error_result = {"error": f"Failed to query AbuseIPDB: {str(e)}", "source": "AbuseIPDB"}
        # Cache connection errors for a short time
        external_api_cache.set(cache_key, error_result, ttl=60)
        return error_result


async def query_virustotal_ip(session, ip_address):
    if not VIRUSTOTAL_API_KEY:
        return {"error": "VirusTotal API key not configured", "source": "VirusTotal"}
    
    # Check cache first
    cache_key = external_api_cache._generate_key("virustotal", ip_address)
    cached_result = external_api_cache.get(cache_key)
    if cached_result:
        logging.debug(f"Using cached VirusTotal result for {ip_address}")
        return cached_result
    
    url = f"https://www.virustotal.com/api/v3/ip_addresses/{ip_address}"
    headers = {"x-apikey": VIRUSTOTAL_API_KEY}
    try:
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                result = {
                    "data": {
                        "reputation": data.get("data", {}).get("attributes", {}).get("reputation"),
                        "last_analysis_stats": data.get("data", {}).get("attributes", {}).get("last_analysis_stats"),
                        "as_owner": data.get("data", {}).get("attributes", {}).get("as_owner"),
                        "last_modification_date": data.get("data", {}).get("attributes", {}).get("last_modification_date"),
                        # Add more fields as needed
                    },
                    "source": "VirusTotal"
                }
                external_api_cache.set(cache_key, result)  # Cache successful result
                return result
            elif response.status == 404:
                info_result = {"info": "IP address not found in VirusTotal", "source": "VirusTotal"}
                external_api_cache.set(cache_key, info_result, ttl=300)  # Cache 404s for shorter time
                return info_result
            elif response.status == 429: # Common for rate limits
                error_result = {"error": "VirusTotal rate limit exceeded", "source": "VirusTotal"}
                # Don't cache rate limit errors
                return error_result
            else:
                error_result = {"error": f"VirusTotal API error: {response.status}", "details": await response.text(), "source": "VirusTotal"}
                external_api_cache.set(cache_key, error_result, ttl=60)  # Cache API errors briefly
                return error_result
    except Exception as e:
        error_result = {"error": f"Failed to query VirusTotal: {str(e)}", "source": "VirusTotal"}
        external_api_cache.set(cache_key, error_result, ttl=60)  # Cache connection errors briefly
        return error_result

# You would also add functions for other services like IPQualityScore, AlienVault OTX etc.

# --- DNSBL Checking (Enhance or integrate existing logic) ---
# This function should be merged/enhanced with your existing DNSBL logic from reputation_check.py
# Ensure it uses dnspython asynchronously if possible (e.g., using asyncio.to_thread for resolver calls)
async def check_comprehensive_dnsbls(ip_address, dnsbl_servers_list=None):
    """
    Comprehensive DNSBL checking against multiple blacklist servers.
    
    Args:
        ip_address (str): IP address to check
        dnsbl_servers_list (list, optional): List of DNSBL servers to check against
        
    Returns:
        dict: DNSBL check results with detailed information
    """
    if not dnsbl_servers_list:
        # Default comprehensive list of DNSBL servers
        dnsbl_servers_list = [
            "zen.spamhaus.org",
            "bl.spamcop.net", 
            "dnsbl.sorbs.net",
            "b.barracudacentral.org",
            "ix.dnsbl.manitu.net",
            "psbl.surriel.com",
            "ubl.unsubscore.com",
            "cbl.abuseat.org",
            "pbl.spamhaus.org",
            "sbl.spamhaus.org",
            "xbl.spamhaus.org",
            "dnsbl-1.uceprotect.net",
            "dnsbl-2.uceprotect.net", 
            "dnsbl-3.uceprotect.net",
            "bl.spamcannibal.org",
            "dyna.spamrats.com",
            "noptr.spamrats.com",
            "spam.spamrats.com"
        ]
    
    # Validate IP address format
    if not ip_address or not re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', ip_address):
        return {
            "info": f"Invalid IP address format: {ip_address}",
            "checked_servers": [],
            "results": {},
            "listed_count": 0,
            "source": "DNSBL"
        }
    
    # Reverse the IP for DNSBL queries (IPv4 only for now)
    try:
        reversed_ip = '.'.join(reversed(ip_address.split('.')))
    except Exception:
        return {
            "info": f"Unable to reverse IP address: {ip_address}",
            "checked_servers": [],
            "results": {},
            "listed_count": 0,
            "source": "DNSBL"
        }
    
    logging.info(f"Checking DNSBLs for {ip_address} against {len(dnsbl_servers_list)} servers.")
    
    results = {}
    checked_servers = []
    
    # Use semaphore to limit concurrent DNS queries
    semaphore = asyncio.Semaphore(10)  # Limit to 10 concurrent queries
    
    async def check_single_dnsbl(dnsbl_server):
        async with semaphore:
            query_domain = f"{reversed_ip}.{dnsbl_server}"
            try:
                # Use asyncio.to_thread to make DNS resolution async
                await asyncio.wait_for(
                    asyncio.to_thread(socket.getaddrinfo, query_domain, None),
                    timeout=5.0
                )
                return dnsbl_server, {
                    "status": "listed",
                    "server": dnsbl_server,
                    "query": query_domain,
                    "description": f"IP {ip_address} is listed on {dnsbl_server}"
                }
            except (socket.gaierror, asyncio.TimeoutError):
                # NXDOMAIN or timeout means not listed
                return dnsbl_server, {
                    "status": "not_listed",
                    "server": dnsbl_server,
                    "query": query_domain,
                    "description": f"IP {ip_address} is not listed on {dnsbl_server}"
                }
            except Exception as e:
                logging.warning(f"Error checking DNSBL {dnsbl_server}: {e}")
                return dnsbl_server, {
                    "status": "error",
                    "server": dnsbl_server,
                    "query": query_domain,
                    "error": str(e),
                    "description": f"Error checking {dnsbl_server}: {str(e)}"
                }
    
    # Run all DNSBL checks concurrently
    try:
        tasks = [check_single_dnsbl(server) for server in dnsbl_servers_list]
        dnsbl_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for result in dnsbl_results:
            if isinstance(result, Exception):
                logging.error(f"DNSBL check exception: {result}")
                continue
                
            server, server_result = result
            results[server] = server_result
            checked_servers.append(server)
        
        # Count how many lists the IP is on
        listed_count = sum(1 for r in results.values() if r.get("status") == "listed")
        
        # Determine overall reputation based on listings
        reputation_status = "clean"
        if listed_count > 0:
            if listed_count >= 3:
                reputation_status = "highly_suspicious" 
            elif listed_count >= 2:
                reputation_status = "suspicious"
            else:
                reputation_status = "potentially_suspicious"
        
        return {
            "info": f"Checked {ip_address} against {len(checked_servers)} DNSBL servers, found on {listed_count} lists",
            "checked_servers": checked_servers,
            "results": results,
            "listed_count": listed_count,
            "reputation_status": reputation_status,
            "source": "DNSBL",
            "summary": {
                "total_checked": len(checked_servers),
                "listed_on": listed_count,
                "clean_on": len(checked_servers) - listed_count,
                "errors": sum(1 for r in results.values() if r.get("status") == "error")
            }
        }
        
    except Exception as e:
        logging.error(f"Error in comprehensive DNSBL check: {e}")
        return {
            "info": f"Error checking DNSBLs for {ip_address}: {str(e)}",
            "checked_servers": checked_servers,
            "results": results,
            "listed_count": 0,
            "error": str(e),
            "source": "DNSBL"
        }


async def get_complete_ip_info(ip_address=None):
    """
    Get complete information about an IP address including basic info and reputation from multiple sources.
    Enhanced with external threat intelligence APIs.
    """
    # Check cache first for complete IP info
    cache_key = ip_info_cache._generate_key("complete_ip", ip_address or "client_ip")
    cached_result = ip_info_cache.get(cache_key)
    if cached_result:
        logging.debug(f"Using cached complete IP info for {ip_address or 'client_ip'}")
        return cached_result
    
    # Get basic IP information
    ip_info = await get_ip_info(ip_address)

    # Check if there was an error getting IP info or if it's reserved/bogon
    if "error" in ip_info or ip_info.get('reserved') or ip_info.get('bogon'):
        # Don't perform reputation check for invalid/reserved IPs
        if ip_info.get('reserved'):
            ip_info["reputation"] = {"status": "not_applicable", "reason": "Reserved IP"}
        elif ip_info.get('bogon'):
            ip_info["reputation"] = {"status": "not_applicable", "reason": "Bogon IP"}
        return ip_info

    # Get IP reputation using the actual IP resolved by get_ip_info
    actual_ip = ip_info.get("ip")
    if not actual_ip:
        # If we couldn't even get the IP, return the error from get_ip_info
        combined_info = ip_info
        combined_info["reputation"] = {"error": "IP address unknown", "error_code": "IP_UNKNOWN_FOR_REPUTATION"}
        return combined_info

    # Prepare external reputation sources for concurrent execution
    external_sources = []
    
    try:
        # Create session for external API calls
        async with aiohttp.ClientSession() as session:
            # Run all reputation checks concurrently
            results = await asyncio.gather(
                check_ip_reputation(actual_ip),  # Existing DNSBL checks
                query_abuseipdb(session, actual_ip),  # AbuseIPDB
                query_virustotal_ip(session, actual_ip),  # VirusTotal
                check_comprehensive_dnsbls(actual_ip),  # Enhanced DNSBL checking
                return_exceptions=True
            )
            
            # Process results
            base_reputation, abuseipdb_result, virustotal_result, dnsbl_result = results
            
            # Collect external source data
            if not isinstance(abuseipdb_result, Exception) and "error" not in abuseipdb_result:
                external_sources.append(abuseipdb_result)
            
            if not isinstance(virustotal_result, Exception) and "error" not in virustotal_result:
                external_sources.append(virustotal_result)
                
            if not isinstance(dnsbl_result, Exception) and "error" not in dnsbl_result:
                external_sources.append(dnsbl_result)

        # Combine the information
        combined_info = {**ip_info}

        # Add the enhanced reputation data
        if "error" not in base_reputation:
            combined_info["reputation"] = base_reputation
            
            # Add external reputation sources
            combined_info["external_reputation_sources"] = external_sources
            
            # Calculate overall reputation score
            combined_info["overall_calculated_reputation"] = calculate_overall_reputation_score(
                base_reputation, external_sources
            )
            
            # Merge recommendations - avoid duplicates
            existing_recs = {rec['title'] for rec in combined_info.get("recommendations", []) if isinstance(rec, dict)}
            ip_reputation_recs = generate_ip_reputation_recommendations(base_reputation)
            
            # Add recommendations from external sources
            for source in external_sources:
                source_recs = generate_external_source_recommendations(source)
                ip_reputation_recs.extend(source_recs)
            
            for rec in ip_reputation_recs:
                if isinstance(rec, dict) and rec.get('title') not in existing_recs:
                    combined_info.setdefault("recommendations", []).append(rec)
        else:
            combined_info["reputation"] = {"error": base_reputation["error"], "error_code": base_reputation.get("error_code")}
            combined_info["external_reputation_sources"] = external_sources  # Still include external data if available
            combined_info.setdefault("recommendations", []).append({
                "priority": "warning",
                "title": "Reputation Check Error",
                "description": f"Could not check IP reputation: {base_reputation['error']}"
            })

    except Exception as e:
        logging.error(f"Error in enhanced IP reputation check: {e}")
        combined_info = ip_info
        combined_info["reputation"] = {"error": f"Enhanced reputation check failed: {str(e)}", "error_code": "ENHANCED_REPUTATION_ERROR"}

    return combined_info


def calculate_overall_reputation_score(base_reputation, external_sources):
    """
    Calculate an overall reputation score from multiple sources.
    
    Args:
        base_reputation (dict): Basic reputation data (DNSBL checks)
        external_sources (list): List of external source results
        
    Returns:
        dict: Overall reputation assessment
    """
    # Start with base score
    base_score = base_reputation.get("reputation_score", 100)
    
    # Factors from external sources
    abuseipdb_confidence = 0
    virustotal_malicious = 0
    dnsbl_listings = 0
    
    for source in external_sources:
        source_name = source.get("source", "")
        
        if source_name == "AbuseIPDB" and "data" in source:
            data = source["data"].get("data", {})
            abuseipdb_confidence = data.get("abuseConfidencePercentage", 0)
            
        elif source_name == "VirusTotal" and "data" in source:
            stats = source["data"].get("last_analysis_stats", {})
            virustotal_malicious = stats.get("malicious", 0)
            
        elif source_name == "DNSBL":
            dnsbl_listings = source.get("listed_count", 0)
    
    # Calculate weighted score
    # AbuseIPDB confidence is a strong indicator (0-100%)
    confidence_penalty = abuseipdb_confidence * 0.8  # Up to 80 point penalty
    
    # VirusTotal malicious detections
    vt_penalty = min(virustotal_malicious * 15, 60)  # Up to 60 point penalty
    
    # Enhanced DNSBL listings
    dnsbl_penalty = min(dnsbl_listings * 10, 50)  # Up to 50 point penalty
    
    # Calculate final score
    final_score = max(0, base_score - confidence_penalty - vt_penalty - dnsbl_penalty)
    
    # Determine risk level
    if final_score >= 80:
        risk_level = "low"
        risk_description = "Low risk - IP appears clean across multiple sources"
    elif final_score >= 60:
        risk_level = "medium"
        risk_description = "Medium risk - Some reputation concerns detected"
    elif final_score >= 40:
        risk_level = "high"
        risk_description = "High risk - Multiple reputation issues found"
    else:
        risk_level = "critical"
        risk_description = "Critical risk - Significant reputation problems detected"
    
    return {
        "overall_score": round(final_score, 1),
        "risk_level": risk_level,
        "risk_description": risk_description,
        "score_breakdown": {
            "base_score": base_score,
            "abuseipdb_penalty": confidence_penalty,
            "virustotal_penalty": vt_penalty,
            "dnsbl_penalty": dnsbl_penalty
        },
        "factors": {
            "abuseipdb_confidence": abuseipdb_confidence,
            "virustotal_malicious": virustotal_malicious,
            "dnsbl_listings": dnsbl_listings
        }
    }


def generate_external_source_recommendations(source):
    """
    Generate recommendations based on external source data.
    
    Args:
        source (dict): External source result data
        
    Returns:
        list: List of recommendations
    """
    recommendations = []
    source_name = source.get("source", "Unknown")
    
    if source_name == "AbuseIPDB" and "data" in source:
        data = source["data"].get("data", {})
        confidence = data.get("abuseConfidencePercentage", 0)
        
        if confidence > 50:
            recommendations.append({
                "priority": "high",
                "title": f"AbuseIPDB High Confidence ({confidence}%)",
                "description": f"AbuseIPDB reports this IP with {confidence}% confidence of abuse. Review the reports and take appropriate action."
            })
        elif confidence > 25:
            recommendations.append({
                "priority": "medium",
                "title": f"AbuseIPDB Medium Confidence ({confidence}%)",
                "description": f"AbuseIPDB reports this IP with {confidence}% confidence of abuse. Monitor activity closely."
            })
            
    elif source_name == "VirusTotal" and "data" in source:
        stats = source["data"].get("last_analysis_stats", {})
        malicious = stats.get("malicious", 0)
        
        if malicious > 0:
            recommendations.append({
                "priority": "high",
                "title": f"VirusTotal Detections ({malicious})",
                "description": f"VirusTotal reports {malicious} security vendors flagged this IP as malicious. Investigate immediately."
            })
            
    elif source_name == "DNSBL":
        listed_count = source.get("listed_count", 0)
        if listed_count > 2:
            recommendations.append({
                "priority": "high",
                "title": f"Multiple DNSBL Listings ({listed_count})",
                "description": f"IP is listed on {listed_count} DNS blacklists. This indicates serious reputation issues."
            })
        elif listed_count > 0:
            recommendations.append({
                "priority": "medium",
                "title": f"DNSBL Listings ({listed_count})",
                "description": f"IP is listed on {listed_count} DNS blacklist(s). Monitor and consider delisting if appropriate."
            })
    
    return recommendations

# --- Domain Reputation Functions (from reputation_check.py) ---

# Complete list of blacklists from MXToolBox (combined)
BLACKLISTS = [
    # Domain-based blacklists (RHSBL/SURBL)
    {"name": "Nordspam DBL", "service": "dbl.nordspam.com", "type": "domain"},
    {"name": "SEM FRESH", "service": "fresh.spameatingmonkey.net", "type": "domain"},
    {"name": "SEM URI", "service": "uribl.spameatingmonkey.net", "type": "domain"},
    {"name": "SEM URIRED", "service": "urired.spameatingmonkey.net", "type": "domain"},
    {"name": "SORBS RHSBL BADCONF", "service": "rhsbl.sorbs.net", "type": "domain", "listing_type": "badconf"},
    {"name": "SORBS RHSBL NOMAIL", "service": "rhsbl.sorbs.net", "type": "domain", "listing_type": "nomail"},
    {"name": "SURBL multi", "service": "multi.surbl.org", "type": "domain"},

    # IP-based blacklists (DNSBL)
    {"name": "Abusix Mail Intelligence Blacklist", "service": "combined.mail.abusix.zone", "type": "ip"},
    {"name": "Abusix Mail Intelligence Domain Blacklist", "service": "combined-domain.mail.abusix.zone", "type": "domain"}, # Note: Abusix has domain one too
    {"name": "Abusix Mail Intelligence Exploit list", "service": "exploits.mail.abusix.zone", "type": "ip"},
    {"name": "Anonmails DNSBL", "service": "spam.dnsbl.anonmails.de", "type": "ip"},
    {"name": "BACKSCATTERER", "service": "ips.backscatterer.org", "type": "ip"},
    {"name": "BARRACUDA", "service": "b.barracudacentral.org", "type": "ip"},
    {"name": "BLOCKLIST.DE", "service": "bl.blocklist.de", "type": "ip"},
    {"name": "CALIVENT", "service": "calivent.bl.dns-servicios.com", "type": "ip"},
    {"name": "CYMRU BOGONS", "service": "bogons.cymru.com", "type": "ip"},
    {"name": "DAN TOR", "service": "tor.dan.me.uk", "type": "ip"},
    {"name": "DAN TOREXIT", "service": "torexit.dan.me.uk", "type": "ip"},
    # {"name": "DRMX", "service": "dnsbl.dronebl.org", "type": "ip", "listing_type": "drones"}, # Covered by DRONE BL
    {"name": "DRONE BL", "service": "dnsbl.dronebl.org", "type": "ip"},
    {"name": "FABELSOURCES", "service": "bl.fabelsources.it", "type": "ip"},
    # {"name": "HIL", "service": "hil.habeas.com", "type": "ip"}, # Often requires subscription
    # {"name": "HIL2", "service": "hil2.habeas.com", "type": "ip"}, # Often requires subscription
    {"name": "Hostkarma Black", "service": "hostkarma.junkemailfilter.com", "type": "ip", "listing_type": "black"},
    {"name": "IBM DNS Blacklist", "service": "dnsbl.ibm.com", "type": "ip"}, # May require subscription/key
    {"name": "ICMFORBIDDEN", "service": "forbidden.icm.edu.pl", "type": "ip"},
    {"name": "INTERSERVER", "service": "rbl.interserver.net", "type": "ip"},
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
    {"name": "SPAMCOP", "service": "bl.spamcop.net", "type": "ip"},
    {"name": "Spamhaus ZEN", "service": "zen.spamhaus.org", "type": "ip"},
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
    # Some blacklists might require API keys or subscriptions and are commented out
    # e.g., Spamhaus DBL, URIBL, ivm*, IMP*, Sender Score
]

async def check_domain_reputation(domain):
    """
    Check the reputation of a domain by checking various blacklists.
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
        "domain": domain,
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
        if not ips:
            logging.warning(f"Could not resolve IPs for domain {domain}. Proceeding with domain checks only.")
            results["ip_lookup_error"] = "Could not resolve IP addresses for the domain."

        # Create tasks for both domain and IP checks
        domain_task = check_domain_blacklists(domain)
        ip_task = check_ip_blacklists(ips) # Will handle empty list gracefully

        # Run tasks with a timeout
        try:
            # Use gather to run concurrently
            gathered_results = await asyncio.wait_for(
                asyncio.gather(domain_task, ip_task, return_exceptions=True),
                timeout=45 # Increased timeout
            )
            domain_results = gathered_results[0] if not isinstance(gathered_results[0], Exception) else {"domain_services": {}, "error": str(gathered_results[0])}
            ip_results = gathered_results[1] if not isinstance(gathered_results[1], Exception) else {"ip_services": {}, "error": str(gathered_results[1])}

            # Update results
            results.update(domain_results)
            results.update(ip_results)

        except asyncio.TimeoutError:
            logging.warning(f"Timeout while checking blacklists for {domain}")
            # Include partial results if available
            if domain_task.done() and not domain_task.cancelled() and not domain_task.exception():
                 results.update(domain_task.result())
            else:
                 results["domain_check_status"] = "timeout"
            if ip_task.done() and not ip_task.cancelled() and not ip_task.exception():
                 results.update(ip_task.result())
            else:
                 results["ip_check_status"] = "timeout"

            results["timeout"] = True
            results["timeout_message"] = "Blacklist checks timed out. Results may be incomplete."

        # Determine overall blacklist status and count
        blacklisted_services = []
        service_name_map = {bl["service"]: bl["name"] for bl in BLACKLISTS} # Map for friendly names

        # Check domain blacklists
        for service, status in results["domain_services"].items():
            if status == "blacklisted":
                blacklisted_services.append(service_name_map.get(service, service))

        # Check IP blacklists
        for ip, services in results["ip_services"].items():
            for service, status in services.items():
                if "blacklisted" in status:
                    # Extract code if available
                    code_match = status #status.match(/\(code: (\S+)\)/)
                    code_info = f" (code: {code_match})" if code_match else ""
                    blacklisted_services.append(f"{service_name_map.get(service, service)} for IP {ip}{code_info}")


        # Remove duplicates just in case
        results["blacklist_details"] = sorted(list(set(blacklisted_services)))
        results["blacklist_count"] = len(results["blacklist_details"])
        results["blacklisted"] = results["blacklist_count"] > 0

        # Calculate reputation score
        results["reputation_score"] = calculate_reputation_score(results)

        # Generate recommendations based on results
        results["recommendations"] = generate_domain_reputation_recommendations(results)

        # Add service names map for frontend use
        results["service_names"] = service_name_map


        return results

    except Exception as e:
        logging.exception(f"Error checking domain reputation for {domain}: {e}") # Log full traceback
        return {
            "error": f"Unexpected error checking domain reputation: {str(e)}",
            "error_code": "REPUTATION_CHECK_ERROR"
        }

async def resolve_domain_to_ips(domain):
    """
    Resolve a domain name to its IP addresses (A and AAAA).
    """
    ips = []
    resolver = dns.asyncresolver.Resolver()
    resolver.timeout = 5 # Set timeout for DNS resolution
    resolver.lifetime = 5

    async def query(qtype):
        try:
            result = await resolver.resolve(domain, qtype)
            return [r.to_text() for r in result]
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            logging.debug(f"No {qtype} records found for {domain}")
            return []
        except dns.resolver.Timeout:
             logging.warning(f"Timeout resolving {qtype} record for {domain}")
             return ["timeout"] # Indicate timeout
        except Exception as e:
            logging.error(f"Error resolving {qtype} for {domain}: {e}")
            return ["error"] # Indicate error

    # Run A and AAAA lookups concurrently
    results = await asyncio.gather(query('A'), query('AAAA'))

    # Combine results, filtering out 'timeout' or 'error' indicators
    for ip_list in results:
        for ip in ip_list:
            if ip not in ["timeout", "error"]:
                ips.append(ip)

    if not ips:
         # Check if there were timeouts or errors
        if any("timeout" in r for r in results):
             raise DnsLookupError("Timeout resolving IP addresses", "DNS_TIMEOUT_IP")
        if any("error" in r for r in results):
             raise DnsLookupError("Error resolving IP addresses", "DNS_ERROR_IP")
        # If no errors/timeouts but still no IPs, it's genuinely no records
        logging.warning(f"No A or AAAA records found for domain: {domain}")


    return list(set(ips)) # Return unique IPs

async def check_domain_blacklists(domain):
    """
    Check if a domain is on any domain-based blacklists.
    """
    results = {"domain_services": {}}
    domain_blacklists_meta = [bl for bl in BLACKLISTS if bl["type"] == "domain"]
    tasks = []

    for blacklist in domain_blacklists_meta:
        service = blacklist["service"]
        tasks.append(check_single_domain_blacklist(domain, service))

    # Run all tasks concurrently
    service_results = await asyncio.gather(*tasks, return_exceptions=True)

    # Process results
    for i, blacklist in enumerate(domain_blacklists_meta):
        service = blacklist["service"]
        result = service_results[i]
        if isinstance(result, Exception):
            logging.error(f"Error checking domain blacklist {service}: {result}")
            results["domain_services"][service] = "error"
        else:
            results["domain_services"][service] = result

    return results


async def check_single_domain_blacklist(domain, service):
    try:
        logging.debug(f"Checking domain {domain} against {service}")
        lookup = f"{domain}.{service}"
        resolver = dns.asyncresolver.Resolver()
        resolver.timeout = 3.0 # Shorter timeout per service
        resolver.lifetime = 3.0

        try:
            await resolver.resolve(lookup, 'A')
            logging.warning(f"Domain {domain} is blacklisted on {service}")
            return "blacklisted"
        except dns.resolver.NXDOMAIN:
            return "clean"
        except dns.resolver.NoAnswer:
            return "clean" # Treat no answer as clean
        except dns.resolver.Timeout:
            logging.warning(f"Timeout checking domain {service} for {domain}")
            return "timeout"
        except Exception as lookup_error:
            logging.error(f"Error checking domain {service} for {domain}: {lookup_error}")
            return "unknown"
    except Exception as e:
        logging.error(f"Error in check_single_domain_blacklist for {service}: {e}")
        raise # Re-raise to be caught by gather

async def check_ip_blacklists(ips):
    """
    Check if any IP addresses are on common IP-based blacklists. Handles empty IP list.
    """
    results = {"ip_services": {ip: {} for ip in ips}}
    if not ips:
        logging.info("No IPs provided for blacklist check.")
        return results # Return empty results if no IPs

    # Process each IP
    for ip in ips:
        tasks = []
        ip_blacklists_meta = [bl for bl in BLACKLISTS if bl["type"] == "ip"]

        for blacklist in ip_blacklists_meta:
            service = blacklist["service"]
            tasks.append(check_single_ip_blacklist(ip, service))

        # Run all tasks for this IP concurrently
        service_results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results for this IP
        for i, blacklist in enumerate(ip_blacklists_meta):
            service = blacklist["service"]
            result = service_results[i]
            if isinstance(result, Exception):
                logging.error(f"Error checking IP blacklist {service} for IP {ip}: {result}")
                results["ip_services"][ip][service] = "error"
            else:
                results["ip_services"][ip][service] = result

    return results

async def check_single_ip_blacklist(ip, service):
    try:
        logging.debug(f"Checking IP {ip} against {service}")
        reversed_ip = ""
        # Reverse the IP address for the lookup
        if ":" in ip:  # IPv6 - Basic check, full IPv6 reversal is complex
            # Skip blacklists known not to support IPv6 well or at all
            ipv6_unsupported = [
                "bl.spamcop.net",
                 "psbl.surriel.com",
                 "dyna.spamrats.com",
                 "noptr.spamrats.com",
                 "spam.spamrats.com",
                 "ips.backscatterer.org"
            ]
            if service in ipv6_unsupported:
                logging.debug(f"Skipping IPv6 check for {ip} on {service}")
                return "unsupported_ipv6"

            # Attempt basic reversal for common formats, might not work for all IPv6 addresses
            try:
                 addr = socket.inet_pton(socket.AF_INET6, ip)
                 hex_addr = addr.hex()
                 reversed_ip = '.'.join(reversed(hex_addr))
            except socket.error:
                 logging.warning(f"Could not reverse IPv6 {ip} for {service}")
                 return "invalid_ip_format"

        else:  # IPv4
            octets = ip.split('.')
            if len(octets) != 4 or not all(o.isdigit() and 0 <= int(o) <= 255 for o in octets):
                 logging.warning(f"Invalid IPv4 format {ip} for {service}")
                 return "invalid_ip_format"
            reversed_ip = '.'.join(octets[::-1])

        if not reversed_ip:
             return "ip_reversal_failed"

        lookup = f"{reversed_ip}.{service}"
        resolver = dns.asyncresolver.Resolver()
        resolver.timeout = 3.0 # Shorter timeout per service
        resolver.lifetime = 3.0

        try:
            answers = await resolver.resolve(lookup, 'A')
            # If we get here, the IP is blacklisted
            return_code = answers[0].to_text().split('.')[-1] # Get last octet as code
            logging.warning(f"IP {ip} is blacklisted on {service} with code {return_code}")
            return f"blacklisted (code: {return_code})"
        except dns.resolver.NXDOMAIN:
            return "clean"
        except dns.resolver.NoAnswer:
            return "clean" # Treat no answer as clean
        except dns.resolver.Timeout:
            logging.warning(f"Timeout checking IP {service} for IP {ip}")
            return "timeout"
        except Exception as lookup_error:
            logging.error(f"Error checking IP {service} for IP {ip}: {lookup_error}")
            return "unknown"
    except Exception as e:
        logging.error(f"Error in check_single_ip_blacklist for {ip} on {service}: {e}")
        raise # Re-raise


def calculate_reputation_score(results):
    """
    Calculate a reputation score based on blacklist results. More nuanced scoring.
    """
    score = 100
    high_impact_count = 0
    medium_impact_count = 0
    low_impact_count = 0

    # Define blacklist impacts (example, adjust based on real-world impact)
    high_impact = ["zen.spamhaus.org", "b.barracudacentral.org", "bl.spamcop.net", "psbl.surriel.com", "bl.mailspike.net"]
    medium_impact = ["combined.mail.abusix.zone", "spam.rbl.msrbl.net", "dnsbl-1.uceprotect.net", "multi.surbl.org", "dbl.nordspam.com"]

    service_name_map = {bl["service"]: bl["name"] for bl in BLACKLISTS}

    # Check domain listings
    for service, status in results.get("domain_services", {}).items():
        if status == "blacklisted":
            if service in high_impact: high_impact_count += 1
            elif service in medium_impact: medium_impact_count += 1
            else: low_impact_count += 1

    # Check IP listings
    for ip, services in results.get("ip_services", {}).items():
        for service, status in services.items():
            if "blacklisted" in status:
                if service in high_impact: high_impact_count += 1
                elif service in medium_impact: medium_impact_count += 1
                else: low_impact_count += 1

    # Apply deductions (example logic)
    score -= high_impact_count * 20 # Heavy penalty
    score -= medium_impact_count * 10 # Medium penalty
    score -= low_impact_count * 5 # Low penalty

    # Bonus for being clean
    if high_impact_count == 0 and medium_impact_count == 0 and low_impact_count == 0:
        pass # Keep 100
    # Minimum score cap
    score = max(0, score)

    return score


def generate_domain_reputation_recommendations(results):
    """
    Generate recommendations based on domain blacklist check results.
    """
    recommendations = []
    if results.get("blacklisted"):
        recommendations.append({
            "priority": "high",
            "title": "Address Blacklisting Issues",
            "description": f"Your domain or associated IPs are listed on {results['blacklist_count']} blacklists. This can severely impact email deliverability. Review the 'Blacklist Details' section."
        })
        recommendations.append({
            "priority": "medium",
            "title": "Identify Root Cause",
            "description": "Investigate why your domain/IPs were listed. Common causes include sending spam (check for compromised accounts/servers), poor email list hygiene, or misconfigured email authentication."
        })
        recommendations.append({
            "priority": "medium",
            "title": "Request Delisting",
            "description": "Once the root cause is fixed, follow the delisting procedures for each specific blacklist. This often involves visiting the blacklist's website."
        })
    else:
        recommendations.append({
            "priority": "low",
            "title": "Maintain Good Sending Practices",
            "description": "Your domain/IPs are not currently on major blacklists. Continue using good email practices: use double opt-in for lists, monitor bounce rates, authenticate emails (SPF, DKIM, DMARC), and handle unsubscribes promptly."
        })

    if results.get("timeout"):
         recommendations.append({
             "priority": "warning",
             "title": "Incomplete Check",
             "description": "Some blacklist checks timed out. Monitor your reputation regularly as the results may be incomplete."
         })
    if results.get("ip_lookup_error"):
         recommendations.append({
             "priority": "warning",
             "title": "IP Resolution Failed",
             "description": "Could not resolve IPs for the domain. IP-based blacklist checks were skipped. Ensure the domain has valid A/AAAA records."
         })

    return recommendations

def generate_ip_reputation_recommendations(results):
    """Generate recommendations based on IP reputation results."""
    recommendations = []
    if results.get("blacklisted"):
        recommendations.append({
            "priority": "high",
            "title": "IP Address Blacklisted",
            "description": f"The IP address {results.get('ip')} is listed on {results['blacklist_count']} blacklists. This can impact email deliverability for all domains sending from this IP."
        })
        recommendations.append({
             "priority": "medium",
             "title": "Investigate IP Activity",
             "description": "Check sending logs from this IP for spam or suspicious activity. If it's a shared IP, contact your hosting provider."
         })
        recommendations.append({
             "priority": "medium",
             "title": "Request IP Delisting",
             "description": "Identify the blacklists involved (see details) and follow their delisting procedures after addressing the root cause."
         })
    else:
        recommendations.append({
            "priority": "low",
            "title": "IP Reputation Clean",
            "description": f"The IP address {results.get('ip')} is not currently found on major blacklists checked."
        })

    return recommendations