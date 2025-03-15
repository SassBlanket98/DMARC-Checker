import asyncio
import sys
import logging

# Windows-specific setup
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import logging
from flask import Flask, request, jsonify, render_template
import dmarc_lookup
from concurrent.futures import ThreadPoolExecutor
from error_handling import (
    api_error_handler, 
    configure_enhanced_logging,
    handle_dmarc_error,
    handle_spf_error,
    handle_dkim_error,
    DomainError
)

logging.getLogger('werkzeug').setLevel(logging.INFO)

# Configure enhanced logging
configure_enhanced_logging()

# Initialize the Flask application
app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')

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
        coroutine = func(*args)
        return loop.run_until_complete(coroutine)
    except Exception as e:
        logging.error(f"Error running async function {func.__name__}: {e}")
        raise

def format_record_data(record_type, data):
    """
    Format record data into a structured response format.

    Args:
        record_type (str): The type of DNS record (e.g., dmarc, spf, dkim, dns).
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
            "parsed_record": {},
            "status": status,
        }
    
    parsed_record = data.get("parsed_record", {}) if record_type in ["dmarc", "spf", "dns"] else {}

    return {
        "title": record_type.upper(),
        "value": data,
        "parsed_record": parsed_record,
        "status": "success",
    }

# API Routes
@app.route("/api/overview", methods=["GET"])
@api_error_handler
def overview():
    """
    Fetch and format an overview of DNS records for a given domain.

    Query Parameters:
        domain (str): The domain name to fetch records for.

    Returns:
        JSON: A collection of formatted DNS records (dmarc, spf, dkim, dns).
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
    dmarc_data = run_async(dmarc_lookup.get_dmarc_record, domain)
    spf_data = run_async(dmarc_lookup.get_spf_record, domain)
    dkim_data = run_async(dmarc_lookup.get_all_dkim_records, domain)
    dns_data = run_async(dmarc_lookup.get_all_dns_records, domain)

    # Aggregate all records into a response
    overview_data = {
        "records": [
            format_record_data("dmarc", dmarc_data),
            format_record_data("spf", spf_data),
            format_record_data("dkim", dkim_data),
            format_record_data("dns", dns_data),
        ]
    }

    return jsonify(overview_data)

@app.route("/api/<record_type>", methods=["GET"])
@api_error_handler
def get_record(record_type):
    """
    Retrieve data for a specific DNS record type.

    URL Parameters:
        record_type (str): The type of DNS record to fetch (e.g., dmarc, spf, dkim, dns).

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
    valid_record_types = ["dmarc", "spf", "dkim", "dns"]
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

    try:
        # Fetch the appropriate record type with enhanced error handling
        if record_type == "dmarc":
            try:
                data = run_async(dmarc_lookup.get_dmarc_record, domain)
            except Exception as e:
                return jsonify(handle_dmarc_error(domain, e)), 404
        elif record_type == "spf":
            try:
                data = run_async(dmarc_lookup.get_spf_record, domain)
            except Exception as e:
                return jsonify(handle_spf_error(domain, e)), 404
        elif record_type == "dkim":
            # Need to handle each selector individually
            try:
                data = run_async(dmarc_lookup.get_all_dkim_records, domain, selectors)
                # Check if all selectors failed
                all_failed = True
                for selector, selector_data in data.items():
                    if selector_data.get("status") == "success":
                        all_failed = False
                        break
                
                if all_failed and selectors:
                    logging.warning(f"No DKIM records found for any selector on domain: {domain}")
                    # Add suggestions to the response
                    data["suggestions"] = [
                        "No DKIM records were found for any of the provided selectors.",
                        "Try different selectors specific to your email provider.",
                        "Common selectors include: google, default, selector1, selector2"
                    ]
            except Exception as e:
                selector_str = ", ".join(selectors) if selectors else "default selectors"
                return jsonify(handle_dkim_error(domain, selector_str, e)), 404
        elif record_type == "dns":
            data = run_async(dmarc_lookup.get_all_dns_records, domain)

        # Return the fetched data as a JSON response
        return jsonify(data)
    
    except Exception as e:
        # This should be caught by the decorator, but just in case
        logging.exception(f"Unhandled error in get_record: {e}")
        return jsonify({
            "error": f"An unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR",
            "suggestions": [
                "Please try again later.",
                "If the problem persists, contact support."
            ]
        }), 500

def is_valid_domain(domain):
    """
    Validate domain format.
    
    Args:
        domain (str): Domain to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    import re
    # Basic domain validation regex
    # This is a simplified version - consider a more robust validation for production
    pattern = r'^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
    return bool(re.match(pattern, domain))

# HTML Routes
@app.route('/')
def home():
    """
    Render the home page.

    Returns:
        HTML: The rendered index.html page.
    """
    return render_template('index.html')

# Error handlers for HTTP errors
@app.errorhandler(404)
def page_not_found(e):
    """Handle 404 errors."""
    return jsonify({
        "error": "The requested resource was not found",
        "error_code": "NOT_FOUND",
        "suggestions": [
            "Check that the URL is correct",
            "Ensure you're using a supported API endpoint"
        ]
    }), 404

@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors."""
    logging.error(f"Server error: {e}")
    return jsonify({
        "error": "An internal server error occurred",
        "error_code": "SERVER_ERROR",
        "suggestions": [
            "Please try again later",
            "If the problem persists, contact support"
        ]
    }), 500

# Main Entry Point
if __name__ == '__main__':
    print("\n * Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)")
    app.run(debug=True)