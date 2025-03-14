import asyncio  # Provides support for asynchronous programming
import sys  # Used to access system-specific parameters and functions

# Windows-specific setup: Ensures compatibility of the asyncio event loop on Windows platforms
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import logging  # Enables logging for debugging and error tracking
from flask import Flask, request, jsonify, render_template  # Flask components for web app creation and API handling
import dmarc_lookup  # Custom module for DNS record lookups (assumed external dependency)
from concurrent.futures import ThreadPoolExecutor  # Allows for running functions asynchronously using a thread pool

# Configure logging to output debug information to the console
logging.basicConfig(level=logging.DEBUG)

# Initialize the Flask application
app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')

# Create a new asyncio event loop for asynchronous operations
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)

# Thread pool executor to handle async operations in a synchronous Flask environment
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

    Raises:
        Exception: If the function execution fails, logs and re-raises the error.
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

    # Special handling for DKIM records to accurately reflect status
    if record_type == "dkim":
        # Check if any valid DKIM records were found for any selector
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
            "parsed_record": {},  # DKIM parsed records are handled differently
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
def overview():
    """
    Fetch and format an overview of DNS records for a given domain.

    Query Parameters:
        domain (str): The domain name to fetch records for.

    Returns:
        JSON: A collection of formatted DNS records (dmarc, spf, dkim, dns).

    Raises:
        400: If the domain parameter is not provided.
        500: If any error occurs during the record retrieval process.
    """
    domain = request.args.get("domain")
    if not domain:
        return jsonify({"error": "Domain parameter is required"}), 400

    try:
        # Fetch all types of DNS records asynchronously
        dmarc_data = run_async(dmarc_lookup.get_dmarc_record, domain)
        spf_data = run_async(dmarc_lookup.get_spf_record, domain)
        # Pass only the domain; rely on default selectors in get_all_dkim_records
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
    except Exception as e:
        logging.error(f"Error in overview generation: {e}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/<record_type>", methods=["GET"])
def get_record(record_type):
    """
    Retrieve data for a specific DNS record type.

    URL Parameters:
        record_type (str): The type of DNS record to fetch (e.g., dmarc, spf, dkim, dns).

    Query Parameters:
        domain (str): The domain name to fetch records for.
        selectors (str, optional): A comma-separated list of selectors for DKIM (if applicable).

    Returns:
        JSON: The record data for the specified record type.

    Raises:
        400: If the domain parameter is missing or if the record type is unsupported.
        500: If any error occurs during the record retrieval process.
    """
    # Retrieve the domain parameter from the request
    domain = request.args.get("domain")
    raw_selectors = request.args.get("selectors", "")  # Default to an empty string if not provided

    # Parse selectors into a list if provided
    selectors = [sel.strip() for sel in raw_selectors.split(",") if sel.strip()] or None

    # Log the received parameters for debugging
    logging.debug(f"Received domain: {domain}, record_type: {record_type}, selectors: {selectors}")

    # Validate that the domain parameter is present
    if not domain:
        return jsonify({"error": "Domain parameter is required"}), 400

    try:
        # Fetch the appropriate record type
        if record_type == "dmarc":
            # Fetch DMARC record for the domain
            data = run_async(dmarc_lookup.get_dmarc_record, domain)
        elif record_type == "spf":
            # Fetch SPF record for the domain
            data = run_async(dmarc_lookup.get_spf_record, domain)
        elif record_type == "dkim":
            # Fetch DKIM records for the domain using selectors
            data = run_async(dmarc_lookup.get_all_dkim_records, domain, selectors)
        elif record_type == "dns":
            # Fetch all DNS records for the domain
            data = run_async(dmarc_lookup.get_all_dns_records, domain)
        else:
            # Return an error for unsupported record types
            return jsonify({"error": "Unsupported record type."}), 400

        # Return the fetched data as a JSON response
        return jsonify(data)
    except Exception as e:
        # Log any unexpected errors that occur during processing
        logging.error(f"Error fetching {record_type} record: {e}")
        # Return a JSON response with the error message
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500




# HTML Routes
@app.route('/')
def home():
    """
    Render the home page.

    Returns:
        HTML: The rendered index.html page.
    """
    return render_template('index.html')

# Main Entry Point
if __name__ == '__main__':
    """
    Start the Flask application in debug mode for development purposes.
    """
    app.run(debug=True)
