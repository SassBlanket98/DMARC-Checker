import asyncio  # Enables asynchronous programming in Python
import dns.asyncresolver  # Use asynchronous DNS resolver for handling async tasks
import logging  # Provides logging functionality for debugging

# Configure logging to display debug information
logging.basicConfig(level=logging.DEBUG)

# ---------------------------- DMARC Record Lookup ----------------------------
async def get_dmarc_record(domain):
    """
    Fetch the DMARC record for a given domain.

    Args:
        domain (str): The domain name to query.

    Returns:
        dict: DMARC record and parsed data, or an error message.
    """
    try:
        logging.debug(f"Starting DMARC lookup for domain: {domain}")
        resolver = dns.asyncresolver.Resolver()
        result = await resolver.resolve(f"_dmarc.{domain}", 'TXT')
        records = [record.to_text() for record in result]

        if not records:
            logging.warning(f"No DMARC record found for domain: {domain}")
            return {"error": "No DMARC record found"}

        logging.info(f"DMARC records found for {domain}: {records}")
        return {"dmarc_records": records, "parsed_record": parse_dmarc(records[0])}

    except dns.resolver.NoAnswer:
        logging.warning(f"No DMARC record found for domain: {domain}")
        return {"error": "No DMARC record found"}
    except dns.resolver.NXDOMAIN:
        logging.error(f"Domain does not exist: {domain}")
        return {"error": f"Domain {domain} does not exist"}
    except dns.resolver.Timeout:
        logging.error(f"Timeout while resolving DMARC record for domain: {domain}")
        return {"error": "Timeout while resolving DMARC record"}
    except Exception as e:
        logging.error(f"Unexpected error fetching DMARC record for domain {domain}: {e}")
        return {"error": f"Internal server error: {str(e)}"}

# ----------------------------- SPF Record Lookup -----------------------------
async def get_spf_record(domain):
    """
    Fetch the SPF record for a given domain.

    Args:
        domain (str): The domain name to query.

    Returns:
        dict: SPF record and parsed data, or an error message.
    """
    try:
        logging.debug(f"Starting SPF lookup for domain: {domain}")
        resolver = dns.asyncresolver.Resolver()
        result = await resolver.resolve(domain, 'TXT')

        for record in result:
            if "v=spf1" in record.to_text():
                logging.info(f"SPF record found for {domain}: {record.to_text()}")
                return {"parsed_record": parse_spf(record.to_text()), "spf_record": record.to_text()}

        logging.warning(f"No SPF record found for domain: {domain}")
        return {"error": "No SPF record found"}
    except dns.resolver.NoAnswer:
        logging.warning(f"No SPF record found for domain: {domain}")
        return {"error": "No SPF record found"}
    except dns.resolver.NXDOMAIN:
        logging.error(f"Domain does not exist: {domain}")
        return {"error": f"Domain {domain} does not exist"}
    except dns.resolver.Timeout:
        logging.error(f"Timeout while resolving SPF record for domain: {domain}")
        return {"error": "Timeout while resolving SPF record"}
    except Exception as e:
        logging.error(f"Unexpected error fetching SPF record for domain {domain}: {e}")
        return {"error": f"Internal server error: {str(e)}"}

# ----------------------------- DKIM Record Lookup ----------------------------
async def get_all_dkim_records(domain, selectors=None):
    """
    Fetch all DKIM records for the provided selectors and domain.

    Args:
        domain (str): The domain name to query.
        selectors (list): A list of DKIM selectors to query. Defaults to common selectors if not provided.

    Returns:
        dict: A dictionary containing DKIM records and parsed data, or errors for each selector.
    """
    # Log inputs for debugging
    logging.debug(f"Raw input - Domain: {domain}, Selectors: {selectors}")

    # Validate the domain
    if not domain or not isinstance(domain, str):
        raise ValueError("Invalid domain. Must be a non-empty string.")

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

    for selector in selectors:
        try:
            # Log the start of the DKIM lookup process
            logging.debug(f"Starting DKIM lookup for selector {selector} on domain {domain}")

            # Perform the DNS TXT record lookup for the DKIM selector
            result = await resolver.resolve(f"{selector}._domainkey.{domain}", 'TXT')

            # Extract and parse the DKIM records from the result
            dkim_records = [record.to_text() for record in result]
            logging.info(f"DKIM record(s) found for {selector}.{domain}: {dkim_records}")

            # Store the successful result in the results dictionary
            results[selector] = {
                "dkim_records": dkim_records,
                "parsed_records": [parse_dkim(record) for record in dkim_records if record],
                "status": "success",
            }

        except dns.resolver.NoAnswer:
            # Handle cases where no DKIM record is found for the selector
            logging.warning(f"No DKIM record found for {selector}.{domain}")
            results[selector] = {"error": f"No DKIM record found for {selector}.{domain}", "status": "error"}
        except dns.resolver.NXDOMAIN:
            # Handle cases where the domain does not exist
            logging.error(f"Domain does not exist: {domain}")
            results[selector] = {"error": f"Domain {domain} does not exist", "status": "error"}
        except dns.resolver.Timeout:
            # Handle cases where the DNS query times out
            logging.error(f"Timeout while resolving DKIM record for {selector}.{domain}")
            results[selector] = {"error": "Timeout while resolving DKIM record", "status": "error"}
        except Exception as e:
            # Handle any unexpected errors
            logging.error(f"Unexpected error fetching DKIM record for {selector}.{domain}: {e}")
            results[selector] = {"error": f"Internal server error: {str(e)}", "status": "error"}

    # Return the results for all selectors
    return results



# ----------------------------- All DNS Records Lookup -----------------------------
async def get_all_dns_records(domain):
    """
    Fetch all DNS records (A, AAAA, MX, TXT) for a given domain.

    Args:
        domain (str): The domain name to query.

    Returns:
        dict: Parsed DNS records, or an error message.
    """
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
        return {"parsed_record": parsed}
    except dns.resolver.NXDOMAIN:
        logging.error(f"Domain does not exist: {domain}")
        return {"error": f"Domain {domain} does not exist"}
    except dns.resolver.Timeout:
        logging.error(f"Timeout while resolving DNS records for domain: {domain}")
        return {"error": "Timeout while resolving DNS records"}
    except Exception as e:
        logging.error(f"Unexpected error fetching DNS records for domain {domain}: {e}")
        return {"error": f"Internal server error: {str(e)}"}

# ----------------------------- Parsing Functions -----------------------------
def parse_dmarc(dmarc_record):
    """Parse a DMARC record into a dictionary"""
    parsed = {}
    try:
        parts = dmarc_record.split(";")
        for part in parts:
            key_value = part.strip().split("=", 1)
            if len(key_value) == 2:
                parsed[key_value[0].strip()] = key_value[1].strip()
    except Exception as e:
        logging.error(f"Error parsing DMARC record: {e}")
    return parsed or {"error": "Failed to parse DMARC record"}

def parse_spf(spf_record):
    """Parse an SPF record into a dictionary"""
    parsed = {}
    try:
        parts = spf_record.split()
        for part in parts:
            if "=" in part:
                key_value = part.split("=", 1)
                parsed[key_value[0].strip()] = key_value[1].strip()
            else:
                parsed[part.strip()] = None
    except Exception as e:
        logging.error(f"Error parsing SPF record: {e}")
    return parsed or {"error": "Failed to parse SPF record"}

def parse_dns(dns_records):
    """Parse DNS records into a dictionary"""
    try:
        parsed = {}
        for record_type, record_list in dns_records.items():
            parsed[record_type] = [f"Record: {r}" for r in record_list]
        return parsed
    except Exception as e:
        logging.error(f"Error parsing DNS records: {e}")
        return {"error": "Failed to parse DNS records"}

def parse_dkim(dkim_record):
    """Parse a DKIM record into a dictionary"""
    parsed = {}
    try:
        parts = dkim_record.split(";")
        for part in parts:
            key_value = part.strip().split("=", 1)
            if len(key_value) == 2:
                parsed[key_value[0].strip()] = key_value[1].strip()
    except Exception as e:
        logging.error(f"Error parsing DKIM record: {e}")
    return parsed or {"error": "Failed to parse DKIM record"}
