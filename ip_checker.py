import aiohttp
import asyncio
import logging
import json
from error_handling import DmarcError

async def get_ip_info(ip_address=None):
    """
    Fetch information about an IP address using multiple fallback services.
    
    Args:
        ip_address (str, optional): The IP address to check. If None, returns the client's IP.
        
    Returns:
        dict: Information about the IP address
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
                        if 'error' in data:
                            logging.warning(f"Primary IP API error: {data.get('error')}, trying fallback...")
                            # Don't return error here, try fallback instead
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
                                    "latitude": 0,
                                    "longitude": 0
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

def format_ipapi_response(data):
    """Format response from ipapi.co"""
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
        "recommendations": get_ip_recommendations("IPv4" if "." in data.get('ip', '') else "IPv6")
    }

def format_ipinfo_response(data):
    """Format response from ipinfo.io"""
    # ipinfo.io returns location as "lat,lng"
    loc = data.get('loc', '0,0').split(',')
    lat = float(loc[0]) if len(loc) > 0 else 0
    lng = float(loc[1]) if len(loc) > 1 else 0
    
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
        "asn": data.get('asn'),
        "recommendations": get_ip_recommendations("IPv4" if "." in data.get('ip', '') else "IPv6")
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
    Check the reputation of an IP address.
    
    Args:
        ip_address (str): The IP address to check
        
    Returns:
        dict: Reputation information for the IP address
    """
    try:
        # For demonstration, return static reputation data
        # In production, you would connect to a real IP reputation service
        return {
            "reputation_score": 85,  # Example score (higher is better)
            "reports": 0,
            "last_reported": None,
            "is_listed": False,
            "categories": [],
            "recommendations": [
                {
                    "priority": "low",
                    "title": "Monitoring Best Practices",
                    "description": "Regularly monitor your IP reputation to ensure it remains in good standing."
                }
            ]
        }
    except Exception as e:
        logging.exception(f"Error in check_ip_reputation: {e}")
        return {
            "error": f"Error checking IP reputation: {str(e)}",
            "error_code": "IP_REPUTATION_ERROR",
            "suggestions": ["Please try again later"]
        }

async def get_complete_ip_info(ip_address=None):
    """
    Get complete information about an IP address including basic info and reputation.
    
    Args:
        ip_address (str, optional): The IP address to check
        
    Returns:
        dict: Complete information about the IP address
    """
    # Get basic IP information
    ip_info = await get_ip_info(ip_address)
    
    # Check if there was an error getting IP info
    if "error" in ip_info:
        return ip_info
    
    # Get IP reputation
    reputation_info = await check_ip_reputation(ip_info["ip"])
    
    # Combine the information
    combined_info = {**ip_info}
    
    if "error" not in reputation_info:
        combined_info["reputation"] = reputation_info
        # Merge recommendations
        if "recommendations" in reputation_info:
            combined_info["recommendations"].extend(reputation_info["recommendations"])
    else:
        combined_info["reputation_error"] = reputation_info["error"]
    
    return combined_info