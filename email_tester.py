import asyncio
import logging
import smtplib
import time
import re
import random
import email.utils
import dns.resolver
import dns.exception
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from datetime import datetime
from error_handling import (
    DmarcError, DomainError, DnsLookupError, RecordParsingError
)
import dmarc_lookup
import reputation_check

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
TEST_EMAIL_SERVERS = [
    "test-server-1.deliverability-check.com",
    "test-server-2.deliverability-check.com"
]
DEFAULT_TEST_EMAIL = "test@deliverability-check.com"
SMTP_TIMEOUT = 30  # seconds

class EmailTesterError(Exception):
    """Base exception class for Email Tester errors."""
    def __init__(self, message, error_code=None, suggestions=None):
        self.message = message
        self.error_code = error_code or "EMAIL_TEST_ERROR"
        self.suggestions = suggestions or []
        super().__init__(self.message)

class SmtpError(EmailTesterError):
    """Exception raised for SMTP-related errors."""
    pass

class DeliveryError(EmailTesterError):
    """Exception raised for email delivery errors."""
    pass

class ValidationError(EmailTesterError):
    """Exception raised for validation errors."""
    pass

async def run_email_test(test_data):
    """
    Run an email deliverability test.
    
    Args:
        test_data (dict): Test configuration data
            - from_email: Sender email address
            - domain: Domain to test
            - test_type: Type of test (basic or advanced)
            - from_name: Sender name (for advanced test)
            - subject: Email subject (for advanced test)
            - content: Email content (for advanced test)
            - test_email: Email to send test to (for advanced test)
    
    Returns:
        dict: Test results including deliverability score, recommendations, etc.
    """
    # Log test start
    logger.info(f"Starting email deliverability test for domain: {test_data.get('domain')}")
    
    # Validate inputs
    validate_test_data(test_data)
    
    # Extract key data
    from_email = test_data.get('from_email')
    domain = test_data.get('domain')
    test_type = test_data.get('test_type', 'basic')
    
    # Set default values for advanced test if needed
    if test_type == 'advanced':
        from_name = test_data.get('from_name', '')
        subject = test_data.get('subject', 'Email Deliverability Test')
        content = test_data.get('content', 'This is a test email to verify deliverability.')
        test_email = test_data.get('test_email', DEFAULT_TEST_EMAIL)
    else:
        # For basic test, use defaults
        from_name = "Deliverability Test"
        subject = "Email Deliverability Test"
        content = "This is an automated test email to verify deliverability."
        test_email = DEFAULT_TEST_EMAIL
    
    # Start with fetching DNS records to check domain configuration
    try:
        # Lookup key DNS records asynchronously
        dmarc_data, spf_data, dns_data = await asyncio.gather(
            dmarc_lookup.get_dmarc_record(domain),
            dmarc_lookup.get_spf_record(domain),
            dmarc_lookup.get_all_dns_records(domain)
        )
        
        # Get domain reputation data
        reputation_data = await reputation_check.check_domain_reputation(domain)
    except Exception as e:
        logger.error(f"Error fetching DNS records for {domain}: {e}")
        # Continue with the test even if DNS lookups fail
        dmarc_data = {"error": "Failed to fetch DMARC record"}
        spf_data = {"error": "Failed to fetch SPF record"}
        dns_data = {"error": "Failed to fetch DNS records"}
        reputation_data = {"error": "Failed to fetch reputation data"}
    
    # Set up infrastructure data
    infrastructure = {
        "spf_record": spf_data.get("spf_record", None),
        "dmarc_record": dmarc_data.get("dmarc_records", [None])[0],
        "dkim_record": None,  # We'll check this later
        "ip_address": None,   # Will be determined when sending
        "blacklisted": reputation_data.get("blacklisted", False),
        "blacklists": reputation_data.get("blacklist_details", [])
    }
    
    # Try to send test email
    test_result = {"sent": False, "headers": {}, "error": None}
    
    try:
        # Send test email
        test_result = await send_test_email(from_email, from_name, test_email, subject, content)
    except Exception as e:
        logger.error(f"Error sending test email: {e}")
        # Record error but continue with analysis
        test_result["error"] = str(e)
    
    # Parse authentication results
    auth_results = parse_auth_headers(test_result.get("headers", {}))
    
    # Analyze content for spam factors
    spam_analysis = analyze_spam_factors(subject, content)
    
    # Calculate deliverability score
    score = calculate_deliverability_score(auth_results, spam_analysis, infrastructure)
    
    # Generate recommendations
    recommendations = generate_recommendations(auth_results, spam_analysis, infrastructure, score)
    
    # Assemble final result
    result = {
        "score": score,
        "domain": domain,
        "email": from_email,
        "test_type": test_type,
        "auth_results": auth_results,
        "spam_analysis": spam_analysis,
        "infrastructure": infrastructure,
        "recommendations": recommendations,
        "headers": test_result.get("headers", {}),
        "sent": test_result.get("sent", False)
    }
    
    logger.info(f"Completed email deliverability test for {domain} with score: {score}")
    return result

def validate_test_data(test_data):
    """
    Validate the test input data.
    
    Args:
        test_data (dict): Test configuration data
        
    Raises:
        ValidationError: If validation fails
    """
    # Check required fields
    if not test_data.get('from_email'):
        raise ValidationError(
            "From email is required",
            "MISSING_FROM_EMAIL",
            ["Please provide an email address to test from."]
        )
    
    if not test_data.get('domain'):
        raise ValidationError(
            "Domain is required",
            "MISSING_DOMAIN",
            ["Please provide a domain to test."]
        )
    
    # Validate email format
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, test_data.get('from_email', '')):
        raise ValidationError(
            "Invalid email format",
            "INVALID_EMAIL_FORMAT",
            ["Please provide a valid email address format."]
        )
    
    # Validate domain format
    domain_pattern = r'^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
    if not re.match(domain_pattern, test_data.get('domain', '')):
        raise ValidationError(
            "Invalid domain format",
            "INVALID_DOMAIN_FORMAT",
            ["Please provide a valid domain format."]
        )
    
    # Validate test type
    if test_data.get('test_type') not in ['basic', 'advanced']:
        raise ValidationError(
            "Invalid test type",
            "INVALID_TEST_TYPE",
            ["Test type must be 'basic' or 'advanced'."]
        )
    
    # For advanced tests, validate additional fields
    if test_data.get('test_type') == 'advanced':
        # Validate test email
        if test_data.get('test_email') and not re.match(email_pattern, test_data.get('test_email', '')):
            raise ValidationError(
                "Invalid test email format",
                "INVALID_TEST_EMAIL",
                ["Please provide a valid test email address format."]
            )

async def send_test_email(from_email, from_name, to_email, subject, content):
    """
    Send a test email and return delivery info.
    
    Args:
        from_email (str): Sender email address
        from_name (str): Sender name
        to_email (str): Recipient email address
        subject (str): Email subject
        content (str): Email content
        
    Returns:
        dict: Result of sending the email, including headers
        
    Raises:
        SmtpError: If there's an error sending the email
    """
    # In a real implementation, this would send an actual email
    # For this example, we'll simulate sending and receiving an email
    logger.info(f"Sending test email from {from_email} to {to_email}")
    
    try:
        # Create a multipart email
        msg = MIMEMultipart('alternative')
        msg['From'] = email.utils.formataddr((from_name, from_email))
        msg['To'] = to_email
        msg['Subject'] = Header(subject, 'utf-8')
        msg['Message-ID'] = email.utils.make_msgid(domain=from_email.split('@')[1])
        msg['Date'] = email.utils.formatdate(localtime=True)
        
        # Add text body
        text_part = MIMEText(content, 'plain', 'utf-8')
        msg.attach(text_part)
        
        # Add HTML body
        html_content = f"<html><body><p>{content}</p></body></html>"
        html_part = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(html_part)
        
        # In a real implementation, you would connect to an SMTP server and send
        # For this example, we'll simulate the email sending process
        
        # Simulate SMTP connection delay
        await asyncio.sleep(1)
        
        # Simulate sending and determine if it's successful
        # For this demo, we'll use a random success rate of 80%
        if random.random() < 0.8:
            # Successful send
            # Simulate SPF and DKIM authentication results
            # In a real implementation, these would come from the receiving mail server
            domain = from_email.split('@')[1]
            
            # Simulate retrieving headers
            headers = {
                "Return-Path": f"<{from_email}>",
                "Received": f"from mail-server.{domain} (unknown [192.168.1.1]) by {random.choice(TEST_EMAIL_SERVERS)} with ESMTPS id abcdef123456",
                "Authentication-Results": f"{random.choice(TEST_EMAIL_SERVERS)}; spf=pass (sender SPF authorized) smtp.mailfrom={from_email}; dkim=pass (signature was verified) header.d={domain}; dmarc=pass (p=none dis=none) header.from={domain}"
            }
            
            # Add delivery timestamp
            delivered_time = datetime.now().strftime("%a, %d %b %Y %H:%M:%S %z")
            headers["Delivery-date"] = delivered_time
            
            return {
                "sent": True,
                "headers": headers,
                "delivery_time": delivered_time
            }
        else:
            # Simulate failure
            error_types = [
                "connection refused", 
                "timeout", 
                "mailbox unavailable", 
                "relay access denied"
            ]
            error_msg = f"SMTP Error: {random.choice(error_types)}"
            raise SmtpError(
                error_msg,
                "SMTP_DELIVERY_FAILED",
                [
                    "The email server refused to accept the message.",
                    "Check your mail server configuration.",
                    "Verify that your domain is not blacklisted."
                ]
            )
            
    except SmtpError:
        # Pass along SMTP errors
        raise
    except Exception as e:
        # Handle other exceptions
        logger.error(f"Error sending email: {e}")
        raise SmtpError(
            f"Error sending test email: {str(e)}",
            "EMAIL_SEND_ERROR",
            ["There was a problem sending the test email.", 
             "Check your mail server configuration."]
        )

def parse_auth_headers(headers):
    """
    Parse authentication results from email headers.
    
    Args:
        headers (dict): Email headers
        
    Returns:
        dict: Parsed authentication results
    """
    auth_results = {
        "spf": {"status": "none", "details": None},
        "dkim": {"status": "none", "details": None, "selector": None},
        "dmarc": {"status": "none", "details": None, "policy": None}
    }
    
    # Check if we have Authentication-Results header
    auth_header = headers.get("Authentication-Results", "")
    
    if auth_header:
        # Parse SPF result
        spf_match = re.search(r'spf=(\w+)', auth_header)
        if spf_match:
            auth_results["spf"]["status"] = spf_match.group(1)
            
            # Add details based on status
            if spf_match.group(1) == "pass":
                auth_results["spf"]["details"] = "The sending server is authorized to send email for this domain."
            elif spf_match.group(1) == "fail":
                auth_results["spf"]["details"] = "The sending server is not authorized to send email for this domain."
            elif spf_match.group(1) in ["softfail", "neutral"]:
                auth_results["spf"]["details"] = "The domain's SPF policy is not strict enough."
            
        # Parse DKIM result
        dkim_match = re.search(r'dkim=(\w+).*?header\.d=([^;]+)', auth_header, re.DOTALL)
        if dkim_match:
            auth_results["dkim"]["status"] = dkim_match.group(1)
            
            # Add details based on status
            if dkim_match.group(1) == "pass":
                auth_results["dkim"]["details"] = "The email was properly signed and the signature verified."
            elif dkim_match.group(1) == "fail":
                auth_results["dkim"]["details"] = "The DKIM signature failed verification."
            else:
                auth_results["dkim"]["details"] = f"DKIM status: {dkim_match.group(1)}"
            
        # Parse DMARC result
        dmarc_match = re.search(r'dmarc=(\w+).*?p=(\w+)', auth_header, re.DOTALL)
        if dmarc_match:
            auth_results["dmarc"]["status"] = dmarc_match.group(1)
            auth_results["dmarc"]["policy"] = dmarc_match.group(2)
            
            # Add details based on status
            if dmarc_match.group(1) == "pass":
                auth_results["dmarc"]["details"] = "The email passed DMARC checks."
            elif dmarc_match.group(1) == "fail":
                auth_results["dmarc"]["details"] = "The email failed DMARC checks."
            
            # Add policy details
            if dmarc_match.group(2) == "none":
                auth_results["dmarc"]["details"] += " The domain has a monitoring-only policy."
            elif dmarc_match.group(2) == "quarantine":
                auth_results["dmarc"]["details"] += " The domain has a quarantine policy."
            elif dmarc_match.group(2) == "reject":
                auth_results["dmarc"]["details"] += " The domain has a reject policy."
    
    return auth_results

def analyze_spam_factors(subject, content):
    """
    Analyze email content for potential spam factors.
    
    Args:
        subject (str): Email subject
        content (str): Email content
        
    Returns:
        dict: Spam analysis results
    """
    spam_score = 0
    factors = []
    
    # Subject line checks
    if subject:
        # Check for all caps
        if subject.isupper():
            spam_score += 2
            factors.append({
                "name": "All Caps in Subject",
                "severity": "medium",
                "description": "Using ALL CAPS in the subject line can trigger spam filters.",
                "recommendation": "Use normal capitalization in your subject lines."
            })
        
        # Check for spam trigger words in subject
        spam_words = ["free", "urgent", "winner", "cash", "prize", "offer", "buy", "discount", "save"]
        found_words = [word for word in spam_words if word.lower() in subject.lower()]
        
        if found_words:
            spam_score += len(found_words) * 0.5
            factors.append({
                "name": "Spam Trigger Words in Subject",
                "severity": "medium" if len(found_words) > 2 else "low",
                "description": f"Your subject contains potential spam trigger words: {', '.join(found_words)}",
                "recommendation": "Avoid words commonly associated with spam in your subject lines."
            })
        
        # Check for excessive punctuation
        if re.search(r'[!?]{2,}', subject):
            spam_score += 1
            factors.append({
                "name": "Excessive Punctuation",
                "severity": "low",
                "description": "Multiple exclamation points or question marks can trigger spam filters.",
                "recommendation": "Use punctuation sparingly and professionally."
            })
    
    # Content checks
    if content:
        # Check for HTML-only emails
        if "<html>" in content.lower() and not re.sub(r'<[^>]+>', '', content).strip():
            spam_score += 1
            factors.append({
                "name": "HTML-only Email",
                "severity": "low",
                "description": "Emails with HTML content but no plain text alternative may trigger filters.",
                "recommendation": "Always include a plain text version alongside HTML content."
            })
        
        # Check for image-heavy content
        img_count = content.lower().count("<img")
        if img_count > 5:
            spam_score += 1
            factors.append({
                "name": "Image-Heavy Content",
                "severity": "low",
                "description": "Emails with many images and little text may trigger spam filters.",
                "recommendation": "Balance images with relevant text content."
            })
        
        # Check for excessive links
        link_count = content.lower().count("href=")
        if link_count > 3:
            spam_score += link_count * 0.3
            factors.append({
                "name": "Excessive Links",
                "severity": "medium" if link_count > 5 else "low",
                "description": f"Your email contains {link_count} links, which may trigger spam filters.",
                "recommendation": "Limit the number of links in your emails."
            })
        
        # Check for money/financial terms
        money_terms = ["$", "€", "£", "dollars", "euros", "cash", "money", "price", "offer", "discount"]
        found_terms = [term for term in money_terms if term.lower() in content.lower()]
        
        if len(found_terms) > 2:
            spam_score += 1
            factors.append({
                "name": "Financial Terms",
                "severity": "low",
                "description": "Multiple financial terms or symbols may trigger spam filters.",
                "recommendation": "Be cautious with financial terminology in marketing emails."
            })
    
    # Cap the spam score at 10
    spam_score = min(spam_score, 10)
    
    return {
        "score": round(spam_score, 1),
        "factors": factors
    }

def calculate_deliverability_score(auth_results, spam_analysis, infrastructure):
    """
    Calculate an overall deliverability score.
    
    Args:
        auth_results (dict): Authentication results
        spam_analysis (dict): Spam analysis results
        infrastructure (dict): Infrastructure check results
        
    Returns:
        int: Overall deliverability score (0-100)
    """
    score = 50  # Start with a neutral score
    
    # Authentication scoring (up to +40 points)
    # SPF
    if auth_results["spf"]["status"] == "pass":
        score += 15
    elif auth_results["spf"]["status"] in ["softfail", "neutral"]:
        score += 5
    
    # DKIM
    if auth_results["dkim"]["status"] == "pass":
        score += 15
    
    # DMARC
    if auth_results["dmarc"]["status"] == "pass":
        score += 10
        # Bonus for stricter policies
        if auth_results["dmarc"]["policy"] == "quarantine":
            score += 2
        elif auth_results["dmarc"]["policy"] == "reject":
            score += 5
    
    # Spam factors (can reduce score by up to -30 points)
    spam_score = spam_analysis.get("score", 0)
    spam_penalty = int(spam_score * 3)  # Convert 0-10 scale to 0-30 penalty
    score -= spam_penalty
    
    # Infrastructure factors (up to +20 points)
    if infrastructure.get("spf_record"):
        score += 5
    
    if infrastructure.get("dmarc_record"):
        score += 5
    
    if infrastructure.get("dkim_record"):
        score += 5
    
    # Reputation factors (can reduce score by up to -20 points)
    if infrastructure.get("blacklisted"):
        blacklist_count = len(infrastructure.get("blacklists", []))
        score -= min(blacklist_count * 5, 20)  # Cap at -20
    else:
        score += 5  # Bonus for not being blacklisted
    
    # Ensure score stays in 0-100 range
    score = max(0, min(score, 100))
    
    return score

def generate_recommendations(auth_results, spam_analysis, infrastructure, score):
    """
    Generate recommendations for improving email deliverability.
    
    Args:
        auth_results (dict): Authentication results
        spam_analysis (dict): Spam analysis results
        infrastructure (dict): Infrastructure check results
        score (int): Overall deliverability score
        
    Returns:
        list: Recommendations with priority levels
    """
    recommendations = []
    
    # Authentication recommendations
    if auth_results["spf"]["status"] != "pass":
        recommendations.append({
            "title": "Implement or Fix SPF Record",
            "description": "Sender Policy Framework (SPF) helps prevent email spoofing by specifying which servers are authorized to send email from your domain.",
            "priority": "high"
        })
    
    if auth_results["dkim"]["status"] != "pass":
        recommendations.append({
            "title": "Implement DKIM Signing",
            "description": "DomainKeys Identified Mail (DKIM) adds a digital signature to your emails that verifies they weren't altered in transit.",
            "priority": "high"
        })
    
    if auth_results["dmarc"]["status"] != "pass":
        recommendations.append({
            "title": "Implement DMARC Policy",
            "description": "Domain-based Message Authentication, Reporting & Conformance (DMARC) tells receiving servers what to do with emails that fail SPF and DKIM checks.",
            "priority": "high"
        })
    elif auth_results["dmarc"]["policy"] == "none":
        recommendations.append({
            "title": "Strengthen DMARC Policy",
            "description": "Your DMARC policy is set to 'none', which only monitors without taking action. Consider upgrading to 'quarantine' or 'reject' for better protection.",
            "priority": "medium"
        })
    
    # Content recommendations
    spam_factors = spam_analysis.get("factors", [])
    if spam_factors:
        # Get high severity factors
        high_severity = [f for f in spam_factors if f.get("severity") == "high"]
        if high_severity:
            recommendations.append({
                "title": "Fix Critical Content Issues",
                "description": f"Your email contains {len(high_severity)} critical content issues that may trigger spam filters: " + 
                               ", ".join([f.get("name") for f in high_severity]),
                "priority": "high"
            })
        
        # Get medium severity factors
        medium_severity = [f for f in spam_factors if f.get("severity") == "medium"]
        if medium_severity:
            recommendations.append({
                "title": "Improve Email Content",
                "description": f"Your email contains {len(medium_severity)} content issues that may affect deliverability: " +
                               ", ".join([f.get("name") for f in medium_severity]),
                "priority": "medium"
            })
    
    # Infrastructure recommendations
    if infrastructure.get("blacklisted"):
        recommendations.append({
            "title": "Address Blacklisting Issues",
            "description": f"Your domain appears on {len(infrastructure.get('blacklists', []))} blacklists. Request removal after fixing the underlying issues.",
            "priority": "high"
        })
    
    # General recommendations based on score
    if score < 40:
        recommendations.append({
            "title": "Comprehensive Email Authentication Review",
            "description": "Your deliverability score is very low. We recommend a comprehensive review of your email authentication setup, content practices, and sender reputation.",
            "priority": "high"
        })
    elif score < 60:
        recommendations.append({
            "title": "Email Deliverability Audit",
            "description": "Your deliverability score indicates significant room for improvement. Consider conducting a thorough email deliverability audit.",
            "priority": "medium"
        })
    elif score < 80:
        recommendations.append({
            "title": "Fine-tune Email Practices",
            "description": "Your deliverability is decent but could be improved. Focus on fixing the specific issues identified in this report.",
            "priority": "medium"
        })
    
    return recommendations