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

class SmtpError(Exception):
    """Exception raised for SMTP errors in email test"""
    def __init__(self, message, error_code, suggestions=None):
        self.message = message
        self.error_code = error_code
        self.suggestions = suggestions or []
        super().__init__(self.message)

class DeliveryError(EmailTesterError):
    """Exception raised for email delivery errors."""
    pass

class ValidationError(Exception):
    """Exception raised for validation errors in email test"""
    def __init__(self, message, error_code, suggestions=None):
        self.message = message
        self.error_code = error_code
        self.suggestions = suggestions or []
        super().__init__(self.message)

async def run_email_test(test_data):
    """
    Run an email deliverability test - either by actually sending an email
    or by simulating the delivery.
    
    Args:
        test_data (dict): Test parameters including email addresses, content, etc.
        
    Returns:
        dict: Test results including score, authentication results, etc.
    """
    # Validate required fields
    if not test_data.get('from_email'):
        raise ValidationError(
            "From email is required", 
            "MISSING_FROM_EMAIL",
            ["Please provide a sender email address"]
        )
    
    if not test_data.get('domain'):
        raise ValidationError(
            "Domain is required", 
            "MISSING_DOMAIN",
            ["Please provide a domain to test"]
        )
    
    # Determine if this is a simulation
    simulate = test_data.get('simulate', False)
    
    # Check authentication records for the domain
    domain = test_data['domain']
    auth_results = {}
    
    try:
        # Get DMARC record
        dmarc_data = await dmarc_lookup.get_dmarc_record(domain)
        if 'error' not in dmarc_data:
            auth_results['dmarc'] = {
                'status': 'pass' if dmarc_data.get('parsed_record', {}).get('p') else 'none',
                'policy': dmarc_data.get('parsed_record', {}).get('p', 'none'),
                'details': "DMARC record is properly configured"
            }
        else:
            auth_results['dmarc'] = {
                'status': 'fail',
                'details': "No valid DMARC record found"
            }
            
        # Get SPF record
        spf_data = await dmarc_lookup.get_spf_record(domain)
        if 'error' not in spf_data:
            # Check for "-all" or "~all" in SPF record
            spf_record = spf_data.get('spf_record', '')
            if '-all' in spf_record:
                status = 'pass'
                details = "SPF record includes -all (strict)"
            elif '~all' in spf_record:
                status = 'pass'
                details = "SPF record includes ~all (relaxed)"
            elif '?all' in spf_record:
                status = 'neutral'
                details = "SPF record includes ?all (neutral)"
            elif '+all' in spf_record:
                status = 'fail'
                details = "SPF record includes +all (dangerous)"
            else:
                status = 'neutral'
                details = "SPF record does not specify an 'all' directive"
                
            auth_results['spf'] = {
                'status': status,
                'details': details
            }
        else:
            auth_results['spf'] = {
                'status': 'fail',
                'details': "No valid SPF record found"
            }
            
        # Get DKIM records
        selectors = ['default', 'google', 'selector1', 'selector2']  # Common selectors
        dkim_data = await dmarc_lookup.get_all_dkim_records(domain, selectors)
        
        # Check if any valid DKIM selector was found
        dkim_status = 'fail'
        dkim_details = "No valid DKIM record found"
        selector_found = None
        
        for selector, data in dkim_data.items():
            if isinstance(data, dict) and data.get('status') == 'success':
                dkim_status = 'pass'
                dkim_details = f"DKIM record found with selector: {selector}"
                selector_found = selector
                break
                
        auth_results['dkim'] = {
            'status': dkim_status,
            'details': dkim_details,
            'selector': selector_found
        }
        
    except Exception as e:
        # Handle any errors during DNS lookups
        print(f"Error checking authentication records: {e}")
        # Continue with simulation using default values
    
    # Calculate a score based on authentication results
    score = calculate_email_score(auth_results)
    
    # Generate simulated content analysis for spam factors
    spam_analysis = simulate_spam_analysis(test_data)
    
    # Add content analysis to score
    if spam_analysis and 'score' in spam_analysis:
        # Adjust overall score based on spam score (0-10, where 0 is good)
        spam_factor = (10 - spam_analysis['score']) / 10
        score = int(score * 0.8 + spam_factor * 20)  # 80% auth, 20% content
    
    # Create infrastructure data
    infrastructure = {
        'spf_record': spf_data.get('spf_record') if 'error' not in spf_data else None,
        'dmarc_record': dmarc_data.get('dmarc_records', [None])[0] if 'error' not in dmarc_data else None,
        'dkim_record': True if auth_results.get('dkim', {}).get('status') == 'pass' else False,
        'dkim_selector': auth_results.get('dkim', {}).get('selector'),
        'ip_address': '192.0.2.1',  # Example IP for simulation
        'blacklisted': False,  # Assume not blacklisted for simulation
        'blacklists': []
    }
    
    # Generate recommendations - FIXED: now passing infrastructure parameter
    recommendations = generate_recommendations(auth_results, spam_analysis, infrastructure, score)
    
    # Build the result
    result = {
        'score': score,
        'auth_results': auth_results,
        'spam_analysis': spam_analysis,
        'recommendations': recommendations,
        'domain': domain,
        'email': test_data.get('from_email'),
        'test_type': test_data.get('test_type', 'basic'),
        'simulated': simulate,
        # Generate fake headers for simulation
        'headers': generate_simulated_headers(test_data, auth_results) if simulate else {},
        # Add infrastructure data
        'infrastructure': infrastructure
    }
    
    return result

def calculate_email_score(auth_results):
    """
    Calculate email deliverability score based on authentication results.
    
    Args:
        auth_results (dict): Authentication results for SPF, DKIM, DMARC
        
    Returns:
        int: Score from 0-100
    """
    score = 50  # Start with a baseline score
    
    # SPF scoring
    spf_status = auth_results.get('spf', {}).get('status')
    if spf_status == 'pass':
        score += 15
    elif spf_status == 'neutral':
        score += 5
        
    # DKIM scoring
    dkim_status = auth_results.get('dkim', {}).get('status')
    if dkim_status == 'pass':
        score += 20
        
    # DMARC scoring
    dmarc_status = auth_results.get('dmarc', {}).get('status')
    dmarc_policy = auth_results.get('dmarc', {}).get('policy')
    
    if dmarc_status == 'pass':
        score += 10
        if dmarc_policy == 'reject':
            score += 5
        elif dmarc_policy == 'quarantine':
            score += 3
    
    # Ensure score is within bounds
    return max(0, min(score, 100))

def simulate_spam_analysis(test_data):
    """
    Simulate spam analysis based on email content and configuration.
    
    Args:
        test_data (dict): Test data including subject and content
        
    Returns:
        dict: Simulated spam analysis
    """
    factors = []
    spam_score = 0
    
    # Check subject for spam triggers
    subject = test_data.get('subject', '')
    if subject:
        # Check for ALL CAPS
        if subject.isupper():
            factors.append({
                'name': 'ALL CAPS in subject',
                'severity': 'high',
                'description': 'Using all capital letters in the subject line is a common spam trigger.',
                'recommendation': 'Use normal capitalization in subject lines.'
            })
            spam_score += 2
            
        # Check for spam trigger words
        spam_words = ['free', 'guarantee', 'no risk', 'winner', 'cash', 'prize', 'urgent']
        found_words = [word for word in spam_words if word.lower() in subject.lower()]
        if found_words:
            factors.append({
                'name': 'Potential spam trigger words in subject',
                'severity': 'medium',
                'description': f"Your subject contains words that may trigger spam filters: {', '.join(found_words)}",
                'recommendation': 'Avoid using known spam trigger words in subject lines.'
            })
            spam_score += len(found_words)
            
    # Check content for spam triggers
    content = test_data.get('content', '')
    if content:
        # Check content length
        if len(content) < 20:
            factors.append({
                'name': 'Very short content',
                'severity': 'low',
                'description': 'Very short email content can be a spam indicator.',
                'recommendation': 'Provide more substantive content in your emails.'
            })
            spam_score += 1
            
        # Check for excessive exclamation marks
        if content.count('!') > 3:
            factors.append({
                'name': 'Excessive exclamation marks',
                'severity': 'medium',
                'description': 'Using too many exclamation marks can trigger spam filters.',
                'recommendation': 'Use exclamation marks sparingly.'
            })
            spam_score += 1
            
        # Check for excessive capitalization
        if sum(1 for c in content if c.isupper()) / max(1, len(content)) > 0.3:
            factors.append({
                'name': 'Excessive capitalization',
                'severity': 'medium',
                'description': 'Using too many capital letters can trigger spam filters.',
                'recommendation': 'Use normal capitalization in your email content.'
            })
            spam_score += 2
    
    # Cap the spam score at 10
    spam_score = min(spam_score, 10)
    
    return {
        'score': spam_score,
        'factors': factors
    }

def generate_recommendations(auth_results, spam_analysis, score):
    """
    Generate recommendations based on test results.
    
    Args:
        auth_results (dict): Authentication results
        spam_analysis (dict): Spam analysis results
        score (int): Overall score
        
    Returns:
        list: Recommendations with priority levels
    """
    recommendations = []
    
    # Authentication recommendations
    if auth_results.get('spf', {}).get('status') != 'pass':
        recommendations.append({
            'title': 'Set up SPF record',
            'description': 'Add an SPF record to specify which mail servers are authorized to send email on behalf of your domain.',
            'priority': 'high'
        })
    
    if auth_results.get('dkim', {}).get('status') != 'pass':
        recommendations.append({
            'title': 'Configure DKIM signing',
            'description': 'Set up DKIM to cryptographically sign emails from your domain, improving deliverability and security.',
            'priority': 'high'
        })
    
    if auth_results.get('dmarc', {}).get('status') != 'pass':
        recommendations.append({
            'title': 'Implement DMARC policy',
            'description': 'Add a DMARC record to tell receiving mail servers how to handle emails that fail authentication.',
            'priority': 'medium'
        })
    elif auth_results.get('dmarc', {}).get('policy') == 'none':
        recommendations.append({
            'title': 'Strengthen DMARC policy',
            'description': 'Your DMARC policy is set to "none". Consider upgrading to "quarantine" or "reject" after monitoring for a period.',
            'priority': 'low'
        })
    
    # Content recommendations from spam analysis
    if spam_analysis and spam_analysis.get('factors'):
        for factor in spam_analysis['factors']:
            if factor['severity'] == 'high':
                recommendations.append({
                    'title': f"Fix: {factor['name']}",
                    'description': f"{factor['description']} {factor['recommendation']}",
                    'priority': 'high'
                })
    
    # Overall recommendations based on score
    if score < 50:
        recommendations.append({
            'title': 'Improve email authentication urgently',
            'description': 'Your email deliverability score is very low. Implementing the recommended authentication measures should be a top priority.',
            'priority': 'high'
        })
    
    return recommendations

def generate_simulated_headers(test_data, auth_results):
    """
    Generate simulated email headers for display purposes.
    
    Args:
        test_data (dict): Test data
        auth_results (dict): Authentication results
        
    Returns:
        str: Formatted email headers
    """
    from_name = test_data.get('from_name', '')
    from_email = test_data.get('from_email', '')
    subject = test_data.get('subject', 'Email Deliverability Test')
    to_email = test_data.get('test_email', 'recipient@example.com')
    domain = test_data.get('domain', '')
    
    # Format the From header with name if provided
    from_header = f'"{from_name}" <{from_email}>' if from_name else from_email
    
    # Current date in RFC 2822 format
    import datetime
    date = datetime.datetime.now().strftime('%a, %d %b %Y %H:%M:%S +0000')
    
    # Generate Message-ID
    import uuid
    message_id = f"<{uuid.uuid4()}@{domain}>"
    
    # Construct basic headers
    headers = f"""Return-Path: <{from_email}>
Received: from mail-server.example.com ([192.0.2.1])
        by mx.example.com with ESMTPS id abcdef123456
        for <{to_email}>
        (version=TLS1.2 cipher=ECDHE-RSA-AES128-GCM-SHA256);
        {date}
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d={domain};
        s={auth_results.get('dkim', {}).get('selector', 'selector1')};
        h=from:to:subject:mime-version:content-type:date:message-id;
        bh=47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=;
        b=Simulated-DKIM-Signature
From: {from_header}
To: <{to_email}>
Subject: {subject}
Message-ID: {message_id}
Date: {date}
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 7bit

"""
    
    # Add Authentication-Results header based on auth_results
    auth_header = "Authentication-Results: mx.example.com;"
    
    # Add SPF result
    spf_status = auth_results.get('spf', {}).get('status', 'none')
    auth_header += f" spf={spf_status} smtp.mailfrom={from_email};"
    
    # Add DKIM result
    dkim_status = auth_results.get('dkim', {}).get('status', 'none')
    dkim_selector = auth_results.get('dkim', {}).get('selector', 'selector1')
    auth_header += f" dkim={dkim_status} header.s={dkim_selector} header.d={domain};"
    
    # Add DMARC result
    dmarc_status = auth_results.get('dmarc', {}).get('status', 'none')
    auth_header += f" dmarc={dmarc_status} header.from={domain}"
    
    # Add auth header to the headers
    headers += auth_header
    
    return headers

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