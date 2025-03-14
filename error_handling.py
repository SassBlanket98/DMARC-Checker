import logging
from functools import wraps
from flask import jsonify
import dns.resolver

class DmarcError(Exception):
    """Base exception class for DMARC checker errors."""
    def __init__(self, message, error_code=None, suggestions=None):
        self.message = message
        self.error_code = error_code or "GENERAL_ERROR"
        self.suggestions = suggestions or []
        super().__init__(self.message)

class DomainError(DmarcError):
    """Exception raised for errors related to the domain."""
    pass

class DnsLookupError(DmarcError):
    """Exception raised for DNS lookup errors."""
    pass

class RecordParsingError(DmarcError):
    """Exception raised for errors when parsing DNS records."""
    pass

class ApiError(DmarcError):
    """Exception raised for API-related errors."""
    pass

# Error mapping dictionary
DNS_ERROR_MAP = {
    dns.resolver.NXDOMAIN: {
        "error_code": "DOMAIN_NOT_FOUND",
        "message": "The domain does not exist or has no DNS records.",
        "suggestions": [
            "Check for typos in the domain name.",
            "Verify that the domain is properly registered and has DNS configured."
        ]
    },
    dns.resolver.NoAnswer: {
        "error_code": "NO_RECORD_FOUND",
        "message": "No records of the requested type were found for this domain.",
        "suggestions": [
            "The domain exists but doesn't have the requested record type configured.",
            "Check with the domain administrator to set up proper email authentication records."
        ]
    },
    dns.resolver.Timeout: {
        "error_code": "DNS_TIMEOUT",
        "message": "DNS query timed out. The DNS server is not responding.",
        "suggestions": [
            "This could be a temporary network issue. Try again later.",
            "The domain's authoritative DNS servers might be experiencing problems."
        ]
    }
}

def handle_dns_exception(exception):
    """
    Maps DNS exceptions to structured error responses with helpful suggestions.
    
    Args:
        exception: The DNS exception that was raised
        
    Returns:
        dict: A structured error response
    """
    # Get error details from mapping or use default values
    error_type = type(exception)
    error_details = DNS_ERROR_MAP.get(error_type, {
        "error_code": "DNS_ERROR",
        "message": f"DNS lookup error: {str(exception)}",
        "suggestions": ["Please try again later or check the domain configuration."]
    })
    
    # Create a structured error response
    return {
        "error": error_details["message"],
        "error_code": error_details["error_code"],
        "suggestions": error_details["suggestions"]
    }

def api_error_handler(f):
    """
    Decorator for API routes to handle exceptions consistently.
    
    Args:
        f: The function to wrap
        
    Returns:
        The wrapped function with error handling
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except DmarcError as e:
            logging.error(f"DMARC Error: {e.error_code} - {e.message}")
            return jsonify({
                "error": e.message,
                "error_code": e.error_code,
                "suggestions": e.suggestions
            }), 400
        except dns.resolver.NXDOMAIN as e:
            logging.error(f"DNS Error - Domain not found: {e}")
            return jsonify(handle_dns_exception(e)), 404
        except dns.resolver.NoAnswer as e:
            logging.error(f"DNS Error - No record found: {e}")
            return jsonify(handle_dns_exception(e)), 404
        except dns.resolver.Timeout as e:
            logging.error(f"DNS Error - Timeout: {e}")
            return jsonify(handle_dns_exception(e)), 408
        except dns.exception.DNSException as e:
            logging.error(f"DNS Error - General: {e}")
            return jsonify(handle_dns_exception(e)), 500
        except Exception as e:
            logging.exception(f"Unexpected error in API: {e}")
            return jsonify({
                "error": "An unexpected error occurred.",
                "error_code": "INTERNAL_SERVER_ERROR",
                "suggestions": [
                    "Please try again later.",
                    "If the problem persists, contact support."
                ]
            }), 500
    return decorated

# More specific error handlers for different record types
def handle_dmarc_error(domain, exception):
    """
    Creates a structured error response for DMARC lookup errors.
    
    Args:
        domain: The domain that was being queried
        exception: The exception that was raised
        
    Returns:
        dict: A structured error response
    """
    if isinstance(exception, dns.resolver.NoAnswer):
        return {
            "error": f"No DMARC record found for domain: {domain}",
            "error_code": "DMARC_NOT_FOUND",
            "suggestions": [
                "Your domain doesn't have a DMARC policy configured.",
                "Consider adding a DMARC record (_dmarc.yourdomain.com) to improve email security.",
                "Start with a monitoring policy (p=none) to avoid disrupting email flow."
            ]
        }
    return handle_dns_exception(exception)

def handle_spf_error(domain, exception):
    """
    Creates a structured error response for SPF lookup errors.
    
    Args:
        domain: The domain that was being queried
        exception: The exception that was raised
        
    Returns:
        dict: A structured error response
    """
    if isinstance(exception, dns.resolver.NoAnswer):
        return {
            "error": f"No SPF record found for domain: {domain}",
            "error_code": "SPF_NOT_FOUND",
            "suggestions": [
                "Your domain doesn't have an SPF policy configured.",
                "Consider adding an SPF record to protect against email spoofing.",
                "Basic SPF example: 'v=spf1 include:_spf.google.com ~all'"
            ]
        }
    return handle_dns_exception(exception)

def handle_dkim_error(domain, selector, exception):
    """
    Creates a structured error response for DKIM lookup errors.
    
    Args:
        domain: The domain that was being queried
        selector: The DKIM selector that was being checked
        exception: The exception that was raised
        
    Returns:
        dict: A structured error response
    """
    if isinstance(exception, dns.resolver.NoAnswer):
        return {
            "error": f"No DKIM record found for selector '{selector}' on domain: {domain}",
            "error_code": "DKIM_NOT_FOUND",
            "suggestions": [
                f"The selector '{selector}' is not configured for your domain.",
                "Check with your email service provider for the correct selector name.",
                "Common selectors include: google, default, selector1, selector2, dkim"
            ]
        }
    return handle_dns_exception(exception)

# Enhanced logging configuration
def configure_enhanced_logging():
    """
    Configure enhanced logging for better error tracking and diagnosis.
    """
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    date_format = '%Y-%m-%d %H:%M:%S'
    
    # Configure the root logger
    logging.basicConfig(
        level=logging.DEBUG,
        format=log_format,
        datefmt=date_format
    )
    
    # Create a file handler for error logs
    file_handler = logging.FileHandler('dmarc_errors.log')
    file_handler.setLevel(logging.ERROR)
    file_handler.setFormatter(logging.Formatter(log_format))
    
    # Add the file handler to the root logger
    logging.getLogger('').addHandler(file_handler)
    
    # Set specific loggers to appropriate levels
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)