// header_analysis.js - Functions for analyzing email headers

import { showToast } from "./toast.js";

/**
 * Analyze email headers
 * @param {string} rawHeaders - Raw email headers as text
 * @returns {Object} Analysis results
 */
export async function analyzeHeaders(rawHeaders) {
  try {
    // Parse the headers into an object
    const parsedHeaders = parseHeaders(rawHeaders);

    if (!parsedHeaders || Object.keys(parsedHeaders).length === 0) {
      showToast("Unable to parse headers", "error");
      return null;
    }

    // Extract authentication results
    const authentication = extractAuthenticationResults(parsedHeaders);

    // Extract journey information
    const journey = extractJourney(parsedHeaders);

    // Create timeline
    const timeline = createTimeline(parsedHeaders);

    // Extract important headers
    const importantHeaders = extractImportantHeaders(parsedHeaders);

    // Identify security issues
    const securityIssues = identifySecurityIssues(
      parsedHeaders,
      authentication
    );

    // Return the complete analysis
    return {
      authentication,
      journey,
      timeline,
      importantHeaders,
      securityIssues,
      rawHeaders,
    };
  } catch (error) {
    console.error("Error analyzing headers:", error);
    throw error;
  }
}

/**
 * Parse raw headers into an object
 * @param {string} rawHeaders - Raw email headers as text
 * @returns {Object} Parsed headers
 */
function parseHeaders(rawHeaders) {
  if (!rawHeaders) return {};

  const headers = {};
  let currentHeader = null;
  let currentValue = "";

  // Split by lines
  const lines = rawHeaders.split(/\r?\n/);

  for (const line of lines) {
    // If line starts with whitespace, it's a continuation of the previous header
    if (/^\s+/.test(line) && currentHeader) {
      currentValue += " " + line.trim();
    } else {
      // New header
      const match = line.match(/^([^:]+):\s*(.*)/);

      // If we had a previous header, save it before moving to the new one
      if (currentHeader) {
        headers[currentHeader.toLowerCase()] = currentValue.trim();
      }

      if (match) {
        currentHeader = match[1].trim();
        currentValue = match[2].trim();
      } else {
        // Not a valid header line, skip
        continue;
      }
    }
  }

  // Save the last header
  if (currentHeader) {
    headers[currentHeader.toLowerCase()] = currentValue.trim();
  }

  return headers;
}

/**
 * Extract authentication results from headers
 * @param {Object} headers - Parsed headers
 * @returns {Object} Authentication results
 */
function extractAuthenticationResults(headers) {
  const authResults = {
    spf: { status: "none", details: "No SPF information found" },
    dkim: { status: "none", details: "No DKIM information found" },
    dmarc: { status: "none", details: "No DMARC information found" },
  };

  // Look for Authentication-Results header
  const authHeader = headers["authentication-results"] || "";

  // Parse SPF result
  const spfMatch = authHeader.match(/spf=(\w+)/i);
  if (spfMatch) {
    const status = spfMatch[1].toLowerCase();
    authResults.spf.status =
      status === "pass"
        ? "pass"
        : status === "fail" || status === "softfail"
        ? "fail"
        : "neutral";

    authResults.spf.details = `SPF ${status}${getAuthResultDetails(
      authHeader,
      "spf"
    )}`;
  }

  // Parse DKIM result
  const dkimMatch = authHeader.match(/dkim=(\w+)/i);
  if (dkimMatch) {
    const status = dkimMatch[1].toLowerCase();
    authResults.dkim.status =
      status === "pass" ? "pass" : status === "fail" ? "fail" : "neutral";

    authResults.dkim.details = `DKIM ${status}${getAuthResultDetails(
      authHeader,
      "dkim"
    )}`;
  }

  // Parse DMARC result
  const dmarcMatch = authHeader.match(/dmarc=(\w+)/i);
  if (dmarcMatch) {
    const status = dmarcMatch[1].toLowerCase();
    authResults.dmarc.status =
      status === "pass" ? "pass" : status === "fail" ? "fail" : "neutral";

    authResults.dmarc.details = `DMARC ${status}${getAuthResultDetails(
      authHeader,
      "dmarc"
    )}`;
  }

  // Additional check for ARC authentication
  if (headers["arc-authentication-results"]) {
    // Only use ARC if regular auth results are missing
    if (authResults.spf.status === "none") {
      const arcSpfMatch =
        headers["arc-authentication-results"].match(/spf=(\w+)/i);
      if (arcSpfMatch) {
        const status = arcSpfMatch[1].toLowerCase();
        authResults.spf.status =
          status === "pass"
            ? "pass"
            : status === "fail" || status === "softfail"
            ? "fail"
            : "neutral";
        authResults.spf.details = `SPF ${status} (from ARC)`;
      }
    }

    if (authResults.dkim.status === "none") {
      const arcDkimMatch =
        headers["arc-authentication-results"].match(/dkim=(\w+)/i);
      if (arcDkimMatch) {
        const status = arcDkimMatch[1].toLowerCase();
        authResults.dkim.status =
          status === "pass" ? "pass" : status === "fail" ? "fail" : "neutral";
        authResults.dkim.details = `DKIM ${status} (from ARC)`;
      }
    }
  }

  return authResults;
}

/**
 * Get additional details for authentication results
 * @param {string} authHeader - Authentication-Results header
 * @param {string} mechanism - Authentication mechanism (spf, dkim, dmarc)
 * @returns {string} Additional details
 */
function getAuthResultDetails(authHeader, mechanism) {
  let details = "";

  // Different regex patterns based on the mechanism
  let pattern;
  switch (mechanism) {
    case "spf":
      pattern = new RegExp(`${mechanism}=[\\w\\s]+\\((.+?)\\)`, "i");
      break;
    case "dkim":
      pattern = new RegExp(`${mechanism}=[\\w\\s]+\\((.+?)\\)`, "i");
      break;
    case "dmarc":
      pattern = new RegExp(`${mechanism}=[\\w\\s]+\\((.+?)\\)`, "i");
      break;
    default:
      return details;
  }

  const match = authHeader.match(pattern);
  if (match && match[1]) {
    details = ` (${match[1].trim()})`;
  }

  return details;
}

/**
 * Extract email journey information from headers
 * @param {Object} headers - Parsed headers
 * @returns {Array} Journey information
 */
function extractJourney(headers) {
  const journey = [];

  // Start with sender information
  if (headers.from) {
    const fromMatch = headers.from.match(/([^<]+)?<?([^>]+)>?/);
    const fromName = fromMatch && fromMatch[1] ? fromMatch[1].trim() : "Sender";
    const fromEmail =
      fromMatch && fromMatch[2] ? fromMatch[2].trim() : headers.from;

    journey.push({
      label: "Sender",
      icon: "fa-user",
      time: formatDate(headers.date),
      details: fromEmail,
    });
  } else {
    journey.push({
      label: "Sender",
      icon: "fa-user",
      time: formatDate(headers.date),
    });
  }

  // Process received headers to extract journey
  const receivedHeaders = extractReceivedHeaders(headers);

  // Skip first hop if it matches the last one (common in some email systems)
  const intermediateHops =
    receivedHeaders.length > 2 ? receivedHeaders.slice(0, -1) : receivedHeaders;

  // Add intermediate hops
  if (intermediateHops.length > 0) {
    intermediateHops.forEach((hop, index) => {
      if (index === 0 && journey.length > 0) return; // Skip if it's the first and we already have a sender

      journey.push({
        label: getServerName(hop.from),
        icon: "fa-server",
        time: formatDate(hop.date),
      });
    });
  }

  // Add recipient information
  if (headers.to) {
    const toMatch = headers.to.match(/([^<]+)?<?([^>]+)>?/);
    const toName = toMatch && toMatch[1] ? toMatch[1].trim() : "Recipient";
    const toEmail = toMatch && toMatch[2] ? toMatch[2].trim() : headers.to;

    journey.push({
      label: "Recipient",
      icon: "fa-inbox",
      time: null,
      details: toEmail,
    });
  } else {
    journey.push({
      label: "Recipient",
      icon: "fa-inbox",
      time: null,
    });
  }

  return journey;
}

/**
 * Extract received headers in chronological order
 * @param {Object} headers - Parsed headers
 * @returns {Array} Received headers
 */
function extractReceivedHeaders(headers) {
  const receivedList = [];

  // Look for all received headers
  for (const [key, value] of Object.entries(headers)) {
    if (key.startsWith("received") || key === "received") {
      const fromMatch = value.match(/from\s+([^\s;]+)/i);
      const byMatch = value.match(/by\s+([^\s;]+)/i);
      const dateMatch = value.match(/;\s*(.+?)(?:\s*\(.*\)\s*)?$/);

      const receivedHeader = {
        from: fromMatch ? fromMatch[1] : "unknown",
        by: byMatch ? byMatch[1] : "unknown",
        date: dateMatch ? new Date(dateMatch[1]) : null,
        raw: value,
      };

      receivedList.push(receivedHeader);
    }
  }

  // Sort by date (most recent first, which is typically the order in headers)
  receivedList.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date - a.date;
  });

  return receivedList;
}

/**
 * Create a timeline of email transmission
 * @param {Object} headers - Parsed headers
 * @returns {Array} Timeline information
 */
function createTimeline(headers) {
  const timeline = [];
  const receivedHeaders = extractReceivedHeaders(headers);

  // Start with the original sending time
  if (headers.date) {
    const sentDate = new Date(headers.date);
    if (!isNaN(sentDate.getTime())) {
      timeline.push({
        time: formatDate(sentDate),
        server: "Sender",
        details: "Message was sent",
      });
    }
  }

  // Add each received header as a timeline entry
  let previousDate = headers.date ? new Date(headers.date) : null;

  // Process in reverse order to show chronological flow
  for (let i = receivedHeaders.length - 1; i >= 0; i--) {
    const hop = receivedHeaders[i];
    if (!hop.date) continue;

    // Calculate delay if we have a previous date
    let delay = null;
    if (previousDate && hop.date) {
      const delayMs = hop.date.getTime() - previousDate.getTime();
      const delaySeconds = Math.round(delayMs / 1000);

      if (delaySeconds > 0) {
        const delayText = formatDelay(delaySeconds);

        // Determine if delay is concerning
        let severity = "normal";
        if (delaySeconds > 600) {
          // More than 10 minutes
          severity = "critical";
        } else if (delaySeconds > 60) {
          // More than 1 minute
          severity = "warning";
        }

        delay = {
          text: `+${delayText}`,
          severity: severity,
        };
      }
    }

    timeline.push({
      time: formatDate(hop.date),
      server: `${hop.from} → ${hop.by}`,
      details: "Message was processed",
      delay: delay,
    });

    previousDate = hop.date;
  }

  return timeline;
}

/**
 * Extract important headers for display
 * @param {Object} headers - Parsed headers
 * @returns {Object} Important headers with explanations
 */
function extractImportantHeaders(headers) {
  const importantHeaders = {};

  // Define headers to extract with explanations
  const headersList = {
    "message-id": {
      value: headers["message-id"] || "",
      explanation: "A unique identifier for this email message",
    },
    from: {
      value: headers.from || "",
      explanation: "The sender's email address",
    },
    to: {
      value: headers.to || "",
      explanation: "The recipient's email address",
    },
    "reply-to": {
      value: headers["reply-to"] || "",
      explanation: "The address that will receive replies to this email",
    },
    subject: {
      value: headers.subject || "",
      explanation: "The email subject line",
    },
    date: {
      value: headers.date || "",
      explanation: "When the email was sent",
    },
    "content-type": {
      value: headers["content-type"] || "",
      explanation: "The format of the email content",
    },
    "x-mailer": {
      value: headers["x-mailer"] || headers["user-agent"] || "",
      explanation: "The software used to send the email",
    },
    "return-path": {
      value: headers["return-path"] || "",
      explanation: "The address where bounces and automatic replies are sent",
    },
  };

  // Add headers that exist
  for (const [name, info] of Object.entries(headersList)) {
    if (info.value) {
      importantHeaders[name] = info;
    }
  }

  return importantHeaders;
}

/**
 * Identify security issues in headers
 * @param {Object} headers - Parsed headers
 * @param {Object} authentication - Authentication results
 * @returns {Array} Security issues
 */
function identifySecurityIssues(headers, authentication) {
  const issues = [];

  // Check for SPF failures
  if (authentication.spf.status === "fail") {
    issues.push({
      title: "SPF Authentication Failure",
      description:
        "The email failed SPF authentication, which means the sending server may not be authorized to use the sender's domain.",
    });
  }

  // Check for DKIM failures
  if (authentication.dkim.status === "fail") {
    issues.push({
      title: "DKIM Signature Invalid",
      description:
        "The DKIM signature is invalid or missing, which means the email content may have been altered since it was sent.",
    });
  }

  // Check for DMARC failures
  if (authentication.dmarc.status === "fail") {
    issues.push({
      title: "DMARC Policy Failure",
      description:
        "The email failed DMARC checks, which means it does not comply with the domain owner's policies for email authentication.",
    });
  }

  // Check for sender/from domain mismatch
  if (headers.from && headers["return-path"]) {
    const fromDomain = extractDomain(headers.from);
    const returnDomain = extractDomain(headers["return-path"]);

    if (fromDomain && returnDomain && fromDomain !== returnDomain) {
      issues.push({
        title: "Sender Domain Mismatch",
        description: `The From domain (${fromDomain}) does not match the Return-Path domain (${returnDomain}), which is a common sign of email spoofing.`,
      });
    }
  }

  // Check for suspicious routing
  const receivedCount = Object.keys(headers).filter((k) =>
    k.startsWith("received")
  ).length;
  if (receivedCount > 7) {
    issues.push({
      title: "Unusual Email Routing",
      description: `This email passed through ${receivedCount} servers, which is more than usual and could indicate suspicious routing.`,
    });
  }

  // Check for suspicious header flags
  if (headers["x-spam-flag"] && headers["x-spam-flag"].includes("YES")) {
    issues.push({
      title: "Flagged as Spam",
      description:
        "This email was marked as spam by one of the mail servers in its path.",
    });
  }

  return issues;
}

/**
 * Format a date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
  if (!date) return "";

  // If it's a string, convert to Date
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) return "";

  // Format with browser's locale
  return dateObj.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Format a delay time in seconds
 * @param {number} seconds - Delay in seconds
 * @returns {string} Formatted delay
 */
function formatDelay(seconds) {
  if (seconds < 60) {
    return `${seconds} sec`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} min ${remainingSeconds} sec`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hr ${remainingMinutes} min`;
  }
}

/**
 * Extract domain from an email address
 * @param {string} email - Email address or string containing email
 * @returns {string|null} Domain or null if not found
 */
function extractDomain(email) {
  if (!email) return null;

  const matches = email.match(/@([^>@\s]+)/);
  return matches ? matches[1] : null;
}

/**
 * Extract server name from a hostname
 * @param {string} hostname - Hostname
 * @returns {string} Server name
 */
function getServerName(hostname) {
  if (!hostname || hostname === "unknown") return "Mail Server";

  // Try to extract a more readable name
  const parts = hostname.split(".");
  if (parts.length >= 2) {
    const domain = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    return domain;
  }

  return hostname;
}

/**
 * Generate sample headers for testing
 * @returns {string} Sample headers
 */
export function parseSampleHeaders() {
  return `Delivered-To: recipient@example.com
Return-Path: <sender@example.org>
Received: from mail-wr1-f52.google.com (mail-wr1-f52.google.com [209.85.221.52])
        by mx.example.com with ESMTPS id s12mr5234101wrs.396.2022.06.15.07.16.32
        (version=TLS1_3 cipher=TLS_AES_128_GCM_SHA256 bits=128/128);
        Wed, 15 Jun 2022 07:16:32 -0700 (PDT)
Received: by mail-wr1-f52.google.com with SMTP id s12so8711234wrx.6
        for <recipient@example.com>; Wed, 15 Jun 2022 07:16:32 -0700 (PDT)
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
        d=example.org; s=20210112;
        h=from:to:subject:message-id:date:user-agent:mime-version;
        bh=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234=;
        b=HJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234567890ABCDEFG
         mnopqrstuvwxyz01234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl
         qrstuvwxyz01234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop
From: "John Doe" <sender@example.org>
To: "Jane Smith" <recipient@example.com>
Subject: Important Information About Your Account
Message-ID: <CAFH5uxWP=xzY7DextA1dkAhi+1-JV0Sej_ABCDEF@mail.example.org>
Date: Wed, 15 Jun 2022 07:16:22 -0700
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
Content-Type: multipart/alternative; boundary="000000000000ab1bb005e36c9a25"
MIME-Version: 1.0
Authentication-Results: mx.example.com;
       dkim=pass header.i=@example.org header.s=20210112;
       spf=pass (example.com: domain of sender@example.org designates 209.85.221.52 as permitted sender) smtp.mailfrom=sender@example.org;
       dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=example.org`;
}
