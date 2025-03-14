import asyncio
import dns.asyncresolver
import logging
from error_handling import (
    DmarcError, DomainError, DnsLookupError, RecordParsingError,
    handle_dns_exception
)

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# ---------------------------- DMARC Record Lookup ----------------------------
async def get_dmarc_record(domain):
    """
    Fetch the DMARC record for a given domain with enhanced error handling.

    Args:
        domain (str): The domain name to query.

    Returns:
        dict: DMARC record and parsed data, or an error message.
        
    Raises:
        DomainError: If the domain parameter is invalid.
        DnsLookupError: If there's an error during DNS lookup.
        RecordParsingError: If the DMARC record cannot be parsed.
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
        return {"error": f"Internal server error: {str(e)}"}

# ----------------------------- SPF Record Lookup -----------------------------
async def get_spf_record(domain):
    """
    Fetch the SPF record for a given domain with enhanced error handling.

    Args:
        domain (str): The domain name to query.

    Returns:
        dict: SPF record and parsed data, or an error message.
        
    Raises:
        DomainError: If the domain parameter is invalid.
        DnsLookupError: If there's an error during DNS lookup.
        RecordParsingError: If the SPF record cannot be parsed.
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
        return {"error": f"Internal server error: {str(e)}"}

# ----------------------------- DKIM Record Lookup ----------------------------
async def get_all_dkim_records(domain, selectors=None):
    """
    Fetch all DKIM records for the provided selectors and domain with enhanced error handling.

    Args:
        domain (str): The domain name to query.
        selectors (list): A list of DKIM selectors to query. Defaults to common selectors if not provided.

    Returns:
        dict: A dictionary containing DKIM records and parsed data, or errors for each selector.
        
    Raises:
        DomainError: If the domain parameter is invalid.
        ValueError: If the selectors are invalid.
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
                "error": f"No DKIM record found for {selector}.{domain}",
                "error_code": "DKIM_SELECTOR_NOT_FOUND",
                "status": "error",
                "suggestions": [
                    f"The selector '{selector}' is not configured for your domain.",
                    "Check with your email service provider for the correct selector name."
                ]
            }
        except dns.resolver.NXDOMAIN:
            # Handle cases where the domain does not exist
            logging.error(f"Domain does not exist: {domain}")
            results[selector] = {
                "error": f"Domain {domain} does not exist",
                "error_code": "DOMAIN_NOT_FOUND",
                "status": "error",
                "suggestions": [
                    "Check for typos in the domain name.",
                    "Verify that the domain is properly registered and has DNS configured."
                ]
            }
        except dns.resolver.Timeout:
            # Handle cases where the DNS query times out
            logging.error(f"Timeout while resolving DKIM record for {selector}.{domain}")
            results[selector] = {
                "error": "Timeout while resolving DKIM record",
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
                "error": f"Internal server error: {str(e)}",
                "error_code": "INTERNAL_ERROR",
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

# ----------------------------- All DNS Records Lookup -----------------------------
async def get_all_dns_records(domain):
    """
    Fetch all DNS records (A, AAAA, MX, TXT) for a given domain with enhanced error handling.

    Args:
        domain (str): The domain name to query.

    Returns:
        dict: Parsed DNS records, or an error message.
        
    Raises:
        DomainError: If the domain parameter is invalid.
        DnsLookupError: If there's an error during DNS lookup.
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
            "error": f"Internal server error: {str(e)}",
            "error_code": "INTERNAL_ERROR",
            "suggestions": ["Please try again later."]
        }

# ----------------------------- Parsing Functions -----------------------------
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
            logging.warning(f"Invalid DMARC record format: {dmarc_record}")
            parsed["warning"] = "Record doesn't start with v=DMARC1 which may indicate format issues"
            
        parts = dmarc_record.split(";")
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
            parsed[record_type] = [f"Record: {r}" for r in record_list]
            
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
        if 'v=DKIM1' not in dkim_record:
            logging.warning(f"Invalid DKIM record format (missing v=DKIM1): {dkim_record}")
            parsed["warning"] = "Record doesn't contain v=DKIM1 which may indicate format issues"
            
        parts = dkim_record.split(";")
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
    
    for record in mx_records:
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