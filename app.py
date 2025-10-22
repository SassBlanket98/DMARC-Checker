# app.py - Updated Version

import asyncio
import sys
import logging
import ip_checker
import email_tester
import auth_verification
import datetime
import os  # <-- Make sure os is imported
import aiohttp # <-- Make sure aiohttp is imported
import re # <-- Import re for email validation

# --- Load environment variables ---
# If using python-dotenv locally, uncomment the next two lines
from dotenv import load_dotenv
load_dotenv()
# ----------------------------------

# Windows-specific setup
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from flask import Flask, request, jsonify, render_template # <-- Ensure Flask components are imported
import dmarc_lookup
import domain_intel
import reputation_check
from concurrent.futures import ThreadPoolExecutor
from error_handling import (
    api_error_handler,
    configure_enhanced_logging,
    handle_dmarc_error,
    handle_spf_error,
    handle_dkim_error,
    DomainError
)
from auth_verification import verify_spf_setup, verify_dkim_setup, verify_dmarc_setup, calculate_overall_auth_status

logging.getLogger('werkzeug').setLevel(logging.INFO)

# Configure enhanced logging
configure_enhanced_logging()

# Initialize the Flask application
app = Flask(__name__,
            static_folder='static',
            template_folder='templates')

# Get HIBP API key from environment variable
HIBP_API_KEY = os.getenv('HIBP_API_KEY') # <-- Loads the API Key

# Create a new asyncio event loop for asynchronous operations
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)

# Thread pool executor to handle async operations
executor = ThreadPoolExecutor(4)

# Utility Functions
def run_async(func, *args):
    """
    Execute an asynchronous function from a synchronous context.

    Args:
        func (coroutine): The asynchronous function to execute.
        *args: Arguments to pass to the async function.

    Returns:
        The result of the asynchronous function.
    """
    try:
        # Ensure the current thread has an event loop
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(current_loop)

        coroutine = func(*args)
        # Use the loop associated with the current context if available,
        # otherwise fall back to the globally set loop
        active_loop = current_loop if current_loop.is_running() else loop
        return active_loop.run_until_complete(coroutine)

    except Exception as e:
        logging.error(f"Error running async function {func.__name__}: {e}")
        raise

def format_record_data(record_type, data):
    """
    Format record data into a structured response format.

    Args:
        record_type (str): The type of DNS record (e.g., dmarc, spf, dkim, dns, reputation).
        data (dict): Data retrieved for the specified record type.

    Returns:
        dict: A formatted dictionary containing the record's title, value, parsed record details,
              and status.
    """
    if "error" in data:
        return {
            "title": record_type.upper(),
            "value": data,
            "status": "error",
            "parsed_record": {}
        }

    # Special handling for DKIM records
    if record_type == "dkim":
        valid_dkim_found = False
        for selector_data in data.values():
            if isinstance(selector_data, dict) and selector_data.get("status") == "success":
                if "dkim_records" in selector_data and selector_data["dkim_records"]:
                    valid_dkim_found = True
                    break

        status = "success" if valid_dkim_found else "error"

        return {
            "title": record_type.upper(),
            "value": data,
            "parsed_record": {}, # DKIM parsing happens differently, often client-side based on raw value
            "status": status,
        }

    # Special handling for reputation data
    if record_type == "reputation":
        status = "success"
        # Consider reputation check an 'error' for scoring if blacklisted
        if data.get("blacklisted", False):
             status = "error"

        return {
            "title": record_type.upper(),
            "value": data,
            # Include all data in parsed_record for easier frontend access
            "parsed_record": data,
            "status": status,
        }

    # Default handling for other record types
    parsed_record = data.get("parsed_record", {}) if record_type in ["dmarc", "spf", "dns"] else {}

    return {
        "title": record_type.upper(),
        "value": data,
        "parsed_record": parsed_record,
        "status": "success",
    }


def is_valid_domain(domain):
    """
    Validate domain format.

    Args:
        domain (str): Domain to validate

    Returns:
        bool: True if valid, False otherwise
    """
    # Basic domain validation regex
    pattern = r'^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
    return bool(re.match(pattern, domain))

def is_valid_ip(ip):
    """
    Validate IP address format.

    Args:
        ip (str): IP address to validate

    Returns:
        bool: True if valid, False otherwise
    """
    # IPv4 pattern
    ipv4_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
    # Simplified IPv6 pattern (adjust if needed for more complex IPv6 cases)
    ipv6_pattern = r'^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}::?){1,7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|:((:[0-9a-fA-F]{1,4}){1,7}|:)$|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}$|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])$|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])$'

    return bool(re.match(ipv4_pattern, ip)) or bool(re.match(ipv6_pattern, ip))


# --- API Routes ---
@app.route("/api/overview", methods=["GET"])
@api_error_handler
def overview():
    """
    Fetch and format an overview of DNS records for a given domain.

    Query Parameters:
        domain (str): The domain name to fetch records for.

    Returns:
        JSON: A collection of formatted DNS records (dmarc, spf, dkim, dns, reputation).
    """
    domain = request.args.get("domain")
    if not domain:
        raise DomainError(
            "Domain parameter is required",
            "MISSING_DOMAIN",
            ["Please provide a domain name to check."]
        )

    # Validate domain format
    if not is_valid_domain(domain):
        raise DomainError(
            f"Invalid domain format: {domain}",
            "INVALID_DOMAIN_FORMAT",
            [
                "Domain should be in a valid format (e.g., example.com).",
                "Domain should not include protocols or paths (no http://, www., etc.)."
            ]
        )

    # Fetch all types of DNS records asynchronously
    # Using run_async to ensure they run within the Flask context correctly
    dmarc_data = run_async(dmarc_lookup.get_dmarc_record, domain)
    spf_data = run_async(dmarc_lookup.get_spf_record, domain)
    dkim_data = run_async(dmarc_lookup.get_all_dkim_records, domain) # Use default selectors
    dns_data = run_async(dmarc_lookup.get_all_dns_records, domain)
    reputation_data = run_async(reputation_check.check_domain_reputation, domain)

    # Aggregate all records into a response
    overview_data = {
        "records": [
            format_record_data("dmarc", dmarc_data),
            format_record_data("spf", spf_data),
            format_record_data("dkim", dkim_data),
            format_record_data("dns", dns_data),
            format_record_data("reputation", reputation_data),
        ]
    }

    return jsonify(overview_data)

@app.route("/api/<record_type>", methods=["GET"])
@api_error_handler
def get_record(record_type):
    """
    Retrieve data for a specific DNS record type.

    URL Parameters:
        record_type (str): The type of DNS record to fetch (e.g., dmarc, spf, dkim, dns, reputation).

    Query Parameters:
        domain (str): The domain name to fetch records for.
        selectors (str, optional): A comma-separated list of selectors for DKIM.

    Returns:
        JSON: The record data for the specified record type.
    """
    # Retrieve and validate parameters
    domain = request.args.get("domain")
    raw_selectors = request.args.get("selectors", "")

    if not domain:
        raise DomainError(
            "Domain parameter is required",
            "MISSING_DOMAIN",
            ["Please provide a domain name to check."]
        )

    # Validate domain format
    if not is_valid_domain(domain):
        raise DomainError(
            f"Invalid domain format: {domain}",
            "INVALID_DOMAIN_FORMAT",
            [
                "Domain should be in a valid format (e.g., example.com).",
                "Domain should not include protocols or paths (no http://, www., etc.)."
            ]
        )

    # Validate record type
    valid_record_types = ["dmarc", "spf", "dkim", "dns", "reputation"]
    if record_type not in valid_record_types:
        raise DomainError(
            f"Unsupported record type: {record_type}",
            "INVALID_RECORD_TYPE",
            [f"Supported record types are: {', '.join(valid_record_types)}"]
        )

    # Parse selectors into a list if provided
    selectors = [sel.strip() for sel in raw_selectors.split(",") if sel.strip()] or None

    # Log the received parameters for debugging
    logging.debug(f"Processing request - Domain: {domain}, Record Type: {record_type}, Selectors: {selectors}")

    data = {}
    try:
        # Fetch the appropriate record type with enhanced error handling
        if record_type == "dmarc":
            data = run_async(dmarc_lookup.get_dmarc_record, domain)
            if "error" in data:
                 return jsonify(handle_dmarc_error(domain, Exception(data["error"]))), 404 # Adjust based on error handling
        elif record_type == "spf":
             data = run_async(dmarc_lookup.get_spf_record, domain)
             if "error" in data:
                 return jsonify(handle_spf_error(domain, Exception(data["error"]))), 404
        elif record_type == "dkim":
            data = run_async(dmarc_lookup.get_all_dkim_records, domain, selectors)
            # Check if all selectors failed if selectors were provided
            if selectors:
                all_failed = True
                # Check if data is a dict before iterating
                if isinstance(data, dict):
                    for selector in selectors:
                         selector_data = data.get(selector, {})
                         # Ensure selector_data is a dict before accessing get()
                         if isinstance(selector_data, dict) and selector_data.get("status") == "success":
                             all_failed = False
                             break
                if all_failed:
                     logging.warning(f"No DKIM records found for specified selectors on domain: {domain}")
                     if isinstance(data, dict): # Ensure data is a dict before modifying
                        data["suggestions"] = [
                            "No DKIM records were found for any of the provided selectors.",
                            "Try different selectors specific to your email provider.",
                            "Common selectors include: google, default, selector1, selector2"
                        ]
                     else: # Handle case where data might not be a dict (e.g., error string)
                         data = {"error": "DKIM lookup failed for specified selectors", "suggestions": [
                            "No DKIM records were found for any of the provided selectors.",
                            "Try different selectors specific to your email provider.",
                            "Common selectors include: google, default, selector1, selector2"
                            ]}


        elif record_type == "dns":
            data = run_async(dmarc_lookup.get_all_dns_records, domain)
        elif record_type == "reputation":
            data = run_async(reputation_check.check_domain_reputation, domain)
            # Ensure the data is properly structured for parsing if no error
            if isinstance(data, dict) and "error" not in data:
                # Avoid in-place mutation to keep typing/tools happy
                data = {**data, "parsed_record": dict(data)}


        # Return the fetched data as a JSON response
        return jsonify(data)

    except Exception as e:
        # Handle potential errors during async execution or other issues
        logging.exception(f"Error processing request for {record_type} on {domain}: {e}")
        # Try to use specific error handlers if possible, otherwise generic
        error_response = {}
        if record_type == "dmarc":
            error_response = handle_dmarc_error(domain, e)
        elif record_type == "spf":
             error_response = handle_spf_error(domain, e)
        elif record_type == "dkim":
             selector_str = ", ".join(selectors) if selectors else "default selectors"
             error_response = handle_dkim_error(domain, selector_str, e)
        else: # Generic handler for dns, reputation, or unexpected errors
             error_response = {
                 "error": f"An error occurred fetching {record_type} record: {str(e)}",
                 "error_code": "INTERNAL_SERVER_ERROR",
                 "suggestions": ["Please try again later."]
             }
        return jsonify(error_response), 500


@app.route("/api/reputation", methods=["GET"])
@api_error_handler
def check_reputation():
    """
    Check the reputation of a domain.

    Query Parameters:
        domain (str): The domain name to check.

    Returns:
        JSON: Domain reputation information.
    """
    domain = request.args.get("domain")
    if not domain:
        raise DomainError(
            "Domain parameter is required",
            "MISSING_DOMAIN",
            ["Please provide a domain name to check."]
        )

    # Validate domain format
    if not is_valid_domain(domain):
        raise DomainError(
            f"Invalid domain format: {domain}",
            "INVALID_DOMAIN_FORMAT",
            [
                "Domain should be in a valid format (e.g., example.com).",
                "Domain should not include protocols or paths (no http://, www., etc.)."
            ]
        )

    # Fetch reputation data
    reputation_data = run_async(reputation_check.check_domain_reputation, domain)

    # Add parsed_record to ensure consistency with overview endpoint if no error
    if isinstance(reputation_data, dict) and "error" not in reputation_data:
        # Avoid in-place mutation to keep typing/tools happy
        reputation_data = {**reputation_data, "parsed_record": dict(reputation_data)}

    return jsonify(reputation_data)

@app.route("/api/ip-info", methods=["GET"])
@api_error_handler
def get_ip_info():
    """
    Get information about an IP address.

    Query Parameters:
        ip (str, optional): The IP address to check. If not provided, returns information about the client's IP.

    Returns:
        JSON: Information about the IP address.
    """
    # Get the IP address from query parameters
    ip_address = request.args.get("ip")

    # Get the client's IP address if no IP was provided
    if not ip_address:
        # Try to get real IP even when behind a proxy
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)

        # If we have multiple IPs in X-Forwarded-For, take the first one
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()

        # Fallback to remote_addr if still empty
        if not ip_address:
            ip_address = request.remote_addr

    # Validate IP format if an address was found or obtained
    if ip_address and not is_valid_ip(ip_address):
        raise DomainError(
            f"Invalid IP address format: {ip_address}",
            "INVALID_IP_FORMAT",
            [
                "IP address should be in a valid IPv4 or IPv6 format.",
                "IPv4 example: 192.168.1.1",
                "IPv6 example: 2001:0db8:85a3:0000:0000:8a2e:0370:7334"
            ]
        )

    # Get IP information (pass None if we couldn't determine IP)
    ip_info = run_async(ip_checker.get_complete_ip_info, ip_address if ip_address else None)

    return jsonify(ip_info)


@app.route("/api/domain-intel", methods=["GET"])
@api_error_handler
def get_domain_intel():
    """
    Aggregate domain intelligence from configured providers (e.g., stealer logs, credential leaks).

    Query Parameters:
        domain (str): The domain name to search for.

    Returns:
        JSON: Provider-by-provider results and a summary of findings.
    """
    domain = request.args.get("domain")
    if not domain:
        raise DomainError(
            "Domain parameter is required",
            "MISSING_DOMAIN",
            ["Please provide a domain name to check."],
        )

    # Validate domain format
    if not is_valid_domain(domain):
        raise DomainError(
            f"Invalid domain format: {domain}",
            "INVALID_DOMAIN_FORMAT",
            [
                "Domain should be in a valid format (e.g., example.com)",
                "Domain should not include protocols or paths (no http://, www., etc.)",
            ],
        )

    # Run provider queries asynchronously
    try:
        intel_data = run_async(domain_intel.search_domain_intel, domain)
        return jsonify(intel_data)
    except Exception as e:
        logging.exception(f"Error fetching domain intel for {domain}: {e}")
        return (
            jsonify(
                {
                    "error": f"An error occurred fetching domain intelligence: {str(e)}",
                    "error_code": "DOMAIN_INTEL_ERROR",
                    "suggestions": [
                        "Please try again later",
                        "Ensure any required provider API keys are configured on the server",
                    ],
                }
            ),
            500,
        )


@app.route("/api/email-test", methods=["POST"])
@api_error_handler
def test_email_deliverability():
    """
    Test email deliverability.

    Request JSON body:
        from_email (str): Sender email address
        domain (str): Domain to test
        test_type (str, optional): Type of test (basic or advanced)
        from_name (str, optional): Sender name (for advanced test)
        subject (str, optional): Email subject (for advanced test)
        content (str, optional): Email content (for advanced test)
        test_email (str, optional): Email to send test to (for advanced test)
        simulate (bool, optional): If true, simulates the test without sending email.

    Returns:
        JSON: Email deliverability test results including score, recommendations, etc.
    """
    # Get JSON data from request
    if not request.is_json:
        raise DomainError(
            "Request must be JSON",
            "INVALID_REQUEST_FORMAT",
            ["Please send a properly formatted JSON request."]
        )

    test_data = request.get_json()

    # Validate the input data before running the test
    try:
        email_tester.validate_test_data(test_data)
    except email_tester.ValidationError as e:
         return jsonify({
            "error": e.message,
            "error_code": e.error_code,
            "suggestions": e.suggestions
        }), 400

    # Run the test asynchronously
    try:
        result = run_async(email_tester.run_email_test, test_data)
        return jsonify(result)
    except email_tester.SmtpError as e:
        return jsonify({
            "error": e.message,
            "error_code": e.error_code,
            "suggestions": e.suggestions
        }), 500
    except Exception as e:
        logging.exception(f"Unexpected error in email test: {e}")
        return jsonify({
            "error": f"An unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR",
            "suggestions": [
                "Please try again later.",
                "If the problem persists, contact support."
            ]
        }), 500


@app.route("/api/verify-auth", methods=["POST"])
@api_error_handler
def verify_auth_setup_route(): # Renamed function to avoid conflict
    """
    Verify email authentication setup (SPF, DKIM, DMARC) for a domain.

    Request JSON body:
        domain (str): Domain to verify
        record_type (str, optional): Specific record type to verify (spf, dkim, dmarc, or all)
        dkim_selector (str or list, optional): DKIM selector(s) to check (if record_type is dkim or all)

    Returns:
        JSON: Verification results including status, recommendations, etc.
    """
    # Get JSON data from request
    if not request.is_json:
        raise DomainError(
            "Request must be JSON",
            "INVALID_REQUEST_FORMAT",
            ["Please send a properly formatted JSON request."]
        )

    verify_data = request.get_json()

    # Validate domain
    domain = verify_data.get("domain")
    if not domain:
        raise DomainError(
            "Domain parameter is required",
            "MISSING_DOMAIN",
            ["Please provide a domain name to verify."]
        )

    # Validate domain format
    if not is_valid_domain(domain):
        raise DomainError(
            f"Invalid domain format: {domain}",
            "INVALID_DOMAIN_FORMAT",
            [
                "Domain should be in a valid format (e.g., example.com).",
                "Domain should not include protocols or paths (no http://, www., etc.)."
            ]
        )

    # Determine what to verify
    record_type = verify_data.get("record_type", "all").lower()

    # Check specific verification types
    if record_type == "spf":
        result = run_async(verify_spf_setup, domain)
        return jsonify(result)

    elif record_type == "dkim":
        # Get DKIM selector(s) if provided
        dkim_selectors = verify_data.get("dkim_selector") or verify_data.get("selectors")
        if not dkim_selectors:
            raise DomainError(
                "DKIM selector(s) are required for DKIM verification",
                "MISSING_DKIM_SELECTOR",
                ["Please provide at least one DKIM selector to verify."]
            )
         # Ensure selectors are a list
        if isinstance(dkim_selectors, str):
            dkim_selectors = [s.strip() for s in dkim_selectors.split(',') if s.strip()]


        result = run_async(verify_dkim_setup, domain, dkim_selectors)
        return jsonify(result)

    elif record_type == "dmarc":
        result = run_async(verify_dmarc_setup, domain)
        return jsonify(result)

    elif record_type == "all":
        # Verify all authentication methods
        result = {
            "domain": domain,
            "verification_date": datetime.datetime.now().isoformat(),
            "records": {}
        }

        # Run all verification checks
        result["records"]["spf"] = run_async(verify_spf_setup, domain)

        # For DKIM, try common selectors if none explicitly provided
        dkim_selectors = verify_data.get("dkim_selector") or verify_data.get("selectors")
        if not dkim_selectors:
            dkim_selectors = ["google", "selector1", "default", "zoho", "mail", "dkim", "k1", "amazonses"] # Expanded list
        elif isinstance(dkim_selectors, str):
             dkim_selectors = [s.strip() for s in dkim_selectors.split(',') if s.strip()]


        dkim_results = run_async(verify_dkim_setup, domain, dkim_selectors)
        result["records"]["dkim"] = dkim_results

        result["records"]["dmarc"] = run_async(verify_dmarc_setup, domain)

        # Calculate overall status based on the verified records
        result["overall_status"] = calculate_overall_auth_status(result["records"])

        return jsonify(result)

    else:
        raise DomainError(
            f"Invalid record type: {record_type}",
            "INVALID_RECORD_TYPE",
            ["Valid record types are: spf, dkim, dmarc, all"]
        )


# --- HIBP CHECKER API ROUTE ---
@app.route("/api/check-pwned", methods=["GET"])
@api_error_handler
def check_pwned(): # <-- REMOVE async from here
    """
    Check if an email address has been involved in known data breaches using HIBP API.

    Query Parameters:
        email (str): The email address to check.

    Returns:
        JSON: Breach data or success/error message.
    """
    email_to_check = request.args.get("email")
    if not email_to_check:
        return jsonify({"error": "Email parameter is required", "error_code": "MISSING_EMAIL"}), 400

    # Validate email format (simple regex)
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email_to_check):
         return jsonify({"error": "Invalid email format", "error_code": "INVALID_EMAIL_FORMAT"}), 400

    if not HIBP_API_KEY:
        logging.error("HIBP API Key is not configured in environment variables.")
        return jsonify({"error": "Service configuration error - API key missing", "error_code": "HIBP_KEY_MISSING"}), 500

    # --- Inner async helper function ---
    async def _async_check_pwned_helper(email):
        hibp_api_url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}"
        headers = {
            "hibp-api-key": HIBP_API_KEY,
            "User-Agent": "Neozeit-DMARC-Checker/1.0" # HIBP requires a User-Agent, be specific
        }
        try:
            # Use a timeout for the request
            timeout = aiohttp.ClientTimeout(total=15) # 15 seconds total timeout
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(hibp_api_url, headers=headers, params={"truncateResponse": "false"}) as response:
                    if response.status == 200:
                        breaches = await response.json()
                        logging.info(f"Breaches found for {email}: {len(breaches)}")
                        # Return the actual data for jsonify
                        return {"status": "pwned", "breaches": breaches}
                    elif response.status == 404:
                        logging.info(f"No breaches found for {email}")
                        # Return the actual data for jsonify
                        return {"status": "not_pwned"}
                    elif response.status == 401:
                         logging.error(f"HIBP API Key Unauthorized (401)")
                         # Return error data and status code separately
                         return {"error": "API key is invalid or unauthorized.", "error_code": "HIBP_UNAUTHORIZED"}, 401
                    elif response.status == 403:
                         logging.error(f"HIBP API Key Forbidden (403) - Check User-Agent: {headers.get('User-Agent')}")
                         # Return error data and status code separately
                         return {"error": "Access forbidden - check User-Agent or API key permissions.", "error_code": "HIBP_FORBIDDEN"}, 403
                    elif response.status == 429:
                        logging.warning(f"HIBP Rate limit exceeded for {email}")
                        retry_after = response.headers.get("Retry-After")
                        wait_time = f" for {retry_after} seconds" if retry_after else ""
                        # Return error data and status code separately
                        return {"error": f"Rate limit exceeded. Please try again later{wait_time}.", "error_code": "HIBP_RATE_LIMITED"}, 429
                    else:
                        # Attempt to get error message from HIBP response body
                        try:
                            error_detail = await response.json()
                            error_message = error_detail.get("message", "Unknown HIBP API Error")
                        except Exception:
                            error_message = await response.text() # Fallback to raw text

                        logging.error(f"HIBP API error ({response.status}): {error_message}")
                        # Return error data and status code separately
                        return {"error": f"HIBP API error ({response.status}): {error_message}", "error_code": f"HIBP_API_ERROR_{response.status}"}, response.status

        except asyncio.TimeoutError:
             logging.error(f"Timeout connecting to HIBP API for {email}")
             # Return error data and status code separately
             return {"error": "Request to breach checking service timed out.", "error_code": "HIBP_TIMEOUT"}, 504 # Gateway Timeout
        except aiohttp.ClientError as e:
            logging.error(f"Network error connecting to HIBP API: {e}")
            # Return error data and status code separately
            return {"error": "Could not connect to the breach checking service.", "error_code": "HIBP_CONNECTION_ERROR"}, 503 # Service Unavailable
        except Exception as e:
            logging.exception(f"Unexpected error during HIBP check: {e}")
            # Return error data and status code separately
            return {"error": "An unexpected error occurred while checking for breaches.", "error_code": "HIBP_UNEXPECTED_ERROR"}, 500
    # --- End of inner async helper function ---

    # Call the helper using run_async and handle potential tuple return for errors
    result_data = run_async(_async_check_pwned_helper, email_to_check)

    # Check if the result is a tuple (data, status_code) indicating an error
    if isinstance(result_data, tuple) and len(result_data) == 2 and isinstance(result_data[1], int):
        data, status_code = result_data
        return jsonify(data), status_code
    else:
        # Otherwise, it's a successful result (dict)
        return jsonify(result_data)

# --- HTML Routes ---
@app.route('/')
def home():
    """Render the home page."""
    return render_template('index.html')

@app.route('/ip-checker')
def ip_checker_page():
    """Render the IP checker page."""
    return render_template('ip_checker.html')

@app.route('/email-tester')
def email_tester_page():
    """Render the email deliverability tester page."""
    return render_template('email_tester.html')

@app.route('/auth-wizard')
def auth_wizard_page():
    """Render the email authentication setup wizard page."""
    return render_template('auth_wizard.html')

@app.route('/header-analyzer')
def header_analyzer_page():
    """Render the email header analyzer page."""
    return render_template('header_analyzer.html')

# --- NEW PWNED CHECKER HTML ROUTE ---
@app.route('/pwned-checker')
def pwned_checker_page():
    """Render the HIBP checker page."""
    return render_template('pwned_checker.html')


# --- Error handlers ---
@app.errorhandler(404)
def page_not_found(e):
    """Handle 404 errors."""
    # Check if the request expects JSON
    if request.accept_mimetypes.accept_json and not request.accept_mimetypes.accept_html:
        return jsonify({
            "error": "The requested resource was not found",
            "error_code": "NOT_FOUND",
            "suggestions": [
                "Check that the URL is correct",
                "Ensure you're using a supported API endpoint"
            ]
        }), 404
    # Otherwise, render a 404 page (optional, create templates/404.html if desired)
    # return render_template('404.html'), 404
    return "<h1>404 - Not Found</h1><p>The page you are looking for does not exist.</p>", 404


@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors."""
    logging.exception(f"Server error encountered: {e}") # Log the full exception
    if request.accept_mimetypes.accept_json and not request.accept_mimetypes.accept_html:
        return jsonify({
            "error": "An internal server error occurred",
            "error_code": "SERVER_ERROR",
            "suggestions": [
                "Please try again later",
                "If the problem persists, contact support"
            ]
        }), 500
     # Otherwise, render a 500 page (optional, create templates/500.html if desired)
    # return render_template('500.html'), 500
    return "<h1>500 - Internal Server Error</h1><p>An unexpected error occurred. Please try again later.</p>", 500


# --- Main Entry Point ---
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000)) # Use PORT environment variable for Render/Heroku
    print(f"\n * Running on http://0.0.0.0:{port}/ (Press CTRL+C to quit)")
    if not HIBP_API_KEY:
       print("\n *** WARNING: HIBP_API_KEY environment variable not set. Pwned checker will not function. ***\n")
    # Use 0.0.0.0 to be accessible externally (required by Render)
    # debug=False is important for production environments
    app.run(host='0.0.0.0', port=port, debug=False)