# 🛡️ Neozeit DMARC Checker

A comprehensive tool for checking and analyzing email authentication records (DMARC, SPF, DKIM, and DNS) to improve your domain's email security.

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Demo](#-demo)
- [Installation](#-installation)
- [Usage](#-usage)
- [Architecture](#-architecture)
- [Scoring Methodology](#-scoring-methodology)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)

## 🔍 Overview

Neozeit DMARC Checker is a web-based tool that helps domain owners and email administrators validate and analyze their email authentication configurations. It checks DMARC, SPF, DKIM, and DNS records to identify issues and provide actionable recommendations to improve email security.

Email authentication is crucial for protecting domains from spoofing, phishing, and spam. This tool makes it easy to validate your implementation and understand where improvements can be made.

## ✨ Features

- **Comprehensive Record Checking**: Analyze DMARC, SPF, DKIM, and DNS records in one place
- **Authentication Scoring**: Receive an overall email authentication score with letter grade
- **Detailed Parsing**: Visualize and understand each component of your authentication records
- **Actionable Recommendations**: Get specific suggestions to improve your email security
- **Multiple DKIM Selector Support**: Check multiple DKIM selectors simultaneously
- **Mobile-Friendly Design**: Responsive interface works on any device
- **Offline Detection**: Automatically detect network issues
- **Dark/Light Mode**: Choose your preferred theme
- **Search History**: Keep track of your previous lookups
- **Error Handling**: Intelligent error detection with helpful suggestions

## 🎬 Demo

![DMARC Checker Demo](demo.gif)

Live demo available at: [https://dmarc-checker.example.com](https://dmarc-checker.example.com)

## 📥 Installation

### Prerequisites

- Python 3.9 or higher
- pip (Python package installer)

### Deployment on Render

This application is configured to deploy on [Render](https://render.com) using the included `render.yaml` file.

1. Fork this repository to your GitHub account
2. Connect your GitHub account to Render
3. Create a new Web Service and select the forked repository
4. Render will automatically detect the configuration and deploy the application

## 🚀 Usage

1. Enter a domain name (e.g., example.com) in the domain field
2. Select the record type you want to check:
   - **Overview**: Check all records and get an overall score
   - **DMARC**: Check only DMARC records
   - **SPF**: Check only SPF records
   - **DKIM**: Check DKIM records (with customizable selectors)
   - **DNS**: Check general DNS records
3. For DKIM checks, add or remove selectors as needed
4. Click "Check Records" to analyze the domain
5. Review the results, recommendations, and authentication score

### Understanding Results

- **Authentication Score**: The overall score (0-100%) with letter grade (A-F)
- **Component Scores**: Individual scores for DMARC, SPF, DKIM, and DNS
- **Record Breakdown**: Visual representation of each record with explanations
- **Recommendations**: Actionable suggestions to improve your configuration

## 🏗️ Architecture

The application is built with a modern architecture that separates concerns and promotes maintainability:

```
dmarc-checker/
├── app.py                 # Main Flask application
├── dmarc_lookup.py        # Core DNS lookup functionality
├── error_handling.py      # Centralized error handling
├── gunicorn_config.py     # Configuration for production server
├── render.yaml            # Deployment configuration
├── requirements.txt       # Python dependencies
├── static/                # Static assets
│   ├── css/               # Stylesheets
│   ├── images/            # Images and icons
│   └── js/                # JavaScript modules
│       ├── modules/       # Modular JS components
│       ├── main.js        # Main entry point
│       └── ...
└── templates/             # HTML templates
    └── index.html         # Main application template
```

### Frontend

- Built with vanilla JavaScript using ES6 modules for better organization
- Responsive design using CSS Grid and Flexbox
- Progressive enhancement for cross-browser compatibility
- Mobile-first approach with touch-optimized interactions

### Backend

- Flask web framework for routing and API endpoints
- Asynchronous DNS resolution using `dnspython`
- Custom error handling with detailed error classification
- RESTful API design for record lookups

## 📊 Scoring Methodology

The Email Authentication Score is calculated based on four key components with weighted importance:

### DMARC (35%)
- Having a DMARC record: 15 points
- Policy strength:
  - Reject (p=reject): 15 points
  - Quarantine (p=quarantine): 10 points
  - None (p=none): 5 points
- Aggregate reporting (rua tag): 5 points

### SPF (30%)
- Having an SPF record: 15 points
- Policy strength:
  - Hard fail (-all): 10 points
  - Soft fail (~all): 5 points
  - Neutral (?all): 2 points
  - Pass (+all): 0 points (security risk)
- Including required sending sources: 5 points

### DKIM (25%)
- Having at least one valid DKIM selector: 15 points
- Multiple valid DKIM selectors: up to 10 additional points

### DNS Configuration (10%)
- MX records properly configured: 5 points
- A/AAAA records properly configured: 3 points
- TXT records properly configured: 2 points

### Letter Grade Interpretation
- **A (90-100%)**: Excellent protection
- **B (80-89%)**: Good protection with minor improvements possible
- **C (70-79%)**: Moderate protection with several improvements recommended
- **D (60-69%)**: Minimal protection with significant improvements needed
- **F (0-59%)**: Inadequate protection

This scoring system prioritizes security best practices and follows industry recommendations from M3AAWG, NIST, and the DMARC.org organization.

## 📚 API Documentation

The application provides a RESTful API for programmatic access to DNS record checking:

### Overview Endpoint

```
GET /api/overview?domain={domain}
```

Returns an overview of all record types for the specified domain.

### Record-Specific Endpoints

```
GET /api/{record_type}?domain={domain}
```

Where `{record_type}` can be:
- `dmarc`: Check DMARC records
- `spf`: Check SPF records
- `dkim`: Check DKIM records
- `dns`: Check DNS records

For DKIM checks, you can specify selectors:

```
GET /api/dkim?domain={domain}&selectors={selector1},{selector2},...
```

### Response Format

All API endpoints return JSON responses with the following structure:

```json
{
  "records": [
    {
      "title": "RECORD_TYPE",
      "value": { /* record data */ },
      "parsed_record": { /* parsed data */ },
      "status": "success|error"
    }
  ]
}
```

For error responses:

```json
{
  "error": "Error message",
  "error_code": "ERROR_CODE",
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [DNSPython](https://www.dnspython.org/) for DNS resolution
- [Flask](https://flask.palletsprojects.com/) for the web framework
- [Font Awesome](https://fontawesome.com/) for icons
- [DMARC.org](https://dmarc.org/) for DMARC specifications and guidelines
- All the open-source contributors who have helped improve this project

---

<p align="center">
  Made with ❤️ by <a href="https://the-website.onrender.com](https://the-website-cfgj.onrender.com">David Hill</a>
</p>
