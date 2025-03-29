# Create this as auth_verification.py

import asyncio
import logging
import dns.asyncresolver
from error_handling import DomainError, DnsLookupError, RecordParsingError
import dmarc_lookup  # Import the existing DMARC lookup module

# Configure logging
logging.basicConfig(level=logging.DEBUG)

async def verify_spf_setup(domain):
    """
    Verify SPF record setup for a domain.
    
    Args:
        domain (str): The domain to verify
        
    Returns:
        dict: Verification results including status, recommendations, etc.
    """
    try:
        # Use the existing SPF lookup function
        spf_data = await dmarc_lookup.get_spf_record(domain)
        
        # If there's an error, return it
        if "error" in spf_data:
            return {
                "status": "error",
                "error": spf_data["error"],
                "error_code": spf_data.get("error_code", "SPF_ERROR"),
                "suggestions": spf_data.get("suggestions", []),
                "recommendations": [
                    {
                        "title": "Add SPF Record",
                        "description": "Your domain doesn't have an SPF record. Add an SPF record to specify which mail servers are authorized to send email from your domain.",
                        "priority": "high"
                    }
                ]
            }
        
        # SPF record exists, analyze it
        spf_record = spf_data.get("spf_record", "")
        parsed_record = spf_data.get("parsed_record", {})
        
        # Initialize result
        result = {
            "status": "success",
            "spf_record": spf_record,
            "parsed_record": parsed_record,
            "recommendations": []
        }
        
        # Check for -all or ~all
        if "-all" not in spf_record and "~all" not in spf_record and "?all" not in spf_record and "+all" not in spf_record:
            result["recommendations"].append({
                "title": "Add 'all' Mechanism",
                "description": "Your SPF record is missing an 'all' mechanism, which defines what happens with emails from unauthorized sources. Add '-all' (recommended) or '~all' to your SPF record.",
                "priority": "high"
            })
        elif "+all" in spf_record:
            result["status"] = "warning"
            result["recommendations"].append({
                "title": "Remove '+all' Mechanism",
                "description": "Your SPF record uses '+all', which allows ANY server to send email as your domain. This is a serious security risk. Change to '-all' immediately.",
                "priority": "high"
            })
        elif "?all" in spf_record:
            result["status"] = "warning"
            result["recommendations"].append({
                "title": "Strengthen 'all' Mechanism",
                "description": "Your SPF record uses '?all', which is a neutral policy that doesn't provide much protection. Consider using '~all' or '-all' instead.",
                "priority": "medium"
            })
        elif "~all" in spf_record:
            result["recommendations"].append({
                "title": "Consider Stronger 'all' Mechanism",
                "description": "Your SPF record uses '~all' (soft fail). For stronger protection, consider changing to '-all' (hard fail) once you've verified all legitimate sources are included.",
                "priority": "low"
            })
        
        # Check for include: mechanism
        if "include" not in parsed_record and "ip4" not in parsed_record and "ip6" not in parsed_record and "a" not in parsed_record and "mx" not in parsed_record:
            result["status"] = "warning"
            result["recommendations"].append({
                "title": "Add Sending Sources",
                "description": "Your SPF record doesn't specify any sending sources. Add 'include:', 'ip4:', 'ip6:', 'a', or 'mx' mechanisms to authorize your email servers.",
                "priority": "high"
            })
        
        # Check for too many DNS lookups
        if "include" in parsed_record and (isinstance(parsed_record["include"], list) and len(parsed_record["include"]) > 10):
            result["status"] = "warning"
            result["recommendations"].append({
                "title": "Too Many DNS Lookups",
                "description": "Your SPF record has many 'include' statements which may exceed the 10 DNS lookup limit. Consider consolidating or using macros.",
                "priority": "medium"
            })
        
        return result
        
    except Exception as e:
        logging.error(f"Error verifying SPF for {domain}: {e}")
        return {
            "status": "error",
            "error": f"Error verifying SPF record: {str(e)}",
            "error_code": "SPF_VERIFICATION_ERROR",
            "suggestions": ["Please try again later."]
        }

async def verify_dkim_setup(domain, selectors):
    """
    Verify DKIM setup for a domain.
    
    Args:
        domain (str): The domain to verify
        selectors (str or list): DKIM selector(s) to check
        
    Returns:
        dict: Verification results including status, recommendations, etc.
    """
    try:
        # Convert single selector to list
        if isinstance(selectors, str):
            selector_list = [selectors]
        else:
            selector_list = selectors
        
        # Use the existing DKIM lookup function
        dkim_data = await dmarc_lookup.get_all_dkim_records(domain, selector_list)
        
        # Initialize result
        result = {
            "status": "error",  # Default to error, will be updated if a valid record is found
            "domain": domain,
            "selectors_checked": selector_list,
            "valid_selectors": [],
            "selector_results": {},
            "recommendations": []
        }
        
        # Process results for each selector
        for selector, selector_data in dkim_data.items():
            # Skip non-selector keys
            if selector in ["overall_status", "recommendations", "suggestions"]:
                continue
                
            # Store result for this selector
            result["selector_results"][selector] = {
                "status": selector_data.get("status", "error"),
                "error": selector_data.get("error", ""),
                "records": selector_data.get("dkim_records", [])
            }
            
            # If this selector has valid records, update the result status
            if selector_data.get("status") == "success" and selector_data.get("dkim_records"):
                result["status"] = "success"
                result["valid_selectors"].append(selector)
        
        # Add recommendations based on the results
        if not result["valid_selectors"]:
            result["recommendations"].append({
                "title": "Configure DKIM",
                "description": "No valid DKIM records found for any of the checked selectors. Configure DKIM with your email provider and add the necessary DNS records.",
                "priority": "high"
            })
        elif len(result["valid_selectors"]) == 1:
            result["recommendations"].append({
                "title": "Consider Multiple DKIM Selectors",
                "description": "You have one valid DKIM selector. For better key rotation and security, consider configuring multiple DKIM selectors.",
                "priority": "low"
            })
        
        return result
        
    except Exception as e:
        logging.error(f"Error verifying DKIM for {domain} with selectors {selectors}: {e}")
        return {
            "status": "error",
            "error": f"Error verifying DKIM records: {str(e)}",
            "error_code": "DKIM_VERIFICATION_ERROR",
            "suggestions": ["Please try again later."]
        }

async def verify_dmarc_setup(domain):
    """
    Verify DMARC setup for a domain.
    
    Args:
        domain (str): The domain to verify
        
    Returns:
        dict: Verification results including status, recommendations, etc.
    """
    try:
        # Use the existing DMARC lookup function
        dmarc_data = await dmarc_lookup.get_dmarc_record(domain)
        
        # If there's an error, return it
        if "error" in dmarc_data:
            return {
                "status": "error",
                "error": dmarc_data["error"],
                "error_code": dmarc_data.get("error_code", "DMARC_ERROR"),
                "suggestions": dmarc_data.get("suggestions", []),
                "recommendations": [
                    {
                        "title": "Add DMARC Record",
                        "description": "Your domain doesn't have a DMARC record. Add a DMARC record to specify how receiving servers should handle emails that fail authentication.",
                        "priority": "high"
                    }
                ]
            }
        
        # DMARC record exists, analyze it
        dmarc_records = dmarc_data.get("dmarc_records", [])
        parsed_record = dmarc_data.get("parsed_record", {})
        
        # Initialize result
        result = {
            "status": "success",
            "dmarc_records": dmarc_records,
            "parsed_record": parsed_record,
            "recommendations": []
        }
        
        # Check for policy
        policy = parsed_record.get("p", "none")
        if policy == "none":
            result["status"] = "warning"
            result["recommendations"].append({
                "title": "Strengthen DMARC Policy",
                "description": "Your DMARC policy is set to 'none', which only monitors emails without taking action. Consider upgrading to 'quarantine' or 'reject' once you've verified legitimate emails pass authentication.",
                "priority": "medium"
            })
        
        # Check for reporting URI
        if "rua" not in parsed_record:
            result["status"] = "warning"
            result["recommendations"].append({
                "title": "Add Aggregate Reporting",
                "description": "Your DMARC record doesn't include an aggregate report URI (rua tag). Add this to receive reports about emails that fail DMARC checks.",
                "priority": "medium"
            })
        
        # Check if only a subdomain policy is specified
        if "p" not in parsed_record and "sp" in parsed_record:
            result["status"] = "warning"
            result["recommendations"].append({
                "title": "Add Domain Policy",
                "description": "Your DMARC record specifies a subdomain policy (sp) but not a domain policy (p). Add a 'p' tag to specify the policy for your main domain.",
                "priority": "high"
            })
        
        return result
        
    except Exception as e:
        logging.error(f"Error verifying DMARC for {domain}: {e}")
        return {
            "status": "error",
            "error": f"Error verifying DMARC record: {str(e)}",
            "error_code": "DMARC_VERIFICATION_ERROR",
            "suggestions": ["Please try again later."]
        }

def calculate_overall_auth_status(records):
    """
    Calculate the overall email authentication status based on individual record statuses.
    
    Args:
        records (dict): Dictionary of verification results for each record type
        
    Returns:
        dict: Overall status information
    """
    # Initialize counters
    success_count = 0
    warning_count = 0
    error_count = 0
    
    # Count the number of each status type
    for record_type, record_data in records.items():
        status = record_data.get("status", "error")
        if status == "success":
            success_count += 1
        elif status == "warning":
            warning_count += 1
        else:
            error_count += 1
    
    # Determine overall status
    if success_count == 3:  # All three authentication methods are successful
        overall_status = "success"
        status_message = "Complete Email Authentication"
        description = "Your domain has all three email authentication methods (SPF, DKIM, DMARC) properly configured."
    elif success_count + warning_count == 3:  # All methods are at least configured with warnings
        overall_status = "warning"
        status_message = "Partial Email Authentication"
        description = "Your domain has all authentication methods configured, but some could be improved."
    elif success_count > 0:  # At least one method is successfully configured
        overall_status = "warning"
        status_message = "Incomplete Email Authentication"
        description = "Your domain has some authentication methods configured, but not all three."
    else:  # No methods are successfully configured
        overall_status = "error"
        status_message = "Missing Email Authentication"
        description = "Your domain doesn't have any of the email authentication methods properly configured."
    
    # Create recommendations based on the status
    recommendations = []
    
    if records.get("spf", {}).get("status") != "success":
        recommendations.append({
            "title": "Configure SPF",
            "description": "Set up SPF to specify which mail servers can send email from your domain.",
            "priority": "high",
            "record_type": "spf"
        })
    
    if records.get("dkim", {}).get("status") != "success":
        recommendations.append({
            "title": "Configure DKIM",
            "description": "Set up DKIM to digitally sign emails sent from your domain.",
            "priority": "high",
            "record_type": "dkim"
        })
    
    if records.get("dmarc", {}).get("status") != "success":
        recommendations.append({
            "title": "Configure DMARC",
            "description": "Set up DMARC to tell receiving servers how to handle emails that fail authentication.",
            "priority": "high",
            "record_type": "dmarc"
        })
    
    # Add any additional recommendations from individual records
    for record_type, record_data in records.items():
        if "recommendations" in record_data:
            for rec in record_data["recommendations"]:
                rec["record_type"] = record_type
                recommendations.append(rec)
    
    return {
        "status": overall_status,
        "message": status_message,
        "description": description,
        "authentication_methods": {
            "spf": records.get("spf", {}).get("status", "error"),
            "dkim": records.get("dkim", {}).get("status", "error"),
            "dmarc": records.get("dmarc", {}).get("status", "error")
        },
        "recommendations": recommendations
    }