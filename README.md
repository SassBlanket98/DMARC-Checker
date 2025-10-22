# 🛡️ Neozeit Comprehensive Domain & Email Toolkit

**Version:** 1.0 (Based on provided files as of 2025-04-17)
**Author:** David Hill

---

## 📋 Table of Contents

1.  [Overview](#-overview)
2.  [Features](#-features)
3.  [Tools Included](#-tools-included)
    - [Record Checker](#record-checker)
    - [IP Checker](#ip-checker)
    - [Email Deliverability Tester](#email-deliverability-tester)
    - [Email Authentication Wizard](#email-authentication-wizard)
    - [Email Header Analyzer](#email-header-analyzer)
    - [Have I Been Pwned? Checker](#have-i-been-pwned-checker)
4.  [Technology Stack](#-technology-stack)
5.  [Architecture](#-architecture)
6.  [Email Authentication Scoring Methodology](#-email-authentication-scoring-methodology)
7.  [API Documentation](#-api-documentation)
    - [Overview Endpoint](#overview-endpoint)
    - [Record-Specific Endpoints](#record-specific-endpoints)
    - [Reputation Endpoint](#reputation-endpoint)
    - [IP Info Endpoint](#ip-info-endpoint)
    - [Email Test Endpoint](#email-test-endpoint)
    - [Authentication Verification Endpoint](#authentication-verification-endpoint)
    - [Pwned Check Endpoint](#pwned-check-endpoint)
    - [Error Response Format](#error-response-format)
8.  [Setup and Installation (Local)](#-setup-and-installation-local)
9.  [Configuration](#-configuration)
10. [Deployment (Render)](#-deployment-render)
11. [Usage](#-usage)
12. [Error Handling & Logging](#-error-handling--logging)
13. [Security Considerations](#-security-considerations)
14. [License](#-license)
15. [Acknowledgements](#-acknowledgements)

---

## 🔍 Overview

The **Neozeit Comprehensive Domain & Email Toolkit** is a suite of web-based utilities designed for domain owners, email administrators, and security professionals. It provides tools to check, analyze, and improve email authentication (DMARC, SPF, DKIM), DNS records, domain/IP reputation, email deliverability, and security posture. The toolkit aims to centralize common email and domain diagnostic tasks into a single, user-friendly interface.

Key goals include:

- Validating email authentication configurations (DMARC, SPF, DKIM).
- Providing actionable insights and recommendations for improvement.
- Checking domain and IP reputation against blacklists.
- Analyzing email deliverability factors.
- Guiding users through the setup of email authentication protocols.
- Checking email addresses against known data breaches.
- Analyzing email headers for troubleshooting and security analysis.

---

## ✨ Features

- **Multi-Tool Integration**: Offers six distinct but related tools accessible from a unified navigation menu.
- **Comprehensive Record Checking**: Analyzes DMARC, SPF, DKIM (with multiple selector support), DNS (A, AAAA, MX, TXT), and Domain Reputation/Blacklisting.
- **Email Authentication Scoring**: Provides a detailed score (0-100%) and letter grade (A-F) based on DMARC, SPF, DKIM, DNS configuration, and Reputation. Includes component breakdowns.
- **Detailed Record Parsing & Visualization**: Presents raw record data alongside parsed, human-readable breakdowns with explanations for various tags and mechanisms. Includes visual summaries for DMARC and SPF.
- **Actionable Recommendations**: Generates specific suggestions based on analysis results to improve security and deliverability. Recommendations are prioritized (High, Medium, Low).
- **IP Information & Reputation**: Fetches geolocation, network details (ISP, ASN), and reputation data for IP addresses. Checks IP against blacklists.
- **Email Deliverability Testing**: Performs basic checks and _simulated_ advanced tests (no actual email sent in the provided code) analyzing authentication, content, and infrastructure.
- **Interactive Email Authentication Wizard**: Step-by-step guide for configuring SPF, DKIM, and DMARC with provider-specific instructions (Google Workspace, Microsoft 365, Zoho, Amazon SES, Mailchimp, SendGrid, Custom, Other). Includes verification steps.
- **Email Header Analysis**: Parses raw email headers to display authentication results, email journey visualization, hop timeline, important headers (From, To, Subject, Message-ID, etc.), and potential security issues.
- **Pwned Email Checker**: Integrates with the Have I Been Pwned (HIBP) API v3 to check if an email address has appeared in known data breaches. **Requires HIBP API Key.**
- **Domain Intelligence (Optional)**: Pluggable OSINT provider integrations to surface domain exposure signals (e.g., stealer logs, credentials, mentions). Requires provider API keys if enabled.
- **Domain Reputation & Blacklist Check**: Queries numerous DNSBL (IP-based) and RHSBL/SURBL (Domain-based) blacklists.
- **Responsive Design**: Adapts to various screen sizes (desktop, tablet, mobile) using CSS media queries.
- **Mobile Enhancements**: Includes touch-friendly interactions, optimized layout, and specific handlers for mobile devices.
- **Dark/Light Mode**: User-selectable theme preference stored in localStorage.
- **Lookup History**: Client-side history tracking for recent domain/IP/email/header checks, stored in localStorage.
- **Asynchronous Operations**: Uses `asyncio` and `aiohttp` for non-blocking DNS lookups and API calls in the backend.
- **Robust Error Handling**: Custom exception classes and detailed error messages with suggestions for DNS lookups, API calls, and validation.
- **Configuration Management**: Supports environment variables for configuration (e.g., API keys). Uses `python-dotenv` for local development.
- **Deployment Ready**: Configured for deployment on Render via `render.yaml` and uses `gunicorn` for production serving.
- **Logging**: Comprehensive backend logging, including error logging to `dmarc_errors.log`.

---

## 🛠️ Tools Included

### Record Checker

- **Functionality**: The main tool for checking various DNS records related to a domain.
- **Checks**: DMARC, SPF, DKIM (specify selectors), DNS (A, AAAA, MX, TXT), Domain Reputation (Blacklisting).
- **Features**: Overview mode (checks all + calculates score), individual record checks, detailed parsing, recommendations, authentication score.
- **Files**: `templates/index.html`, `static/js/main.js`, `static/js/modules/api.js`, `static/js/modules/recordDisplay.js`, `static/js/modules/recordParsers.js`, `static/js/modules/score.js`, `static/js/score_methodology.js`, `dmarc_lookup.py`, `reputation_check.py`, `app.py` (API routes).

### IP Checker

- **Functionality**: Retrieves information about a specific IP address or the user's current public IP.
- **Checks**: Geolocation (City, Region, Country, Coordinates), Network Info (ISP, ASN, Timezone), IP Version (IPv4/IPv6), basic IP Reputation (placeholder in provided code).
- **Features**: Input IP or auto-detect user's IP, copy IP button.
- **Files**: `templates/ip_checker.html`, `static/js/ip_checker.js`, `static/js/modules/ip_tools.js`, `static/js/modules/ip_display.js`, `ip_checker.py`, `app.py` (API route).

### Email Deliverability Tester

- **Functionality**: Assesses factors affecting email deliverability for a domain. **Note:** The provided `email_tester.py` code _simulates_ sending/analysis rather than actually sending emails.
- **Checks**: Simulates checks for SPF, DKIM, DMARC authentication, spam factors (subject, content), and basic infrastructure (DNS records).
- **Features**: Calculates a deliverability score, provides authentication results, simulated spam analysis, and recommendations. Offers "Quick Test" (basic domain/email) and a non-functional "Advanced Test" UI (meant for simulation).
- **Files**: `templates/email_tester.html`, `static/js/email_tester.js`, `static/js/modules/email_tools.js`, `email_tester.py`, `app.py` (API route).

### Email Authentication Wizard

- **Functionality**: An interactive, step-by-step guide to help users configure SPF, DKIM, and DMARC for their domain.
- **Features**: Provider selection (Google, Microsoft, Zoho, SES, Mailchimp, SendGrid, Custom, Other), domain check, provider-specific instructions, recommended record generation, copy-to-clipboard, verification steps for each protocol.
- **Files**: `templates/auth_wizard.html`, `static/js/email_auth_wizard.js`, `auth_verification.py`, `app.py` (API route).

### Email Header Analyzer

- **Functionality**: Parses and analyzes raw email headers to troubleshoot delivery issues or investigate suspicious emails.
- **Checks**: Authentication results (SPF, DKIM, DMARC from `Authentication-Results` header), email path (hops), timing delays between hops, important headers (From, To, Subject, Message-ID, etc.), potential security issues (e.g., domain mismatch, spam flags).
- **Features**: Raw header input, authentication summary, email journey visualization, timeline view, important headers table, security issue list, load sample headers. All analysis is client-side in the browser.
- **Files**: `templates/header_analyzer.html`, `static/js/header_analyzer.js`, `static/js/modules/header_analysis.js`.

### Have I Been Pwned? Checker

- **Functionality**: Checks if an email address has been exposed in known data breaches using the Have I Been Pwned (HIBP) API v3.
- **Features**: Email input, displays breach details (site, date, compromised data types) if found, or confirms if no breaches were found.
- **Requires**: A valid HIBP API Key set as an environment variable (`HIBP_API_KEY`).
- **Files**: `templates/pwned_checker.html`, `static/js/pwned_checker.js`, `app.py` (API route).

### Domain Intelligence (Stealer/Leak Signals)

- **Functionality**: Optional domain search that queries configured OSINT providers for potential exposure signals tied to a domain (e.g., stealer logs, credential dumps, mentions/pastes).
- **Providers (pluggable)**: IntelligenceX, LeakCheck.io (add more by extending `domain_intel.py`).
- **Requires**: Provider API keys set via environment variables. Without keys, the UI shows providers as "Not configured" and skips them.
- **Files**: `domain_intel.py` (provider aggregation), `app.py` (`GET /api/domain-intel`), `templates/pwned_checker.html`, `static/js/pwned_checker.js`.

---

## 💻 Technology Stack

- **Backend**:
  - Framework: Flask
  - Language: Python 3.9+
  - Asynchronous Operations: `asyncio`, `aiohttp`
  - DNS Resolution: `dnspython`
  - IP Address Handling: `ipaddress` (standard library)
  - Environment Variables: `python-dotenv` (for local development)
  - WSGI Server (Production): `gunicorn`
- **Frontend**:
  - HTML5
  - CSS3 (Modular structure: base, layout, components, features, responsive)
  - JavaScript (ES6 Modules, Vanilla JS - no frameworks)
- **APIs Used**:
  - Have I Been Pwned (HIBP) API v3 (Requires API Key)
  - ipapi.co (Primary IP Geolocation - fallback to ipinfo.io)
- **Deployment**:
  - Platform: Render (configured via `render.yaml`)

---

## 🏗️ Architecture

- **Backend (`app.py`)**:
  - A Flask application serving HTML templates and providing RESTful API endpoints for various checks.
  - Uses `asyncio` and `aiohttp` for performing asynchronous DNS lookups and external API calls efficiently.
  - Separates concerns into different Python modules (`dmarc_lookup.py`, `reputation_check.py`, `ip_checker.py`, `email_tester.py`, `auth_verification.py`, `error_handling.py`).
  - Employs a centralized error handling mechanism (`error_handling.py`) with custom exceptions and user-friendly suggestions.
  - Uses `gunicorn` via `gunicorn_config.py` for production deployment.
- **Frontend (`static/`, `templates/`)**:
  - Standard HTML templates rendered by Flask.
  - Modular CSS using `@import` for organization and maintainability (`static/css/main.css` imports others).
  - Modular JavaScript using ES6 Modules (`static/js/modules/`). Each tool/feature often has its own main JS file (`static/js/main.js`, `static/js/ip_checker.js`, etc.) that imports necessary modules.
  - Client-side logic handles UI interactions, API calls to the Flask backend, result display, history, theme toggling, and mobile enhancements.
  - Email Header Analyzer performs all parsing and analysis client-side for privacy.

---

## 📊 Email Authentication Scoring Methodology

The "Authentication Score" provided in the Record Checker's Overview mode gives a quantitative measure of a domain's email authentication health. The score (0-100) and corresponding letter grade (A-F) are calculated based on the presence and configuration strength of DMARC, SPF, DKIM, DNS records, and Domain Reputation.

**Component Weights:**

- **DMARC (30 points max)**
  - Record Presence: +15 points
  - Policy (`p=` tag):
    - `reject`: +15 points
    - `quarantine`: +10 points
    - `none`: +5 points
  - Aggregate Reporting (`rua=` tag): +5 points (Bonus, capped at max score)
- **SPF (25 points max)**
  - Record Presence: +15 points
  - `all` Mechanism:
    - `-all` (Hard Fail): +10 points
    - `~all` (Soft Fail): +5 points
    - `?all` (Neutral): +2 points
    - `+all` (Pass - Insecure): 0 points
    - Missing `all`: 0 points
  - Includes Sending Sources (e.g., `include:`, `ip4:`, `a`, `mx`): +5 points (Bonus, capped at max score)
  - _Penalty_: >10 DNS lookups (potential warning, may reduce score slightly in future versions).
- **DKIM (20 points max)**
  - At least one valid DKIM record found: +15 points
  - Multiple valid DKIM records found: +2 points per additional selector (up to +5 bonus, capped at max score)
- **DNS Configuration (10 points max)**
  - MX Records Present: +5 points
  - A/AAAA Records Present: +3 points
  - TXT Records Present (beyond SPF/DMARC/DKIM): +2 points
- **Domain Reputation (15 points max)**
  - Base score based on Reputation Check Score (0-100 from `reputation_check.py`):
    - 90-100: +15 points
    - 70-89: +12 points
    - 50-69: +8 points
    - 30-49: +4 points
    - 0-29: +0 points
  - Blacklist Status:
    - Not Blacklisted: +5 points (Bonus, capped at max score)
    - Blacklisted: Penalty based on severity/count (-8 to -12 points)

**Letter Grade Interpretation:**

- **A (90-100%)**: Excellent protection.
- **B (80-89%)**: Good protection, minor improvements possible.
- **C (70-79%)**: Moderate protection, improvements recommended.
- **D (60-69%)**: Minimal protection, significant improvements needed.
- **F (0-59%)**: Inadequate protection, vulnerable.

_Note: This methodology prioritizes security best practices._

---

## 📚 API Documentation

The backend provides several RESTful API endpoints:

### Overview Endpoint

- **Endpoint**: `GET /api/overview`
- **Query Parameters**:
  - `domain` (string, required): The domain to check.
- **Description**: Fetches DMARC, SPF, DKIM (default selectors), DNS, and Reputation records for the domain and returns a consolidated overview.
- **Success Response (200 OK)**:
  ```json
  {
    "records": [
      { "title": "DMARC", "value": { ...dmarc_data }, "parsed_record": { ... }, "status": "success|error" },
      { "title": "SPF", "value": { ...spf_data }, "parsed_record": { ... }, "status": "success|error" },
      { "title": "DKIM", "value": { ...dkim_data }, "parsed_record": {}, "status": "success|error" },
      { "title": "DNS", "value": { ...dns_data }, "parsed_record": { ... }, "status": "success|error" },
      { "title": "REPUTATION", "value": { ...rep_data }, "parsed_record": { ...rep_data }, "status": "success|error" }
    ]
  }
  ```

### Record-Specific Endpoints

- **Endpoint**: `GET /api/{record_type}`
  - `record_type` can be `dmarc`, `spf`, `dkim`, `dns`.
- **Query Parameters**:
  - `domain` (string, required): The domain to check.
  - `selectors` (string, optional, comma-separated): Required only for `record_type=dkim`. Specifies DKIM selectors to check. Defaults are used if omitted for DKIM overview.
- **Description**: Fetches data for the specified record type.
- **Success Response (200 OK)**: Varies based on `record_type`, generally contains raw and parsed data.
  - Example (`/api/dmarc?domain=example.com`):
    ```json
    {
      "dmarc_records": ["\"v=DMARC1; p=reject; rua=mailto:agg@example.com\""],
      "parsed_record": {"v": "DMARC1", "p": "reject", "rua": "mailto:agg@example.com"},
      "recommendations": [ ... ]
    }
    ```
  - Example (`/api/dkim?domain=example.com&selectors=google,s1`):
    ```json
    {
      "google": { "dkim_records": [...], "parsed_records": [...], "status": "success" },
      "s1": { "error": "No DKIM record found...", "error_code": "...", "status": "error", "suggestions": [...] },
      "overall_status": "success"
    }
    ```

### Reputation Endpoint

- **Endpoint**: `GET /api/reputation`
- **Query Parameters**:
  - `domain` (string, required): The domain to check.
- **Description**: Checks the domain's reputation against various blacklists.
- **Success Response (200 OK)**:
  ```json
  {
      "blacklisted": false,
      "blacklist_count": 0,
      "total_services": 58,
      "blacklist_details": [],
      "domain_services": { ... },
      "ip_services": { ... },
      "reputation_score": 100,
      "recommendations": [ ... ],
      "service_names": { ... },
      "parsed_record": { ... } // Copy of the main data for consistency
  }
  ```

### IP Info Endpoint

- **Endpoint**: `GET /api/ip-info`
- **Query Parameters**:
  - `ip` (string, optional): IP address to check. If omitted, checks the client's requesting IP.
- **Description**: Retrieves geolocation and network information for an IP address.
- **Success Response (200 OK)**:
  ```json
  {
      "ip": "...",
      "version": "IPv4|IPv6",
      "city": "...",
      "region": "...",
      "country": "...",
      "location": { "latitude": ..., "longitude": ... },
      "isp": "...",
      "timezone": "...",
      "asn": "...",
      "reputation": { ... }, // Basic placeholder reputation
      "recommendations": [ ... ]
  }
  ```

### Email Test Endpoint

- **Endpoint**: `POST /api/email-test`
- **Request Body (JSON)**:
  ```json
  {
    "from_email": "sender@example.com",
    "domain": "example.com",
    "test_type": "basic", // or "advanced"
    // --- Optional for advanced ---
    "from_name": "Sender Name",
    "subject": "Test Subject",
    "content": "Test email body.",
    "test_email": "target-test@example.net", // Where to send (if not simulated)
    "simulate": true // If true, simulates without sending
  }
  ```
- **Description**: Runs a basic or (simulated) advanced email deliverability test.
- **Success Response (200 OK)**:
  ```json
  {
      "score": 85,
      "auth_results": { "spf": { ... }, "dkim": { ... }, "dmarc": { ... } },
      "spam_analysis": { "score": ..., "factors": [ ... ] },
      "recommendations": [ ... ],
      "domain": "...",
      "email": "...",
      "test_type": "...",
      "simulated": true,
      "headers": "...", // Simulated headers if simulated=true
      "infrastructure": { ... }
  }
  ```

### Authentication Verification Endpoint

- **Endpoint**: `POST /api/verify-auth`
- **Request Body (JSON)**:
  ```json
  {
    "domain": "example.com",
    "record_type": "spf", // "spf", "dkim", "dmarc", or "all"
    // --- Optional for dkim/all ---
    "dkim_selector": "google" // or "selectors": ["google", "s1"]
  }
  ```
- **Description**: Verifies the live configuration of specified authentication records (SPF, DKIM, DMARC) or all of them.
- **Success Response (200 OK)**: Structure depends on `record_type`.
  - Example (`record_type=all`):
    ```json
    {
        "domain": "example.com",
        "verification_date": "...",
        "records": {
            "spf": { "status": "success", ... },
            "dkim": { "status": "success", ... },
            "dmarc": { "status": "warning", ... }
        },
        "overall_status": {
            "status": "warning",
            "message": "Partial Email Authentication",
            "description": "...",
            "authentication_methods": { "spf": "success", ... },
            "recommendations": [ ... ]
        }
    }
    ```

### Pwned Check Endpoint

- **Endpoint**: `GET /api/check-pwned`
- **Query Parameters**:
  - `email` (string, required): The email address to check.
- **Requires**: `HIBP_API_KEY` environment variable must be set on the server.
- **Description**: Checks the email against the Have I Been Pwned database.
- **Success Response (200 OK)**:
  - If pwned:
    ```json
    {
      "status": "pwned",
      "breaches": [ { "Name": "...", "Domain": "...", ... } ]
    }
    ```
  - If not pwned:
    ```json
    { "status": "not_pwned" }
    ```

### Domain Intel Endpoint

- **Endpoint**: `GET /api/domain-intel`
- **Query Parameters**:
  - `domain` (string, required): The domain to search (e.g., `example.com`).
- **Requires**: Provider API keys for meaningful results (see Configuration). If none are configured, the endpoint still responds successfully with each provider marked as `not_configured`.
- **Description**: Queries configured OSINT providers concurrently and returns a normalized summary of findings and per-provider details.
- **Success Response (200 OK)**:
  ```json
  {
    "domain": "example.com",
    "providers": {
      "intelx": {
        "provider": "intelx",
        "configured": true,
        "status": "ok",
        "findings_count": 3,
        "findings": [
          {"type": "mention", "title": "...", "source": "IntelX", "date": "2024-05-01", "metadata": {...}}
        ]
      },
      "leakcheck": { "configured": false, "status": "not_configured" }
    },
    "summary": { "total_findings": 3, "categories": { "mention": 3 } }
  }
  ```
- **Error Response (500)**: Standard error format with `error_code: "DOMAIN_INTEL_ERROR"` if an unexpected exception occurs.

### Error Response Format

API errors generally follow this format:

```json
{
  "error": "Descriptive error message",
  "error_code": "ERROR_CODE_IDENTIFIER",
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}
```

_Common HTTP Status Codes Used_: 200 (OK), 400 (Bad Request), 401 (Unauthorized - HIBP), 403 (Forbidden - HIBP), 404 (Not Found), 429 (Rate Limited - HIBP), 500 (Internal Server Error), 503 (Service Unavailable), 504 (Gateway Timeout).

---

## ⚙️ Setup and Installation (Local)

1. **Prerequisites**:
   - Python 3.9 or higher installed.
   - `pip` (Python package installer).
2. **Clone the Repository**:
   ```bash
   git clone <repository_url>
   cd DMARC-Checker
   ```
3. **Create a Virtual Environment** (Recommended):
   ```bash
   python -m venv venv
   # Activate the environment
   # Windows:
   .\venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
4. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
5. **Configure Environment Variables**:
   - Create a file named `.env` in the project root (`DMARC-Checker`).
   - Add the required environment variables, especially the HIBP API Key:
     ```dotenv
     HIBP_API_KEY=your_haveibeenpwned_api_key_here
     # Add any other environment-specific variables if needed
     ```
   - **Important**: Get your HIBP API key from [Have I Been Pwned](https://haveibeenpwned.com/API/Key). The Pwned Checker tool will _not_ work without it.
6. **Run the Application**:
   ```bash
   flask run
   ```
   Or using gunicorn (similar to production):
   ```bash
   gunicorn app:app -c gunicorn_config.py
   ```
7. **Access the Application**: Open your web browser and navigate to `http://127.0.0.1:5000` (or the port specified by Flask/Gunicorn).

---

## 🔧 Configuration

- **Gunicorn (`gunicorn_config.py`)**: Configures the Gunicorn WSGI server for production. Sets the bind address/port (`0.0.0.0:10000`), number of workers (4), and request timeout (180s).
- **Environment Variables (`.env` file locally)**:
  - `HIBP_API_KEY` (Required for Pwned Checker): Your API key from Have I Been Pwned.
  - `INTELX_API_KEY` (Optional): IntelligenceX API key to enable domain intelligence results.
  - `INTELX_BASE_URL` (Optional): Base URL for IntelX API (defaults to `https://free.intelx.io`).
  - `LEAKCHECK_API_KEY` (Optional): LeakCheck.io API key to enable domain intelligence results.
  - `LEAKCHECK_BASE_URL` (Optional): LeakCheck API endpoint (defaults to `https://leakcheck.io/api/public`).
  - `FLASK_ENV` (Optional): Set to `development` for Flask development mode (enables debugger, auto-reload). Defaults to `production`.
  - `PORT` (Optional): Port number for the server to listen on (primarily for deployment platforms like Render). Gunicorn config uses `10000`.
- **Blacklists (`reputation_check.py`)**: The `BLACKLISTS` list defines the DNSBL and domain-based blacklists used for reputation checks. This list can be updated.

---

## 🚀 Deployment (Render)

This application is pre-configured for easy deployment on [Render](https://render.com) using the `render.yaml` file.

1. **Fork Repository**: Fork this repository to your own GitHub account.
2. **Create Render Web Service**:
   - Log in to Render.
   - Click "New" -> "Web Service".
   - Connect your GitHub account and select the forked repository.
   - Render will automatically detect `render.yaml`.
3. **Configure Environment Variables**:
   - In the Render dashboard for your service, go to the "Environment" section.
   - Add an environment variable with the key `HIBP_API_KEY` and paste your HIBP API key as the value.
   - Render automatically sets the `PORT` environment variable.
   - Ensure `PYTHON_VERSION` is set correctly (e.g., `3.9.0` as specified in `render.yaml`).
4. **Deploy**: Click "Create Web Service". Render will build and deploy the application based on `render.yaml` instructions (install requirements, start Gunicorn).

The `render.yaml` configuration specifies:

- Service type: `web`
- Environment: `python`
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app -c gunicorn_config.py`
- Environment variables (like `PYTHON_VERSION`).

---

## ▶️ Usage

Access the deployed application via its URL or run it locally (`http://127.0.0.1:5000`).

- **Navigation**: Use the "Tools" dropdown in the header to switch between different utilities (Record Checker, IP Checker, etc.). Help and History are also accessible from the header.
- **Record Checker**: Enter a domain, select a record type ("Overview" for all), optionally add DKIM selectors, and click "Check Records". Results appear below.
- **IP Checker**: Enter an IP or click "Check My IP". Results show geolocation, network info, etc.
- **Email Tester**: Use the "Quick Test" panel. Enter your email and the domain you send from. Click "Run Test" for a simulated analysis.
- **Auth Wizard**: Follow the steps, selecting your provider and entering your domain. It provides instructions and recommended DNS records. Use the verification buttons after making DNS changes.
- **Header Analyzer**: Paste raw email headers into the text area and click "Analyze Headers". Results show authentication, path, timeline, etc.
- **Pwned Checker**: Enter an email address and click "Check Email" to see if it's in known breaches (requires server-side HIBP key).
- **Dark Mode**: Click the moon/sun icon in the top-right controls.
- **History**: Click the history icon in the header to view and reuse recent lookups.

---

## ⚠️ Error Handling & Logging

- **Custom Exceptions (`error_handling.py`)**: The backend uses custom exception classes (`DmarcError`, `DomainError`, `DnsLookupError`, etc.) for specific error types.
- **API Error Handler (`@api_error_handler`)**: A Flask decorator wraps API routes to catch exceptions and return standardized JSON error responses with messages, error codes, and suggestions.
- **DNS Error Mapping**: Specific `dnspython` exceptions (e.g., `NXDOMAIN`, `NoAnswer`, `Timeout`) are mapped to user-friendly error details.
- **Frontend Error Display**: Errors from the API are typically displayed within the results area of the relevant tool, often using specific CSS classes (`issue-error`, `issue-warning`). Toast notifications (`static/js/modules/toast.js`) are also used for warnings or brief errors.
- **Logging (`error_handling.py`, `app.py`)**:
  - Configured using Python's `logging` module.
  - Logs informational messages and errors during backend operations.
  - Errors (level `ERROR` and above) are logged to `dmarc_errors.log` in the project root. This file shows various `Domain does not exist` and `Timeout` errors from previous runs.
  - Log level is set to `DEBUG` in `error_handling.py`, providing detailed logs during development. Werkzeug (Flask's development server) logs are set to `INFO`.

---

## 🔒 Security Considerations

- **API Keys (HIBP, IntelX, LeakCheck)**: All keys are sensitive. **DO NOT** commit them directly into code or keep them in plaintext files like `apiKey.txt`. Use environment variables as implemented in `app.py`. Ensure the `.env` file (if used locally) is added to `.gitignore`. Configure keys securely in your deployment environment (like Render's environment variables). If a key was accidentally committed, rotate it immediately.
- **Input Validation**: Backend routes include validation for domain names (`is_valid_domain`) and IP addresses (`is_valid_ip`) to prevent basic injection or malformed requests. Further sanitization might be needed depending on usage context.
- **External API Timeouts**: Timeouts are implemented for external API calls (HIBP, IP Geolocation) to prevent requests from hanging indefinitely.
- **Client-Side Analysis**: The Email Header Analyzer performs all parsing on the client-side (in the user's browser) to avoid sending potentially sensitive email header data to the server.
- **Dependencies**: Keep dependencies (`requirements.txt`) updated to patch potential vulnerabilities. Regularly audit dependencies.

---

## 🙏 Acknowledgements

- [DNSPython](https://www.dnspython.org/): For robust DNS querying capabilities.
- [Flask](https://flask.palletsprojects.com/): For the backend web framework.
- [aiohttp](https://docs.aiohttp.org/): For asynchronous HTTP requests.
- [Have I Been Pwned (HIBP)](https://haveibeenpwned.com/): For the data breach checking service.
- [ipapi.co](https://ipapi.co/) & [ipinfo.io](https://ipinfo.io/): For IP geolocation services.
- [Font Awesome](https://fontawesome.com/): For icons used in the frontend.
- [Render](https://render.com): For hosting and deployment platform.
- [Gunicorn](https://gunicorn.org/): For production WSGI server.
- [DMARC.org](https://dmarc.org/), [SPF Project](http://www.open-spf.org/), [DKIM.org](http://dkim.org/): For standards and information on email authentication.
- Various DNSBL/RHSBL providers used in `reputation_check.py`.
