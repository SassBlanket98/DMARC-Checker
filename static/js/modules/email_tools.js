// email_tools.js - Functions for email deliverability testing

import { showToast } from "./toast.js";
import {
  addEmailToHistory,
  startTimeElapsed,
  stopTimeElapsed,
} from "../email_tester.js";

// Maximum number of retry attempts
const MAX_RETRIES = 2;
let retryCount = 0;

// Run a basic email deliverability test
export function runEmailTest(fromEmail, domain) {
  const resultsContainer = document.getElementById("results-container");
  const testResultBox = document.getElementById("test-result");

  // Reset retry count when starting a new test
  retryCount = 0;

  // Show the results container
  if (resultsContainer) {
    resultsContainer.style.display = "block";
  }

  // Show loading state
  testResultBox.innerHTML = generateTestRunningHTML();

  // Start the time elapsed counter
  const timeElapsedInterval = startTimeElapsed("time-elapsed");

  // Prepare the request data
  const testData = {
    from_email: fromEmail,
    domain: domain,
    test_type: "basic",
  };

  // Call the API to run the test
  fetchEmailTestResults(testData)
    .then((data) => {
      // Add to history
      addEmailToHistory(fromEmail, domain);

      // Stop the time elapsed counter
      stopTimeElapsed(timeElapsedInterval);

      // Render test results
      testResultBox.innerHTML = generateTestResultsHTML(data);

      // Set up any interactive elements
      setupAccordionListeners();
    })
    .catch((error) => {
      console.error("Error testing email deliverability:", error);

      // Stop the time elapsed counter
      stopTimeElapsed(timeElapsedInterval);

      // Show error toast
      showToast("Error testing email deliverability", "error");

      // Show error in the result box with retry button
      testResultBox.innerHTML = generateErrorHTML(
        error,
        fromEmail,
        domain,
        "basic"
      );

      // Add retry button functionality
      setupRetryButton(fromEmail, domain, "basic");
    });
}

// Run an advanced email deliverability test
export function runAdvancedEmailTest(
  fromName,
  fromEmail,
  subject,
  content,
  testEmail
) {
  const resultsContainer = document.getElementById("results-container");
  const testResultBox = document.getElementById("test-result");

  // Reset retry count when starting a new test
  retryCount = 0;

  // Extract domain from email
  const domain = fromEmail.split("@")[1];

  // Show the results container
  if (resultsContainer) {
    resultsContainer.style.display = "block";
  }

  // Show loading state
  testResultBox.innerHTML = generateTestRunningHTML();

  // Start the time elapsed counter
  const timeElapsedInterval = startTimeElapsed("time-elapsed");

  // Prepare the request data
  const testData = {
    from_name: fromName,
    from_email: fromEmail,
    subject: subject,
    content: content,
    test_email: testEmail,
    domain: domain,
    test_type: "advanced",
  };

  // Call the API to run the test
  fetchEmailTestResults(testData)
    .then((data) => {
      // Add to history
      addEmailToHistory(fromEmail, domain);

      // Stop the time elapsed counter
      stopTimeElapsed(timeElapsedInterval);

      // Render test results
      testResultBox.innerHTML = generateTestResultsHTML(data);

      // Set up any interactive elements
      setupAccordionListeners();
    })
    .catch((error) => {
      console.error("Error testing email deliverability:", error);

      // Stop the time elapsed counter
      stopTimeElapsed(timeElapsedInterval);

      // Show error toast
      showToast("Error testing email deliverability", "error");

      // Show error in the result box with retry button
      testResultBox.innerHTML = generateErrorHTML(
        error,
        fromEmail,
        domain,
        "advanced",
        {
          fromName,
          subject,
          content,
          testEmail,
        }
      );

      // Add retry button functionality
      setupRetryButton(fromEmail, domain, "advanced", {
        fromName,
        subject,
        content,
        testEmail,
      });
    });
}

// Fetch email test results from the API
async function fetchEmailTestResults(testData) {
  try {
    // Create API endpoint URL
    const url = "/api/email-test";

    // Set timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    // Fetch the data
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
      signal: controller.signal,
    });

    // Clear the timeout
    clearTimeout(timeoutId);

    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(
        errorData.error || `HTTP error ${response.status}`
      );
      error.code = errorData.error_code || `HTTP_${response.status}`;
      throw error;
    }

    // Parse the response
    const data = await response.json();

    // Check if there's an error in the response
    if (data.error) {
      const error = new Error(data.error);
      error.code = data.error_code || "API_ERROR";
      throw error;
    }

    return data;
  } catch (error) {
    // Handle AbortController timeout
    if (error.name === "AbortError") {
      error.code = "REQUEST_TIMEOUT";
      error.message =
        "The test took too long to complete. This may indicate delivery issues.";
    }

    console.error("API fetch error:", error);
    throw error;
  }
}

// Generate HTML for test running state
function generateTestRunningHTML() {
  return `
    <div class="test-status status-running">
      <div class="test-status-spinner"></div>
      <div class="test-status-message">
        <strong>Test in progress...</strong>
        <p>We're running your email deliverability test. This may take up to 1 minute.</p>
        <p id="time-elapsed">Time elapsed: 0:00</p>
      </div>
    </div>
    <div class="deliverability-results">
      <div class="results-section">
        <h3>What's happening?</h3>
        <ol>
          <li>Sending a test email</li>
          <li>Analyzing authentication (SPF, DKIM, DMARC)</li>
          <li>Checking spam triggers</li>
          <li>Evaluating deliverability factors</li>
          <li>Generating recommendations</li>
        </ol>
      </div>
    </div>
  `;
}

// Generate HTML for test results
function generateTestResultsHTML(data) {
  // Determine score class based on score value
  const scoreValue = data.score || 0;
  let scoreClass = "score-bad";
  let scoreLabel = "Poor";

  if (scoreValue >= 90) {
    scoreClass = "score-excellent";
    scoreLabel = "Excellent";
  } else if (scoreValue >= 80) {
    scoreClass = "score-good";
    scoreLabel = "Good";
  } else if (scoreValue >= 60) {
    scoreClass = "score-average";
    scoreLabel = "Average";
  } else if (scoreValue >= 40) {
    scoreClass = "score-poor";
    scoreLabel = "Poor";
  }

  // Generate authentication results HTML
  const authResults = generateAuthResultsHTML(data.auth_results || {});

  // Generate detailed results HTML
  const detailedResults = generateDetailedResultsHTML(data);

  // Generate recommendations HTML
  const recommendations = generateRecommendationsHTML(
    data.recommendations || []
  );

  return `
    <div class="test-status status-complete">
      <i class="fas fa-check-circle" style="color: var(--success-color); font-size: 1.5rem;"></i>
      <div class="test-status-message">
        <strong>Test completed successfully</strong>
        <p>Your email deliverability test has been completed. See results below.</p>
      </div>
    </div>
    
    <div class="deliverability-results">
      <div class="deliverability-score">
        <div class="score-circle-container">
          <div class="email-score-circle ${scoreClass}" style="--score-percent: ${scoreValue}%">
            <div class="email-score-value">${scoreValue}%</div>
          </div>
          <div class="score-label">${scoreLabel}</div>
        </div>
        
        <div class="score-details">
          <h3>Deliverability Score: ${scoreValue}%</h3>
          <p>${getScoreSummary(scoreValue)}</p>
          
          <div class="email-details">
            <p><strong>Domain:</strong> ${data.domain || "N/A"}</p>
            <p><strong>Email:</strong> ${data.email || "N/A"}</p>
            <p><strong>Test Type:</strong> ${
              data.test_type === "advanced" ? "Advanced" : "Basic"
            }</p>
            <p><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
      
      <div class="results-section">
        <h3>Authentication Results</h3>
        <div class="auth-results">
          ${authResults}
        </div>
      </div>
      
      <div class="results-section">
        <h3>Recommendations</h3>
        ${recommendations}
      </div>
      
      <div class="results-section">
        <h3>Detailed Results</h3>
        <div class="results-accordion">
          ${detailedResults}
        </div>
      </div>
    </div>
  `;
}

// Generate HTML for authentication results
function generateAuthResultsHTML(authResults) {
  // Default values if no auth results
  if (!authResults || Object.keys(authResults).length === 0) {
    return `
      <div class="auth-result-item status-warning">
        <div class="auth-result-header">
          <i class="fas fa-exclamation-triangle warning"></i>
          <h4>No Authentication Results</h4>
        </div>
        <div class="auth-result-details">
          <p>No authentication results were returned from the test.</p>
          <p>This may indicate that the email was not delivered or encountered issues.</p>
        </div>
      </div>
    `;
  }

  // Generate HTML for each auth result
  let authResultsHTML = "";

  // SPF Result
  const spfResult = authResults.spf || {};
  let spfStatusClass = "status-error";
  let spfIconClass = "error";
  let spfIcon = "times-circle";

  if (spfResult.status === "pass") {
    spfStatusClass = "status-success";
    spfIconClass = "success";
    spfIcon = "check-circle";
  } else if (
    spfResult.status === "neutral" ||
    spfResult.status === "softfail"
  ) {
    spfStatusClass = "status-warning";
    spfIconClass = "warning";
    spfIcon = "exclamation-triangle";
  }

  authResultsHTML += `
    <div class="auth-result-item ${spfStatusClass}">
      <div class="auth-result-header">
        <i class="fas fa-${spfIcon} ${spfIconClass}"></i>
        <h4>SPF ${
          spfResult.status ? spfResult.status.toUpperCase() : "FAIL"
        }</h4>
      </div>
      <div class="auth-result-details">
        <p>${getAuthResultDescription("spf", spfResult.status)}</p>
        ${spfResult.details ? `<p>${spfResult.details}</p>` : ""}
      </div>
    </div>
  `;

  // DKIM Result
  const dkimResult = authResults.dkim || {};
  let dkimStatusClass = "status-error";
  let dkimIconClass = "error";
  let dkimIcon = "times-circle";

  if (dkimResult.status === "pass") {
    dkimStatusClass = "status-success";
    dkimIconClass = "success";
    dkimIcon = "check-circle";
  } else if (dkimResult.status === "neutral") {
    dkimStatusClass = "status-warning";
    dkimIconClass = "warning";
    dkimIcon = "exclamation-triangle";
  }

  authResultsHTML += `
    <div class="auth-result-item ${dkimStatusClass}">
      <div class="auth-result-header">
        <i class="fas fa-${dkimIcon} ${dkimIconClass}"></i>
        <h4>DKIM ${
          dkimResult.status ? dkimResult.status.toUpperCase() : "FAIL"
        }</h4>
      </div>
      <div class="auth-result-details">
        <p>${getAuthResultDescription("dkim", dkimResult.status)}</p>
        ${dkimResult.details ? `<p>${dkimResult.details}</p>` : ""}
        ${dkimResult.selector ? `<p>Selector: ${dkimResult.selector}</p>` : ""}
      </div>
    </div>
  `;

  // DMARC Result
  const dmarcResult = authResults.dmarc || {};
  let dmarcStatusClass = "status-error";
  let dmarcIconClass = "error";
  let dmarcIcon = "times-circle";

  if (dmarcResult.status === "pass") {
    dmarcStatusClass = "status-success";
    dmarcIconClass = "success";
    dmarcIcon = "check-circle";
  } else if (
    dmarcResult.status === "none" ||
    dmarcResult.status === "quarantine"
  ) {
    dmarcStatusClass = "status-warning";
    dmarcIconClass = "warning";
    dmarcIcon = "exclamation-triangle";
  }

  authResultsHTML += `
    <div class="auth-result-item ${dmarcStatusClass}">
      <div class="auth-result-header">
        <i class="fas fa-${dmarcIcon} ${dmarcIconClass}"></i>
        <h4>DMARC ${
          dmarcResult.status ? dmarcResult.status.toUpperCase() : "FAIL"
        }</h4>
      </div>
      <div class="auth-result-details">
        <p>${getAuthResultDescription("dmarc", dmarcResult.status)}</p>
        ${dmarcResult.details ? `<p>${dmarcResult.details}</p>` : ""}
        ${dmarcResult.policy ? `<p>Policy: ${dmarcResult.policy}</p>` : ""}
      </div>
    </div>
  `;

  return authResultsHTML;
}

// Generate HTML for detailed results
function generateDetailedResultsHTML(data) {
  // Generate HTML for headers
  const headersHTML = `
    <div class="accordion-item">
      <div class="accordion-header">
        <h4>Email Headers</h4>
        <i class="fas fa-chevron-down accordion-icon"></i>
      </div>
      <div class="accordion-content">
        <div class="accordion-content-inner">
          <p>These are the headers from your test email, which contain authentication results and delivery information.</p>
          <div class="header-detail">
            ${formatHeaders(data.headers || {})}
          </div>
        </div>
      </div>
    </div>
  `;

  // Generate HTML for spam analysis
  const spamAnalysisHTML = `
    <div class="accordion-item">
      <div class="accordion-header">
        <h4>Spam Analysis</h4>
        <i class="fas fa-chevron-down accordion-icon"></i>
      </div>
      <div class="accordion-content">
        <div class="accordion-content-inner">
          <p>Analysis of factors that could affect whether your email is classified as spam.</p>
          ${generateSpamFactorsHTML(data.spam_analysis || {})}
        </div>
      </div>
    </div>
  `;

  // Generate HTML for infrastructure check
  const infrastructureHTML = `
    <div class="accordion-item">
      <div class="accordion-header">
        <h4>Infrastructure Check</h4>
        <i class="fas fa-chevron-down accordion-icon"></i>
      </div>
      <div class="accordion-content">
        <div class="accordion-content-inner">
          <p>Analysis of your email infrastructure including DNS records and server configuration.</p>
          ${generateInfrastructureHTML(data.infrastructure || {})}
        </div>
      </div>
    </div>
  `;

  // Combine all detailed results sections
  return headersHTML + spamAnalysisHTML + infrastructureHTML;
}

// Generate HTML for spam factors
function generateSpamFactorsHTML(spamAnalysis) {
  if (!spamAnalysis || Object.keys(spamAnalysis).length === 0) {
    return `<p>No spam analysis data available.</p>`;
  }

  const factors = spamAnalysis.factors || [];
  if (factors.length === 0) {
    return `<p>No spam factors detected.</p>`;
  }

  // Generate list of spam factors
  const factorsHTML = factors
    .map((factor) => {
      let iconClass = "warning";
      let icon = "exclamation-triangle";

      if (factor.severity === "high") {
        iconClass = "error";
        icon = "times-circle";
      } else if (factor.severity === "low") {
        iconClass = "success";
        icon = "info-circle";
      }

      return `
      <div class="spam-factor">
        <div class="spam-factor-header">
          <i class="fas fa-${icon} ${iconClass}"></i>
          <h4>${factor.name}</h4>
          <span class="spam-factor-severity severity-${factor.severity}">${
        factor.severity
      }</span>
        </div>
        <div class="spam-factor-details">
          <p>${factor.description}</p>
          ${
            factor.recommendation
              ? `<p><strong>Recommendation:</strong> ${factor.recommendation}</p>`
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");

  return `
    <div class="spam-score">
      <p><strong>Spam Score:</strong> ${spamAnalysis.score || "N/A"}/10</p>
      <p>${getSpamScoreDescription(spamAnalysis.score)}</p>
    </div>
    <div class="spam-factors">
      ${factorsHTML}
    </div>
  `;
}

// Generate HTML for infrastructure check
function generateInfrastructureHTML(infrastructure) {
  if (!infrastructure || Object.keys(infrastructure).length === 0) {
    return `<p>No infrastructure data available.</p>`;
  }

  // Generate DNS records check
  const dnsHTML = `
    <div class="infra-section">
      <h4>DNS Records</h4>
      <div class="infra-item">
        <p><strong>SPF Record:</strong> ${
          infrastructure.spf_record ? "Present" : "Missing"
        }</p>
        ${
          infrastructure.spf_record
            ? `<div class="record-detail">${infrastructure.spf_record}</div>`
            : ""
        }
      </div>
      <div class="infra-item">
        <p><strong>DKIM Record:</strong> ${
          infrastructure.dkim_record ? "Present" : "Missing"
        }</p>
        ${
          infrastructure.dkim_selector
            ? `<p>Selector: ${infrastructure.dkim_selector}</p>`
            : ""
        }
      </div>
      <div class="infra-item">
        <p><strong>DMARC Record:</strong> ${
          infrastructure.dmarc_record ? "Present" : "Missing"
        }</p>
        ${
          infrastructure.dmarc_record
            ? `<div class="record-detail">${infrastructure.dmarc_record}</div>`
            : ""
        }
      </div>
    </div>
  `;

  // Generate IP reputation check
  const ipHTML = `
    <div class="infra-section">
      <h4>IP Reputation</h4>
      <div class="infra-item">
        <p><strong>IP Address:</strong> ${
          infrastructure.ip_address || "Unknown"
        }</p>
        <p><strong>Blacklisted:</strong> ${
          infrastructure.blacklisted ? "Yes" : "No"
        }</p>
        ${
          infrastructure.blacklisted
            ? `<p><strong>Blacklists:</strong> ${infrastructure.blacklists.join(
                ", "
              )}</p>`
            : ""
        }
      </div>
    </div>
  `;

  return dnsHTML + ipHTML;
}

// Generate HTML for recommendations
function generateRecommendationsHTML(recommendations) {
  if (!recommendations || recommendations.length === 0) {
    return `<p>No specific recommendations at this time.</p>`;
  }

  // Sort recommendations by priority
  const sortedRecs = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Generate HTML for each recommendation
  return sortedRecs
    .map((rec) => {
      return `
      <div class="recommendation ${rec.priority}-priority">
        <h4>${rec.title}</h4>
        <p>${rec.description}</p>
      </div>
    `;
    })
    .join("");
}

// Generate HTML for error state
function generateErrorHTML(
  error,
  fromEmail,
  domain,
  testType,
  advancedOptions = null
) {
  // Determine error message and code
  const errorMessage = error.message || "An unknown error occurred";
  const errorCode = error.code || "UNKNOWN_ERROR";

  // Generate suggestions based on error code
  let suggestions = [];

  if (errorCode === "REQUEST_TIMEOUT") {
    suggestions = [
      "Your test email may have been blocked or severely delayed",
      "Check if your domain has proper DNS records (SPF, DKIM, DMARC)",
      "Verify that your mail server is accepting connections",
      "Try again in a few minutes",
    ];
  } else if (errorCode === "INVALID_EMAIL") {
    suggestions = [
      "Check that the email address format is valid",
      "Verify that the domain exists and has proper MX records",
    ];
  } else if (errorCode.includes("SMTP")) {
    suggestions = [
      "Your mail server may be rejecting connections",
      "Check your mail server configuration",
      "Verify that your domain is not blacklisted",
    ];
  } else {
    suggestions = [
      "Try again in a few moments",
      "Check your internet connection",
      "Verify that all input fields are correct",
    ];
  }

  // Generate suggestions HTML
  const suggestionsHTML = suggestions
    .map((suggestion) => `<li>${suggestion}</li>`)
    .join("");

  // Generate retry button HTML
  const retryButtonHTML =
    retryCount < MAX_RETRIES
      ? `
    <button id="retry-test-btn" class="recovery-button" data-test-type="${testType}" data-email="${fromEmail}" data-domain="${domain}">
      <i class="fas fa-redo"></i> Retry Test
    </button>
  `
      : "";

  // If advanced test, store advanced options as data attributes
  let advancedDataAttributes = "";
  if (testType === "advanced" && advancedOptions) {
    advancedDataAttributes = `
      data-from-name="${advancedOptions.fromName || ""}"
      data-subject="${advancedOptions.subject || ""}"
      data-content="${advancedOptions.content || ""}"
      data-test-email="${advancedOptions.testEmail || ""}"
    `;
  }

  return `
    <div class="test-status status-error">
      <i class="fas fa-exclamation-circle" style="color: var(--error-color); font-size: 1.5rem;"></i>
      <div class="test-status-message">
        <strong>Test encountered an error</strong>
        <p>${errorMessage}</p>
        <div class="error-code">Error code: ${errorCode}</div>
      </div>
    </div>
    
    <div class="deliverability-results">
      <div class="results-section">
        <h3>Suggestions</h3>
        <div class="suggestions-container">
          <ul class="suggestions-list">
            ${suggestionsHTML}
          </ul>
        </div>
        ${
          retryButtonHTML
            ? `
          <div class="retry-container" ${advancedDataAttributes}>
            ${retryButtonHTML}
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;
}

// Set up accordion listeners
function setupAccordionListeners() {
  const accordionItems = document.querySelectorAll(".accordion-item");

  accordionItems.forEach((item) => {
    const header = item.querySelector(".accordion-header");
    const content = item.querySelector(".accordion-content");

    if (header && content) {
      header.addEventListener("click", () => {
        // Toggle this item's open state
        item.classList.toggle("open");
      });
    }
  });
}

// Set up retry button functionality
function setupRetryButton(fromEmail, domain, testType, advancedOptions = null) {
  if (retryCount >= MAX_RETRIES) return;

  const retryBtn = document.getElementById("retry-test-btn");
  if (!retryBtn) return;

  retryBtn.addEventListener("click", () => {
    retryCount++;

    if (testType === "advanced" && advancedOptions) {
      // Get values from data attributes if available
      const fromName =
        retryBtn.parentElement.getAttribute("data-from-name") ||
        advancedOptions.fromName;
      const subject =
        retryBtn.parentElement.getAttribute("data-subject") ||
        advancedOptions.subject;
      const content =
        retryBtn.parentElement.getAttribute("data-content") ||
        advancedOptions.content;
      const testEmail =
        retryBtn.parentElement.getAttribute("data-test-email") ||
        advancedOptions.testEmail;

      runAdvancedEmailTest(fromName, fromEmail, subject, content, testEmail);
    } else {
      runEmailTest(fromEmail, domain);
    }
  });
}

// Helper function to format headers
function formatHeaders(headers) {
  if (!headers || Object.keys(headers).length === 0) {
    return "No header data available.";
  }

  // If headers is already a string, return it
  if (typeof headers === "string") {
    return headers;
  }

  // Convert headers object to formatted string
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

// Helper function to get score summary based on score value
function getScoreSummary(score) {
  if (score >= 90) {
    return "Excellent! Your emails are likely to be delivered to the inbox with high reliability.";
  } else if (score >= 80) {
    return "Good deliverability. Your emails should generally reach the inbox, with minor improvements possible.";
  } else if (score >= 60) {
    return "Average deliverability. Your emails may occasionally be filtered to spam folders. Some improvements recommended.";
  } else if (score >= 40) {
    return "Poor deliverability. Your emails are at high risk of being filtered to spam or rejected. Significant improvements needed.";
  } else {
    return "Very poor deliverability. Your emails are likely to be rejected or filtered. Urgent action required to improve authentication and sender reputation.";
  }
}

// Helper function to get authentication result descriptions
function getAuthResultDescription(type, status) {
  const descriptions = {
    spf: {
      pass: "SPF passed. The sending server is authorized to send email for this domain.",
      fail: "SPF failed. The sending server is not authorized to send email for this domain.",
      softfail:
        "SPF soft fail. The domain suggests the server might not be authorized, but isn't certain.",
      neutral:
        "SPF neutral. No statement is made about the sending server's authorization.",
      none: "No SPF policy found. The domain doesn't specify which servers can send email on its behalf.",
      temperror: "Temporary SPF error occurred during validation.",
      permerror: "Permanent SPF error occurred during validation.",
    },
    dkim: {
      pass: "DKIM passed. The email was properly signed and the signature verified successfully.",
      fail: "DKIM failed. The signature was present but could not be verified.",
      neutral:
        "DKIM check returned neutral. No statement is made about the validity.",
      none: "No DKIM signature found in the email.",
      temperror: "Temporary DKIM error occurred during validation.",
      permerror: "Permanent DKIM error occurred during validation.",
    },
    dmarc: {
      pass: "DMARC passed. The email passed either SPF or DKIM alignment checks.",
      fail: "DMARC failed. The email failed both SPF and DKIM alignment checks.",
      none: "No DMARC policy found. The domain doesn't have a policy for handling authentication failures.",
      quarantine:
        "DMARC quarantine policy is applied. Emails may be sent to spam.",
      reject:
        "DMARC reject policy is applied. Emails that fail should be rejected.",
      temperror: "Temporary DMARC error occurred during validation.",
      permerror: "Permanent DMARC error occurred during validation.",
    },
  };

  // Return description or default message
  return (
    descriptions[type]?.[status] ||
    `${type.toUpperCase()} check result: ${status || "unknown"}`
  );
}

// Helper function to get spam score description
function getSpamScoreDescription(score) {
  if (!score) return "No spam score available.";

  const numScore = parseFloat(score);

  if (numScore < 2) {
    return "Low spam score. Your email is unlikely to be classified as spam.";
  } else if (numScore < 5) {
    return "Moderate spam score. Your email has some characteristics that might trigger spam filters.";
  } else if (numScore < 8) {
    return "High spam score. Your email has multiple factors that could trigger spam filters.";
  } else {
    return "Very high spam score. Your email is highly likely to be classified as spam.";
  }
}
