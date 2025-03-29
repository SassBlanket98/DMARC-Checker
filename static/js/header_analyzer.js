// header_analyzer.js - Main entry point for Email Header Analyzer

// Import modules
import {
  initHistoryHandler,
  loadHistoryFromStorage,
  addToHistory,
} from "./modules/history.js";
import { initModals } from "./modules/modals.js";
import {
  isMobileDevice,
  initMobileEnhancements,
  enhanceModalsForMobile,
  enhanceMobileToast,
  setupOrientationChangeHandler,
  enhanceNavigationForMobile,
} from "./mobile-enhancements.js";
import { initNavigation, setupNavResizeHandler } from "./modules/navigation.js";
import { showToast } from "./modules/toast.js";
import {
  analyzeHeaders,
  parseSampleHeaders,
} from "./modules/header_analysis.js";

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  // Initialize core components
  initHistoryHandler();
  loadHistoryFromStorage();
  initModals();

  // Initialize navigation dropdown
  initNavigation();
  setupNavResizeHandler();

  // Set up event listeners
  setupEventListeners();

  // Mobile enhancements if needed
  if (isMobileDevice()) {
    initMobileEnhancements();
    enhanceModalsForMobile();
    enhanceMobileToast();
    setupOrientationChangeHandler();
    enhanceNavigationForMobile();
  }

  // Check for dark mode preference
  applyThemePreference();

  console.log("Email Header Analyzer initialized!");
});

// Set up event listeners for the page
function setupEventListeners() {
  const analyzeButton = document.getElementById("analyze-btn");
  const clearButton = document.getElementById("clear-btn");
  const sampleButton = document.getElementById("sample-btn");
  const headersTextarea = document.getElementById("email-headers");

  // Analyze button click handler
  if (analyzeButton) {
    analyzeButton.addEventListener("click", function () {
      const headers = headersTextarea.value.trim();

      if (!headers) {
        showToast("Please paste email headers first", "warning");
        return;
      }

      processHeaders(headers);
    });
  }

  // Clear button click handler
  if (clearButton) {
    clearButton.addEventListener("click", function () {
      headersTextarea.value = "";

      // Hide results container if visible
      const resultsContainer = document.getElementById("results-container");
      if (resultsContainer) {
        resultsContainer.classList.add("hidden");
      }
    });
  }

  // Sample button click handler
  if (sampleButton) {
    sampleButton.addEventListener("click", function () {
      loadSampleHeaders();
    });
  }

  // Theme toggle functionality
  const themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleDarkMode);
  }
}

// Process the headers
async function processHeaders(headers) {
  try {
    // Show loading indicator in results area
    const resultsContainer = document.getElementById("results-container");
    const analysisResults = document.getElementById("analysis-results");

    resultsContainer.classList.remove("hidden");
    analysisResults.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <div>Analyzing email headers...</div>
      </div>
    `;

    // Analyze the headers (this will be client-side for privacy)
    const results = await analyzeHeaders(headers);

    // If analysis fails
    if (!results) {
      analysisResults.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>Unable to analyze these headers. Please check that you've copied the complete headers.</p>
        </div>
      `;
      return;
    }

    // Render the results
    renderAnalysisResults(results);

    // Add to history (use a subset of headers as the identifier)
    const headerPreview = headers.substring(0, 50).replace(/\r?\n/g, " ");
    addToHistory(headerPreview, "headers");
  } catch (error) {
    console.error("Error processing headers:", error);
    showToast("Error analyzing headers", "error");

    const analysisResults = document.getElementById("analysis-results");
    analysisResults.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>An error occurred while analyzing the headers. Please try again.</p>
      </div>
    `;
  }
}

// Render analysis results
function renderAnalysisResults(results) {
  const analysisResults = document.getElementById("analysis-results");

  // Authentication Summary
  const authSummary = `
    <div class="section">
      <h3>Authentication Summary</h3>
      <div class="auth-summary">
        ${renderAuthResult("SPF", results.authentication.spf)}
        ${renderAuthResult("DKIM", results.authentication.dkim)}
        ${renderAuthResult("DMARC", results.authentication.dmarc)}
      </div>
    </div>
  `;

  // Email Journey
  const journeySection = `
    <div class="section">
      <h3>Email Journey</h3>
      <div class="email-journey">
        <div class="journey-visualization">
          <div class="journey-line"></div>
          <div class="journey-stops">
            ${renderJourneyStops(results.journey)}
          </div>
        </div>
      </div>
    </div>
  `;

  // Timeline
  const timelineSection = `
    <div class="section">
      <h3>Timeline</h3>
      <div class="header-timeline">
        ${renderTimeline(results.timeline)}
      </div>
    </div>
  `;

  // Important Headers
  const headersSection = `
    <div class="section">
      <h3>Important Headers</h3>
      <div class="header-details">
        <table class="header-table">
          <thead>
            <tr>
              <th>Header</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${renderHeaderDetails(results.importantHeaders)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Security Issues
  const securitySection = `
    <div class="section">
      <h3>Security Analysis</h3>
      <div class="security-issues">
        ${renderSecurityIssues(results.securityIssues)}
      </div>
    </div>
  `;

  // Raw Headers
  const rawHeadersSection = `
    <div class="section raw-headers">
      <details>
        <summary>View Raw Headers</summary>
        <pre>${escapeHtml(results.rawHeaders)}</pre>
      </details>
    </div>
  `;

  // Combine all sections
  analysisResults.innerHTML = `
    ${authSummary}
    ${journeySection}
    ${timelineSection}
    ${headersSection}
    ${securitySection}
    ${rawHeadersSection}
  `;
}

// Render authentication result
function renderAuthResult(type, result) {
  const statusClass =
    result.status === "pass"
      ? "pass"
      : result.status === "fail"
      ? "fail"
      : "neutral";

  const iconClass =
    result.status === "pass"
      ? "fa-check-circle"
      : result.status === "fail"
      ? "fa-times-circle"
      : "fa-exclamation-triangle";

  return `
    <div class="auth-result ${statusClass}">
      <div class="auth-result-header">
        <i class="fas ${iconClass}"></i>
        <h4>${type}</h4>
      </div>
      <div class="auth-result-details">
        <p>${result.details}</p>
      </div>
    </div>
  `;
}

// Render journey stops
function renderJourneyStops(journey) {
  if (!journey || journey.length === 0) {
    return `<div class="no-journey">No journey information available</div>`;
  }

  return journey
    .map(
      (stop, index) => `
    <div class="journey-stop">
      <div class="stop-icon">
        <i class="fas ${stop.icon}"></i>
      </div>
      <div class="stop-label">${stop.label}</div>
      ${stop.time ? `<div class="stop-time">${stop.time}</div>` : ""}
    </div>
  `
    )
    .join("");
}

// Render timeline
function renderTimeline(timeline) {
  if (!timeline || timeline.length === 0) {
    return `<div class="no-timeline">No timeline information available</div>`;
  }

  return timeline
    .map((item) => {
      let delayClass = "";
      if (item.delay) {
        delayClass =
          item.delay.severity === "warning"
            ? "delay-warning"
            : item.delay.severity === "critical"
            ? "delay-critical"
            : "";
      }

      return `
      <div class="timeline-item">
        <div class="timeline-time">${item.time}</div>
        <div class="timeline-server">
          <div class="timeline-server-name">${item.server}</div>
          <div class="timeline-server-details">${item.details || ""}</div>
        </div>
        <div class="timeline-delay ${delayClass}">
          ${item.delay ? item.delay.text : ""}
        </div>
      </div>
    `;
    })
    .join("");
}

// Render header details
function renderHeaderDetails(headers) {
  if (!headers || Object.keys(headers).length === 0) {
    return `<tr><td colspan="2">No header details available</td></tr>`;
  }

  return Object.entries(headers)
    .map(
      ([name, info]) => `
    <tr>
      <td>
        <div class="header-name">${name}</div>
      </td>
      <td>
        <div class="header-value">${escapeHtml(info.value)}</div>
        ${
          info.explanation
            ? `<div class="header-explanation">${info.explanation}</div>`
            : ""
        }
      </td>
    </tr>
  `
    )
    .join("");
}

// Render security issues
function renderSecurityIssues(issues) {
  if (!issues || issues.length === 0) {
    return `
      <div class="no-issues">
        <i class="fas fa-check-circle"></i>
        <p>No security issues detected in these headers.</p>
      </div>
    `;
  }

  return issues
    .map(
      (issue) => `
    <div class="issue-item">
      <div class="issue-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <div class="issue-content">
        <div class="issue-title">${issue.title}</div>
        <div class="issue-description">${issue.description}</div>
      </div>
    </div>
  `
    )
    .join("");
}

// Load sample headers
function loadSampleHeaders() {
  const headersTextarea = document.getElementById("email-headers");

  // Use the parseSampleHeaders function to get sample headers
  const sampleHeaders = parseSampleHeaders();

  // Set the textarea value
  headersTextarea.value = sampleHeaders;

  // Show toast notification
  showToast("Sample headers loaded", "info");
}

// Toggle dark mode function
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const icon = this.querySelector("i");
  if (document.body.classList.contains("dark-mode")) {
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
    localStorage.setItem("theme", "dark");
  } else {
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
    localStorage.setItem("theme", "light");
  }
}

// Apply theme preference from localStorage
function applyThemePreference() {
  const theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    const icon = document.querySelector(".theme-toggle i");
    if (icon) {
      icon.classList.remove("fa-moon");
      icon.classList.add("fa-sun");
    }
  }
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Add to history (export for module use)
export function addHeaderToHistory(headerPreview) {
  try {
    import("./modules/history.js").then((historyModule) => {
      historyModule.addToHistory(headerPreview, "headers");
    });
  } catch (error) {
    console.error("Failed to add headers to history:", error);
  }
}
