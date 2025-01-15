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
app = Flask(__name__)

# Create a new asyncio event loop for asynchronous operations
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)

# Thread pool executor to handle async operations in a synchronous Flask environment
executor = ThreadPoolExecutor(4)

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
            "value": data["error"],
            "status": "error",
            "parsed_record": {}
        }

    parsed_record = data.get("parsed_record", {}) if record_type in ["dmarc", "spf", "dkim", "dns"] else {}

    return {
        "title": record_type.upper(),
        "value": data,
        "parsed_record": parsed_record,
        "status": "success",
    }

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
        dkim_data = run_async(dmarc_lookup.get_dkim_record, "default", domain)
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

@app.route('/')
def home():
    """
    Render the home page.

    Returns:
        HTML: The rendered index.html page.
    """
    return render_template('index.html')

@app.route('/api/<record_type>', methods=['GET'])
def get_record(record_type):
    """
    Retrieve data for a specific DNS record type.

    URL Parameters:
        record_type (str): The type of DNS record to fetch (e.g., dmarc, spf, dkim, dns).

    Query Parameters:
        domain (str): The domain name to fetch records for.

    Returns:
        JSON: The record data for the specified record type.

    Raises:
        400: If the domain parameter is missing or if the record type is unsupported.
        500: If any error occurs during the record retrieval process.
    """
    domain = request.args.get("domain")
    if not domain:
        return jsonify({"error": "Domain parameter is required"}), 400

    try:
        # Fetch the appropriate record type
        if record_type == "dmarc":
            data = run_async(dmarc_lookup.get_dmarc_record, domain)
        elif record_type == "spf":
            data = run_async(dmarc_lookup.get_spf_record, domain)
        elif record_type == "dkim":
            data = run_async(dmarc_lookup.get_dkim_record, "default", domain)
        elif record_type == "dns":
            data = run_async(dmarc_lookup.get_all_dns_records, domain)
        else:
            return jsonify({"error": "Unsupported record type."}), 400

        return jsonify(data)
    except Exception as e:
        logging.error(f"Error fetching {record_type} record: {e}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    """
    Start the Flask application in debug mode for development purposes.
    """
    app.run(debug=True)