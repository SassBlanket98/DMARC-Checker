// api.js - API communication and record checking

import { validateDomain } from "../domainValidation.js";
import {
  renderDetailedRecords,
  renderDetailedRecord,
} from "./recordDisplay.js";
import { showToast } from "./toast.js";
import { addToHistory } from "./history.js";
import { updateOverviewDashboard } from "./score.js";
import {
  domainInput,
  recordTypeSelect,
  resultBox,
  overviewContainer,
} from "./ui.js";

// Error state tracking
const errorState = {
  retryCount: 0,
  lastDomain: "",
  lastRecordType: "",
  lastSelectors: [],
};

// Check DNS records for a domain
export async function checkRecord() {
  const domain = domainInput.value.trim();
  const recordType = recordTypeSelect.value;

  // Store for potential retries
  errorState.lastDomain = domain;
  errorState.lastRecordType = recordType;

  // Reset overview container - always hide it initially when checking any record
  overviewContainer.style.display = "none";
  overviewContainer.classList.add("hidden");

  // Validate domain input
  const validation = validateDomain(domain);
  if (!validation.valid) {
    resultBox.innerHTML = renderErrorMessage(validation.error);
    return;
  }

  // Get DKIM selectors if applicable
  let selectors = [];
  if (recordType === "dkim") {
    const selectorTags = document.querySelectorAll(".selector-tag");
    selectorTags.forEach((tag) => {
      selectors.push(tag.textContent.trim().replace(/\s*×.*$/, ""));
    });
    errorState.lastSelectors = [...selectors];
  }

  // Construct API URL
  const url =
    recordType === "overview"
      ? `/api/overview?domain=${encodeURIComponent(domain)}`
      : `/api/${recordType}?domain=${encodeURIComponent(domain)}${
          recordType === "dkim" && selectors.length
            ? "&selectors=" + selectors.join(",")
            : ""
        }`;

  // Show loading state
  resultBox.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <div>Loading records for ${domain}...</div>
    </div>
  `;

  try {
    // Fetch data from API
    const response = await fetch(url);
    const data = await response.json();

    // Handle API errors
    if (!response.ok) {
      resultBox.innerHTML = renderErrorMessage(
        {
          error:
            data.error || `Error: ${response.status} ${response.statusText}`,
          error_code: data.error_code || `HTTP_${response.status}`,
          suggestions:
            data.suggestions || getDefaultSuggestions(response.status),
        },
        recordType.toUpperCase()
      );
      return;
    }

    // Add to history
    addToHistory(domain, recordType);

    // Success! Reset retry count
    errorState.retryCount = 0;

    // Handle success response
    if (recordType === "overview") {
      // Only display overview score container for "overview" record type
      overviewContainer.style.display = "block";
      overviewContainer.classList.remove("hidden");

      // Render records
      resultBox.innerHTML = renderDetailedRecords(data.records);

      // Update the overview dashboard with correct statuses
      updateOverviewDashboard(data.records);
    } else {
      // Render single record
      resultBox.innerHTML = renderDetailedRecord(recordType, data);
    }
  } catch (error) {
    console.error("Error fetching data:", error);

    // Handle network errors
    const errorObj = handleNetworkError(error);
    resultBox.innerHTML = renderErrorMessage(
      errorObj,
      recordType.toUpperCase()
    );

    // Add retry button
    if (
      errorState.retryCount < 3 &&
      (errorObj.error_code.includes("TIMEOUT") ||
        errorObj.error_code.includes("NETWORK_ERROR") ||
        errorObj.error_code.includes("SERVER_ERROR"))
    ) {
      const retryButton = document.createElement("button");
      retryButton.id = "retry-btn";
      retryButton.className = "recovery-button";
      retryButton.innerHTML = '<i class="fas fa-redo"></i> Retry Check';
      retryButton.addEventListener("click", () => {
        errorState.retryCount++;
        checkRecord();
      });

      const errorDescription = resultBox.querySelector(".issue-description");
      if (errorDescription) {
        errorDescription.appendChild(retryButton);
      }
    }
  }
}

// Render error message
export function renderErrorMessage(error, recordType = null) {
  // Extract error details
  const errorMessage = error.error || "An unknown error occurred";
  const errorCode = error.error_code || "UNKNOWN_ERROR";
  const suggestions = error.suggestions || ["Please try again later"];

  // Determine the appropriate icon and class based on error type
  let iconClass = "exclamation-circle";
  let cssClass = "issue-error";

  // Adjust for different error types
  if (errorCode.includes("NOT_FOUND") || errorCode.includes("NO_RECORD")) {
    iconClass = "info-circle";
    cssClass = "issue-info";
  } else if (errorCode.includes("TIMEOUT") || errorCode === "DNS_ERROR") {
    iconClass = "exclamation-triangle";
    cssClass = "issue-warning";
  }

  // Create suggestions HTML
  const suggestionsHtml = suggestions
    .map((suggestion) => `<li>${suggestion}</li>`)
    .join("");

  // Create retry button if appropriate
  let retryButton = "";
  if (
    errorState.retryCount < 3 &&
    (errorCode.includes("TIMEOUT") ||
      errorCode.includes("NETWORK_ERROR") ||
      errorCode.includes("SERVER_ERROR"))
  ) {
    retryButton = `
      <button id="retry-btn" class="recovery-button">
        <i class="fas fa-redo"></i> Retry Check
      </button>
    `;

    // Add event listener after a slight delay to ensure the DOM is updated
    setTimeout(() => {
      const button = document.getElementById("retry-btn");
      if (button) {
        button.addEventListener("click", () => {
          errorState.retryCount++;
          checkRecord();
        });
      }
    }, 100);
  }

  // Special handling for DKIM record type
  if (recordType === "DKIM") {
    // For DKIM, we want to show which selectors were checked
    const selectorList =
      errorState.lastSelectors && errorState.lastSelectors.length > 0
        ? errorState.lastSelectors.join(", ")
        : "default selectors";

    return `
      <div class="issue-item ${cssClass}">
        <div class="issue-icon">
          <i class="fas fa-${iconClass}"></i>
        </div>
        <div class="issue-content">
          <div class="issue-title">${errorMessage}</div>
          <div class="issue-description">
            ${
              errorCode !== "UNKNOWN_ERROR"
                ? `<div class="error-code">Error code: ${errorCode}</div>`
                : ""
            }
            <div class="dkim-error-details">
              <p>Attempted to check DKIM records for domain <strong>${
                errorState.lastDomain
              }</strong> using selectors: <strong>${selectorList}</strong></p>
              <p>The lookup failed with a DNS error. This could mean:</p>
              <ul>
                <li>The domain doesn't have DKIM configured</li>
                <li>The selectors you specified are incorrect</li>
                <li>There's a DNS configuration issue</li>
                <li>A temporary network or server problem</li>
              </ul>
            </div>
            ${
              suggestions.length > 0
                ? `<div class="suggestions-container">
                 <p>Suggestions:</p>
                 <ul class="suggestions-list">${suggestionsHtml}</ul>
               </div>`
                : ""
            }
            ${retryButton}
          </div>
        </div>
      </div>
    `;
  }

  // Standard error display for other record types
  return `
    <div class="issue-item ${cssClass}">
      <div class="issue-icon">
        <i class="fas fa-${iconClass}"></i>
      </div>
      <div class="issue-content">
        <div class="issue-title">${errorMessage}</div>
        <div class="issue-description">
          ${
            errorCode !== "UNKNOWN_ERROR"
              ? `<div class="error-code">Error code: ${errorCode}</div>`
              : ""
          }
          ${
            suggestions.length > 0
              ? `<div class="suggestions-container">
               <p>Suggestions:</p>
               <ul class="suggestions-list">${suggestionsHtml}</ul>
             </div>`
              : ""
          }
          ${retryButton}
        </div>
      </div>
    </div>
  `;
}

// Handle network error
export function handleNetworkError(error) {
  // Check if the error is related to network connectivity
  if (
    error.message &&
    (error.message.includes("Failed to fetch") ||
      error.message.includes("NetworkError") ||
      error.message.includes("Network request failed"))
  ) {
    return {
      error: "Network connectivity issue",
      error_code: "NETWORK_ERROR",
      suggestions: [
        "Check your internet connection",
        "Ensure the server is running and accessible",
        "Try again in a few moments",
      ],
    };
  }

  // For other types of errors
  return {
    error: error.message || "An unexpected error occurred",
    error_code: "UNEXPECTED_ERROR",
    suggestions: ["Please try again later"],
  };
}

// Get default suggestions based on HTTP status code
export function getDefaultSuggestions(statusCode) {
  switch (statusCode) {
    case 400:
      return [
        "Check that your request parameters are correct",
        "Ensure the domain name is valid",
      ];
    case 404:
      return [
        "The requested resource or domain was not found",
        "Check for typos in the domain name",
      ];
    case 408:
      return [
        "The request timed out. This could be a temporary network issue",
        "Try again in a few moments",
      ];
    case 500:
      return [
        "The server encountered an unexpected error",
        "Please try again later",
        "If the problem persists, contact support",
      ];
    default:
      return ["Please try again later"];
  }
}
