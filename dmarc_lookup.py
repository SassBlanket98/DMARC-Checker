import dns.asyncresolver  # Use asynchronous DNS resolver for handling async tasks
import logging  # Provides logging functionality for debugging
import asyncio  # Enables asynchronous programming in Python

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
async def get_dkim_record(selector, domain):
    """
    Fetch the DKIM record for a given selector and domain.

    Args:
        selector (str): The DKIM selector.
        domain (str): The domain name to query.

    Returns:
        dict: DKIM record and parsed data, or an error message.
    """
    try:
        logging.debug(f"Starting DKIM lookup for selector {selector} on domain {domain}")
        resolver = dns.asyncresolver.Resolver()
        result = await resolver.resolve(f"{selector}._domainkey.{domain}", 'TXT')

        for record in result:
            dkim_text = record.to_text()
            logging.info(f"DKIM record found for {selector}.{domain}: {dkim_text}")
            return {"dkim_record": dkim_text, "parsed_record": parse_dkim(dkim_text)}

        logging.warning(f"No DKIM record found for {selector}.{domain}")
        return {"error": f"No DKIM record found for {selector}.{domain}", "parsed_record": {}}
    except dns.resolver.NoAnswer:
        logging.warning(f"No DKIM record found for {selector}.{domain}")
        return {"error": f"No DKIM record found for {selector}.{domain}", "parsed_record": {}}
    except dns.resolver.NXDOMAIN:
        logging.error(f"Domain does not exist: {domain}")
        return {"error": f"Domain {domain} does not exist", "parsed_record": {}}
    except dns.resolver.Timeout:
        logging.error(f"Timeout while resolving DKIM record for {selector}.{domain}")
        return {"error": "Timeout while resolving DKIM record", "parsed_record": {}}
    except Exception as e:
        logging.error(f"Unexpected error fetching DKIM record for {selector}.{domain}: {e}")
        return {"error": f"Internal server error: {str(e)}", "parsed_record": {}}

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


# Parsing functions
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
    """Parse a SPF record into a dictionary"""
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
    """Parse a DNS record into a dictionary"""
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

    