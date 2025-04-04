# dmarc_lookup.py (Consolidated with auth_verification.py)

import asyncio
import dns.asyncresolver
import logging
import datetime
from error_handling import (
    DmarcError, DomainError, DnsLookupError, RecordParsingError,
    handle_dns_exception
)

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# --- Parsing Functions (from original dmarc_lookup.py) ---

def parse_dmarc(dmarc_record):
    """
    Parse a DMARC record into a dictionary with enhanced error handling.

    Args:
        dmarc_record (str): The DMARC record to parse.

    Returns:
        dict: Parsed DMARC record as a dictionary.

    Raises:
        RecordParsingError: If the record cannot be parsed.
    """
    parsed = {}
    try:
        if not dmarc_record.startswith('"v=DMARC1'):
             # Handle case where record doesn't start with quotes
            if dmarc_record.startswith('v=DMARC1'):
                 pass # Allow records without surrounding quotes
            else:
                logging.warning(f"Invalid DMARC record format: {dmarc_record}")
                parsed["warning"] = "Record doesn't start with v=DMARC1 which may indicate format issues"

        # Remove surrounding quotes if present before splitting
        clean_record = dmarc_record.strip()
        if clean_record.startswith('"') and clean_record.endswith('"'):
            clean_record = clean_record[1:-1]

        parts = clean_record.split(";")
        for part in parts:
            key_value = part.strip().split("=", 1)
            if len(key_value) == 2:
                parsed[key_value[0].strip()] = key_value[1].strip()

        # Validate required fields
        if 'p' not in parsed:
            parsed["warning"] = "Required policy (p) tag missing"
    except Exception as e:
        logging.error(f"Error parsing DMARC record: {e}")
        raise RecordParsingError(
            f"Failed to parse DMARC record: {str(e)}",
            "DMARC_PARSE_ERROR",
            ["The DMARC record format appears to be invalid."]
        )
    return parsed or {"error": "Failed to parse DMARC record"}


def parse_spf(spf_record):
    """
    Parse an SPF record into a dictionary with enhanced error handling.

    Args:
        spf_record (str): The SPF record to parse.

    Returns:
        dict: Parsed SPF record as a dictionary.

    Raises:
        RecordParsingError: If the record cannot be parsed.
    """
    parsed = {}
    try:
        # Clean up the input record - remove quotes if present
        clean_record = spf_record.strip()
        if clean_record.startswith('"') and clean_record.endswith('"'):
            clean_record = clean_record[1:-1]

        if not clean_record.startswith("v=spf1"):
            logging.warning(f"Invalid SPF record format: {clean_record}")
            parsed["warning"] = "Record doesn't start with v=spf1 which may indicate format issues"

        # Split the record into parts
        parts = clean_record.split()

        # Track if we've found an 'all' mechanism
        found_all = False

        # Process each part of the record
        for part in parts:
            if "=" in part:
                # Handle key=value pairs
                key_value = part.split("=", 1)
                parsed[key_value[0].strip()] = key_value[1].strip()
            elif part.startswith("include:"):
                # Handle include directives
                include_domain = part.split(":", 1)[1]
                if "include" not in parsed:
                    parsed["include"] = []
                parsed["include"].append(include_domain)
            elif part in ["-all", "~all", "?all", "+all"]:
                # Handle 'all' mechanisms
                parsed[part] = "Specified"
                found_all = True
            elif part.startswith("ip4:") or part.startswith("ip6:"):
                # Handle IP specifications
                prefix, value = part.split(":", 1)
                if prefix not in parsed:
                    parsed[prefix] = []
                parsed[prefix].append(value)
            elif part in ["mx", "a", "ptr"]:
                # Handle simple mechanisms
                parsed[part] = "Specified"
            else:
                # Handle unknown or special directives
                parsed[part] = "Specified"

        # Check for all mechanism
        if not found_all:
            parsed["warning"] = "No 'all' mechanism found. SPF record should end with an all mechanism"

    except Exception as e:
        logging.error(f"Error parsing SPF record: {e}")
        raise RecordParsingError(
            f"Failed to parse SPF record: {str(e)}",
            "SPF_PARSE_ERROR",
            ["The SPF record format appears to be invalid."]
        )
    return parsed or {"error": "Failed to parse SPF record"}

def parse_dns(dns_records):
    """
    Parse DNS records into a dictionary with enhanced error handling.

    Args:
        dns_records (dict): The DNS records to parse.

    Returns:
        dict: Parsed DNS records.

    Raises:
        RecordParsingError: If the records cannot be parsed.
    """
    try:
        parsed = {}
        for record_type, record_list in dns_records.items():
             # Ensure record_list is iterable
            if isinstance(record_list, list):
                parsed[record_type] = [f"Record: {r}" for r in record_list]
            elif record_list: # Handle potential non-list but truthy values
                parsed[record_type] = [f"Record: {str(record_list)}"]
            else:
                 parsed[record_type] = []


        # Add some analysis
        if 'MX' in dns_records and dns_records['MX']:
            parsed['email_providers'] = analyze_mx_records(dns_records['MX'])

        return parsed
    except Exception as e:
        logging.error(f"Error parsing DNS records: {e}")
        raise RecordParsingError(
            f"Failed to parse DNS records: {str(e)}",
            "DNS_PARSE_ERROR",
            ["Error occurred while analyzing DNS records."]
        )

def parse_dkim(dkim_record):
    """
    Parse a DKIM record into a dictionary with enhanced error handling.

    Args:
        dkim_record (str): The DKIM record to parse.

    Returns:
        dict: Parsed DKIM record as a dictionary.

    Raises:
        RecordParsingError: If the record cannot be parsed.
    """
    parsed = {}
    try:
        # Remove surrounding quotes if present before checking/parsing
        clean_record = dkim_record.strip()
        if clean_record.startswith('"') and clean_record.endswith('"'):
            clean_record = clean_record[1:-1]

        if 'v=DKIM1' not in clean_record:
            logging.warning(f"Invalid DKIM record format (missing v=DKIM1): {clean_record}")
            parsed["warning"] = "Record doesn't contain v=DKIM1 which may indicate format issues"

        parts = clean_record.split(";")
        for part in parts:
            key_value = part.strip().split("=", 1)
            if len(key_value) == 2:
                parsed[key_value[0].strip()] = key_value[1].strip()

        # Check for required fields
        if 'p' not in parsed:
            parsed["warning"] = "Required public key (p) tag missing"

    except Exception as e:
        logging.error(f"Error parsing DKIM record: {e}")
        raise RecordParsingError(
            f"Failed to parse DKIM record: {str(e)}",
            "DKIM_PARSE_ERROR",
            ["The DKIM record format appears to be invalid."]
        )
    return parsed or {"error": "Failed to parse DKIM record"}

def analyze_mx_records(mx_records):
    """
    Analyze MX records to identify email providers.

    Args:
        mx_records (list): List of MX records.

    Returns:
        list: List of identified email providers.
    """
    providers = []
    if not isinstance(mx_records, list): # Add check if mx_records is a list
        return providers

    for record in mx_records:
        if not isinstance(record, str): # Ensure record is a string
            continue
        record_lower = record.lower()

        if 'google' in record_lower or 'gmail' in record_lower:
            providers.append("Google Workspace / Gmail")
        elif 'microsoft' in record_lower or 'outlook' in record_lower:
            providers.append("Microsoft 365 / Exchange Online")
        elif 'amazonses' in record_lower or 'aws' in record_lower:
            providers.append("Amazon SES")
        elif 'zoho' in record_lower:
            providers.append("Zoho Mail")
        elif 'protonmail' in record_lower:
            providers.append("ProtonMail")
        elif 'mailchimp' in record_lower:
            providers.append("Mailchimp")
        elif 'sendgrid' in record_lower:
            providers.append("SendGrid")

    # Remove duplicates and return
    return list(set(providers))

# --- DNS Lookup Functions (from original dmarc_lookup.py) ---

async def get_dmarc_record(domain):
    """
    Fetch the DMARC record for a given domain with enhanced error handling.
    """
    if not domain:
        raise DomainError(
            "Domain parameter is required",
            "MISSING_DOMAIN",
            ["Please provide a domain name to check."]
        )

    try:
        logging.debug(f"Starting DMARC lookup for domain: {domain}")
        resolver = dns.asyncresolver.Resolver()
        result = await resolver.resolve(f"_dmarc.{domain}", 'TXT')
        records = [record.to_text() for record in result]

        if not records:
            logging.warning(f"No DMARC record found for domain: {domain}")
            return {
                "error": "No DMARC record found",
                "error_code": "DMARC_NOT_FOUND",
                "suggestions": [
                    "Your domain doesn't have a DMARC policy configured.",
                    "Consider adding a DMARC record (_dmarc.yourdomain.com) to improve email security.",
                    "Start with a monitoring policy (p=none) to avoid disrupting email flow."
                ]
            }

        logging.info(f"DMARC records found for {domain}: {records}")
        parsed_record = parse_dmarc(records[0])

        # Add security recommendations based on parsed record
        recommendations = []
        if parsed_record.get('p') == 'none':
            recommendations.append(
                "Your DMARC policy is set to 'none', which only monitors emails without taking action. "
                "Consider upgrading to 'quarantine' or 'reject' once you've verified legitimate emails pass."
            )

        if not parsed_record.get('rua'):
            recommendations.append(
                "No aggregate report URI (rua) specified. Consider adding this to receive reports about emails "
                "that fail DMARC checks."
            )

        return {
            "dmarc_records": records,
            "parsed_record": parsed_record,
            "recommendations": recommendations if recommendations else None
        }

    except dns.resolver.NoAnswer:
        logging.warning(f"No DMARC record found for domain: {domain}")
        return {
            "error": "No DMARC record found",
            "error_code": "DMARC_NOT_FOUND",
            "suggestions": [
                "Your domain doesn't have a DMARC policy configured.",
                "Consider adding a DMARC record (_dmarc.yourdomain.com) to improve email security.",
                "Start with a monitoring policy (p=none) to avoid disrupting email flow."
            ]
        }
    except dns.resolver.NXDOMAIN:
        logging.error(f"Domain does not exist: {domain}")
        return {
            "error": f"Domain {domain} does not exist",
            "error_code": "DOMAIN_NOT_FOUND",
            "suggestions": [
                "Check for typos in the domain name.",
                "Verify that the domain is properly registered and has DNS configured."
            ]
        }
    except dns.resolver.Timeout:
        logging.error(f"Timeout while resolving DMARC record for domain: {domain}")
        return {
            "error": "Timeout while resolving DMARC record",
            "error_code": "DNS_TIMEOUT",
            "suggestions": [
                "This could be a temporary network issue. Try again later.",
                "The domain's authoritative DNS servers might be experiencing problems."
            ]
        }
    except Exception as e:
        logging.error(f"Unexpected error fetching DMARC record for domain {domain}: {e}")
        # Return structured error, but don't expose raw exception message directly
        return {
            "error": "An internal server error occurred during DMARC lookup.",
            "error_code": "INTERNAL_DMARC_ERROR",
            "suggestions": ["Please try again later or contact support."]
        }


async def get_spf_record(domain):
    """
    Fetch the SPF record for a given domain with enhanced error handling.
    """
    if not domain:
        raise DomainError(
            "Domain parameter is required",
            "MISSING_DOMAIN",
            ["Please provide a domain name to check."]
        )

    try:
        logging.debug(f"Starting SPF lookup for domain: {domain}")
        resolver = dns.asyncresolver.Resolver()
        result = await resolver.resolve(domain, 'TXT')

        for record in result:
            record_text = record.to_text()
            if "v=spf1" in record_text:
                logging.info(f"SPF record found for {domain}: {record_text}")
                parsed_record = parse_spf(record_text)

                # Add security recommendations based on parsed content
                recommendations = []
                if "~all" in record_text:
                    recommendations.append(
                        "Your SPF record uses a soft fail (~all). Consider using a hard fail (-all) "
                        "for stronger protection once you've verified legitimate sources."
                    )
                elif "?all" in record_text:
                    recommendations.append(
                        "Your SPF record uses a neutral policy (?all) which doesn't provide much protection. "
                        "Consider using ~all or -all instead."
                    )
                elif "+all" in record_text:
                    recommendations.append(
                        "WARNING: Your SPF record uses +all which allows ANY server to send email as your domain. "
                        "This is a serious security risk. Change to -all immediately."
                    )

                if record_text.count("include:") > 10:
                    recommendations.append(
                        "Your SPF record has many include statements which may exceed the 10 DNS lookup limit. "
                        "Consider consolidating or using macros."
                    )

                return {
                    "parsed_record": parsed_record,
                    "spf_record": record_text,
                    "recommendations": recommendations if recommendations else None
                }

        logging.warning(f"No SPF record found for domain: {domain}")
        return {
            "error": "No SPF record found",
            "error_code": "SPF_NOT_FOUND",
            "suggestions": [
                "Your domain doesn't have an SPF policy configured.",
                "Consider adding an SPF record to protect against email spoofing.",
                "Basic SPF example: 'v=spf1 include:_spf.google.com ~all'"
            ]
        }
    except dns.resolver.NoAnswer:
        logging.warning(f"No SPF record found for domain: {domain}")
        return {
            "error": "No SPF record found",
            "error_code": "SPF_NOT_FOUND",
            "suggestions": [
                "Your domain doesn't have an SPF policy configured.",
                "Consider adding an SPF record to protect against email spoofing.",
                "Basic SPF example: 'v=spf1 include:_spf.google.com ~all'"
            ]
        }
    except dns.resolver.NXDOMAIN:
        logging.error(f"Domain does not exist: {domain}")
        return {
            "error": f"Domain {domain} does not exist",
            "error_code": "DOMAIN_NOT_FOUND",
            "suggestions": [
                "Check for typos in the domain name.",
                "Verify that the domain is properly registered and has DNS configured."
            ]
        }
    except dns.resolver.Timeout:
        logging.error(f"Timeout while resolving SPF record for domain: {domain}")
        return {
            "error": "Timeout while resolving SPF record",
            "error_code": "DNS_TIMEOUT",
            "suggestions": [
                "This could be a temporary network issue. Try again later.",
                "The domain's authoritative DNS servers might be experiencing problems."
            ]
        }
    except Exception as e:
        logging.error(f"Unexpected error fetching SPF record for domain {domain}: {e}")
        return {
            "error": "An internal server error occurred during SPF lookup.",
             "error_code": "INTERNAL_SPF_ERROR",
             "suggestions": ["Please try again later or contact support."]
        }


async def get_all_dkim_records(domain, selectors=None):
    """
    Fetch all DKIM records for the provided selectors and domain with enhanced error handling.
    """
    # Log inputs for debugging
    logging.debug(f"Raw input - Domain: {domain}, Selectors: {selectors}")

    # Validate the domain
    if not domain or not isinstance(domain, str):
        raise DomainError(
            "Invalid domain. Must be a non-empty string.",
            "INVALID_DOMAIN",
            ["Please provide a valid domain name."]
        )

    # Handle missing or invalid selectors
    if selectors is None:
        selectors = ["default", "google", "selector1", "selector2", "email", "dkim1"]  # Default selectors
    elif not isinstance(selectors, list) or not all(isinstance(sel, str) and sel.strip() for sel in selectors):
        logging.error(f"Invalid selectors received: {selectors}")
        raise ValueError("Invalid selectors. Must be a list of non-empty strings.")

    # Log validated selectors
    logging.debug(f"Validated selectors: {selectors}")

    results = {}  # To store results for each selector
    resolver = dns.asyncresolver.Resolver()

    valid_selector_found = False  # Track if at least one valid selector is found

    for selector in selectors:
        try:
            # Log the start of the DKIM lookup process
            logging.debug(f"Starting DKIM lookup for selector {selector} on domain {domain}")

            # Perform the DNS TXT record lookup for the DKIM selector
            result = await resolver.resolve(f"{selector}._domainkey.{domain}", 'TXT')

            # Extract and parse the DKIM records from the result
            dkim_records = [record.to_text() for record in result]
            logging.info(f"DKIM record(s) found for {selector}.{domain}: {dkim_records}")

            valid_selector_found = True

            # Store the successful result in the results dictionary
            results[selector] = {
                "dkim_records": dkim_records,
                "parsed_records": [parse_dkim(record) for record in dkim_records if record],
                "status": "success",
            }

        except dns.resolver.NoAnswer:
            # Handle cases where no DKIM record is found for the selector
            logging.warning(f"No DKIM record found for {selector}.{domain}")
            results[selector] = {
                "error": f"No DKIM record found for selector '{selector}'",
                "error_code": "DKIM_SELECTOR_NOT_FOUND",
                "status": "error",
                "suggestions": [
                    f"The selector '{selector}' is not configured for your domain.",
                    "Check with your email service provider for the correct selector name."
                ]
            }
        except dns.resolver.NXDOMAIN:
            # Handle cases where the domain does not exist (or the _domainkey subdomain)
            logging.error(f"DKIM domain/subdomain does not exist: {selector}._domainkey.{domain}")
            results[selector] = {
                "error": f"DKIM domain/subdomain not found for selector '{selector}'",
                "error_code": "DKIM_DOMAIN_NOT_FOUND",
                "status": "error",
                "suggestions": [
                    f"Check if the selector '{selector}' is correct.",
                    f"Verify that the DNS record '{selector}._domainkey.{domain}' exists."
                ]
            }
        except dns.resolver.Timeout:
            # Handle cases where the DNS query times out
            logging.error(f"Timeout while resolving DKIM record for {selector}.{domain}")
            results[selector] = {
                "error": f"Timeout resolving DKIM for selector '{selector}'",
                "error_code": "DNS_TIMEOUT",
                "status": "error",
                "suggestions": [
                    "This could be a temporary network issue. Try again later.",
                    "The domain's authoritative DNS servers might be experiencing problems."
                ]
            }
        except Exception as e:
            # Handle any unexpected errors
            logging.error(f"Unexpected error fetching DKIM record for {selector}.{domain}: {e}")
            results[selector] = {
                "error": f"Error fetching DKIM for selector '{selector}'",
                "error_code": "INTERNAL_DKIM_ERROR",
                "status": "error",
                "suggestions": ["Please try again later."]
            }

    # Add overall recommendations if no valid DKIM selectors were found
    if not valid_selector_found:
        results["overall_status"] = "error"
        results["recommendations"] = [
            "No DKIM records were found for any of the selectors tried.",
            "Contact your email service provider to set up DKIM for your domain.",
            "Common selectors include: google, selector1, selector2, default, dkim"
        ]
    else:
        results["overall_status"] = "success"

    # Return the results for all selectors
    return results

async def get_all_dns_records(domain):
    """
    Fetch all DNS records (A, AAAA, MX, TXT) for a given domain with enhanced error handling.
    """
    if not domain:
        raise DomainError(
            "Domain parameter is required",
            "MISSING_DOMAIN",
            ["Please provide a domain name to check."]
        )

    records = {}
    resolver = dns.asyncresolver.Resolver()

    try:
        for record_type in ['A', 'AAAA', 'MX', 'TXT']:
            try:
                result = await resolver.resolve(domain, record_type)
                records[record_type] = [r.to_text() for r in result]
                logging.info(f"{record_type} records for {domain}: {records[record_type]}")
            except dns.resolver.NoAnswer:
                logging.warning(f"No {record_type} records found for {domain}")
                records[record_type] = []
            # Don't catch NXDOMAIN here, let the outer handler catch it if the base domain doesn't exist

        parsed = parse_dns(records)

        # Add recommendations based on DNS record analysis
        recommendations = []

        # Check for MX records
        if not records.get('MX') or len(records.get('MX', [])) == 0:
            recommendations.append(
                "No MX records found. If you need to receive email for this domain, "
                "you should configure MX records."
            )

        # Check for excessive TXT records
        if len(records.get('TXT', [])) > 10:
            recommendations.append(
                "Your domain has a large number of TXT records. Consider reviewing them "
                "to ensure they're all necessary."
            )

        return {
            "parsed_record": parsed,
            "recommendations": recommendations if recommendations else None
        }
    except dns.resolver.NXDOMAIN:
        logging.error(f"Domain does not exist: {domain}")
        return {
            "error": f"Domain {domain} does not exist",
            "error_code": "DOMAIN_NOT_FOUND",
            "suggestions": [
                "Check for typos in the domain name.",
                "Verify that the domain is properly registered and has DNS configured."
            ]
        }
    except dns.resolver.Timeout:
        logging.error(f"Timeout while resolving DNS records for domain: {domain}")
        return {
            "error": "Timeout while resolving DNS records",
            "error_code": "DNS_TIMEOUT",
            "suggestions": [
                "This could be a temporary network issue. Try again later.",
                "The domain's authoritative DNS servers might be experiencing problems."
            ]
        }
    except Exception as e:
        logging.error(f"Unexpected error fetching DNS records for domain {domain}: {e}")
        return {
            "error": "An internal server error occurred during DNS lookup.",
             "error_code": "INTERNAL_DNS_ERROR",
             "suggestions": ["Please try again later or contact support."]
        }

# --- Verification Functions (from original auth_verification.py) ---

async def verify_spf_setup(domain):
    """
    Verify SPF record setup for a domain.
    """
    try:
        # Use the existing SPF lookup function
        spf_data = await get_spf_record(domain)

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
    """
    try:
        # Convert single selector to list or use default if none provided
        if isinstance(selectors, str):
            selector_list = [selectors]
        elif isinstance(selectors, list):
             selector_list = selectors
        else:
             # If selectors is None or invalid, try common ones
             selector_list = ["google", "selector1", "default", "zoho", "mail", "dkim", "20221201", "amazonses"]

        # Use the existing DKIM lookup function
        dkim_data = await get_all_dkim_records(domain, selector_list)

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
    """
    try:
        # Use the existing DMARC lookup function
        dmarc_data = await get_dmarc_record(domain)

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
             # Ensure recommendations is a list before iterating
            individual_recs = record_data["recommendations"]
            if isinstance(individual_recs, list):
                for rec in individual_recs:
                     # Ensure rec is a dictionary before accessing keys
                    if isinstance(rec, dict):
                        rec["record_type"] = record_type
                        recommendations.append(rec)
                    else:
                         logging.warning(f"Skipping invalid recommendation format in {record_type}: {rec}")
            else:
                logging.warning(f"Skipping non-list recommendations in {record_type}")

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