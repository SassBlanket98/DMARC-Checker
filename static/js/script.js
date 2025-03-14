// DOM elements
const domainInput = document.getElementById("domain");
const domainSuggestions = document.getElementById("domain-suggestions");
const recordTypeSelect = document.getElementById("recordType");
const selectorsContainer = document.getElementById("selectors-container");
const selectorsList = document.getElementById("selectors-list");
const newSelectorInput = document.getElementById("new-selector");
const addSelectorBtn = document.getElementById("add-selector-btn");
const checkBtn = document.getElementById("check-btn");
const historyDrawer = document.getElementById("history-drawer");
const helpModal = document.getElementById("help-modal");
const themeToggle = document.querySelector(".theme-toggle");
const resultBox = document.getElementById("result");
const overviewContainer = document.getElementById("overview-container");

// Recent domains for autocomplete
const recentDomains = [
  "example.com",
  "google.com",
  "microsoft.com",
  "apple.com",
  "amazon.com",
];

// Default DKIM selectors
const selectorsData = [
  "default",
  "google",
  "selector1",
  "selector2",
  "email",
  "dkim1",
];

// Error handling state
const errorState = {
  retryCount: 0,
  lastDomain: "",
  lastRecordType: "",
  lastSelectors: [],
};

// Initialize the application
function initApp() {
  // Toggle dark mode
  themeToggle.addEventListener("click", toggleDarkMode);

  // Record type change handler
  recordTypeSelect.addEventListener("change", handleRecordTypeChange);

  // Add initial selectors for DKIM
  selectorsData.forEach((selector) => {
    addSelectorTag(selector);
  });

  // Add selector button click handler
  addSelectorBtn.addEventListener("click", handleAddSelector);

  // Add selector on Enter key
  newSelectorInput.addEventListener("keydown", handleSelectorKeydown);

  // Domain input autocomplete
  domainInput.addEventListener("input", handleDomainInput);

  // Hide suggestions when clicking outside
  document.addEventListener("click", handleDocumentClick);

  // History drawer toggle
  document
    .getElementById("history-link")
    .addEventListener("click", openHistoryDrawer);
  document
    .getElementById("history-close")
    .addEventListener("click", closeHistoryDrawer);

  // Help modal toggle
  document.getElementById("help-link").addEventListener("click", openHelpModal);
  document
    .getElementById("help-close")
    .addEventListener("click", closeHelpModal);

  // Prevent modal close when clicking inside the modal content
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  });

  // Export Results
  document.getElementById("export-btn").addEventListener("click", handleExport);

  // Batch Check
  document
    .getElementById("batch-check-btn")
    .addEventListener("click", handleBatchCheck);

  // Check button click handler
  checkBtn.addEventListener("click", checkRecord);

  // Enter key handler for searching
  document.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && document.activeElement === domainInput) {
      checkRecord();
    }
  });

  // Add CSS for toast notifications
  addToastStyles();
}

// Toggle dark mode
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const icon = this.querySelector("i");
  if (document.body.classList.contains("dark-mode")) {
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
  } else {
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
  }
}

// Handle record type change
function handleRecordTypeChange() {
  if (this.value === "dkim") {
    selectorsContainer.classList.add("visible");
  } else {
    selectorsContainer.classList.remove("visible");
  }
}

// Add selector tag function
function addSelectorTag(selector) {
  if (!selector) return;

  const tag = document.createElement("div");
  tag.className = "selector-tag";
  tag.innerHTML = `
    ${selector}
    <i class="fas fa-times" onclick="removeSelector(this)"></i>
  `;
  selectorsList.appendChild(tag);
}

// Remove selector function
window.removeSelector = function (element) {
  element.parentElement.remove();
};

// Handle add selector button click
function handleAddSelector() {
  const selector = newSelectorInput.value.trim();
  if (selector) {
    addSelectorTag(selector);
    newSelectorInput.value = "";
  }
}

// Handle selector input keydown
function handleSelectorKeydown(e) {
  if (e.key === "Enter") {
    const selector = this.value.trim();
    if (selector) {
      addSelectorTag(selector);
      this.value = "";
    }
  }
}

// Handle domain input for autocomplete
function handleDomainInput() {
  const input = this.value.toLowerCase();
  domainSuggestions.innerHTML = "";

  if (input.length > 1) {
    const filtered = recentDomains.filter((domain) =>
      domain.toLowerCase().includes(input)
    );

    if (filtered.length > 0) {
      filtered.forEach((domain) => {
        const div = document.createElement("div");
        div.textContent = domain;
        div.addEventListener("click", function () {
          domainInput.value = domain;
          domainSuggestions.style.display = "none";
        });
        domainSuggestions.appendChild(div);
      });
      domainSuggestions.style.display = "block";
    } else {
      domainSuggestions.style.display = "none";
    }
  } else {
    domainSuggestions.style.display = "none";
  }
}

// Handle document click to hide suggestions
function handleDocumentClick(event) {
  if (
    !domainInput.contains(event.target) &&
    !domainSuggestions.contains(event.target)
  ) {
    domainSuggestions.style.display = "none";
  }
}

// Open history drawer
function openHistoryDrawer(e) {
  e.preventDefault();
  historyDrawer.classList.add("open");
}

// Close history drawer
function closeHistoryDrawer() {
  historyDrawer.classList.remove("open");
}

// Open help modal
function openHelpModal(e) {
  e.preventDefault();
  helpModal.classList.add("open");
}

// Close help modal
function closeHelpModal() {
  helpModal.classList.remove("open");
}

// Handle export button click
function handleExport() {
  try {
    // Get the current results data
    const domainName = domainInput.value.trim();
    const recordTypeValue = recordTypeSelect.value;

    if (!domainName) {
      showToast("Please check a domain before exporting results", "warning");
      return;
    }

    // In a real implementation, this would generate a file with the results
    showToast("Exporting results for " + domainName, "info");

    // Mock export success after a delay
    setTimeout(() => {
      showToast("Results exported successfully!", "success");
    }, 1000);
  } catch (error) {
    showToast("Failed to export results: " + error.message, "error");
  }
}

// Handle batch check button click
function handleBatchCheck() {
  // In a real implementation, this would open a modal for entering multiple domains
  showToast("Batch check feature coming soon!", "info");
}

// Toggle record card expansion
window.toggleRecordCard = function (id) {
  const body = document.getElementById(id);
  body.classList.toggle("expanded");

  const header = body.previousElementSibling;
  const icon = header.querySelector(".expand-icon");

  if (body.classList.contains("expanded")) {
    icon.classList.remove("fa-chevron-down");
    icon.classList.add("fa-chevron-up");
  } else {
    icon.classList.remove("fa-chevron-up");
    icon.classList.add("fa-chevron-down");
  }
};

// Switch tabs in record cards
window.switchTab = function (recordId, tabName) {
  // Hide all tab contents in this record
  const tabContents = document.querySelectorAll(`#${recordId} .tab-content`);
  tabContents.forEach((tab) => {
    tab.classList.remove("active");
    tab.style.display = "none"; // Force hide all tabs
  });

  // Remove active class from all tabs
  const tabs = document.querySelectorAll(`#${recordId}-tabs .tab`);
  tabs.forEach((tab) => tab.classList.remove("active"));

  // Show selected tab
  const activeTab = document.getElementById(`${recordId}-${tabName}`);
  if (activeTab) {
    activeTab.classList.add("active");
    activeTab.style.display = "block"; // Force show the active tab
  }

  document
    .querySelector(`#${recordId}-tabs .tab[data-tab="${tabName}"]`)
    .classList.add("active");
};

// Copy record data to clipboard
window.copyToClipboard = function (text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      // Show a success toast
      showToast("Copied to clipboard!", "success");
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
      showToast("Failed to copy text. Please try again.", "error");
    });
};

// Add a domain check to history
function addToHistory(domain, recordType) {
  const historyList = document.querySelector(".history-list");
  const now = new Date();
  const timeString = now.toLocaleString();

  const historyItem = document.createElement("div");
  historyItem.className = "history-item";
  historyItem.innerHTML = `
    <div class="history-domain">${domain}</div>
    <div class="history-date">${timeString} <span class="history-record-type">${recordType.toUpperCase()}</span></div>
  `;

  historyItem.addEventListener("click", function () {
    document.getElementById("domain").value = domain;
    document.getElementById("recordType").value = recordType;
    document.getElementById("history-drawer").classList.remove("open");
    checkRecord();
  });

  // Add at the top of the list
  historyList.insertBefore(historyItem, historyList.firstChild);
}

// Validate domain input
function validateDomain(domain) {
  if (!domain) {
    return {
      valid: false,
      error: {
        error: "Please enter a domain name",
        error_code: "EMPTY_DOMAIN",
        suggestions: ["Enter a domain name (e.g., example.com)"],
      },
    };
  }

  // Basic domain validation with a regular expression
  const domainRegex =
    /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

  if (!domainRegex.test(domain)) {
    return {
      valid: false,
      error: {
        error: "Invalid domain format",
        error_code: "INVALID_DOMAIN_FORMAT",
        suggestions: [
          "Domain should be in format: example.com",
          "Don't include http:// or www.",
          "Check for typos and special characters",
        ],
      },
    };
  }

  return { valid: true };
}

// Show toast notification (utility function)
function showToast(message, type = "info", duration = 5000) {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  // Create the toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  // Set icon based on type
  let icon;
  switch (type) {
    case "error":
      icon = "exclamation-circle";
      break;
    case "warning":
      icon = "exclamation-triangle";
      break;
    case "success":
      icon = "check-circle";
      break;
    default:
      icon = "info-circle";
  }

  // Create toast content
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas fa-${icon}"></i>
    </div>
    <div class="toast-content">${message}</div>
    <button class="toast-close">
      <i class="fas fa-times"></i>
    </button>
  `;

  // Add to container
  toastContainer.appendChild(toast);

  // Add close button functionality
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.classList.add("toast-hiding");
    setTimeout(() => {
      toast.remove();
    }, 300); // Match the CSS transition duration
  });

  // Auto-remove after duration
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add("toast-hiding");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }
  }, duration);

  // Show toast with animation
  setTimeout(() => {
    toast.classList.add("toast-visible");
  }, 10);
}

// Render error message
function renderErrorMessage(error) {
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

  // Return the complete error HTML
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
function handleNetworkError(error) {
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

// Updated checkRecord function with enhanced error handling
async function checkRecord() {
  const domain = domainInput.value.trim();
  const recordType = recordTypeSelect.value;

  // Store for potential retries
  errorState.lastDomain = domain;
  errorState.lastRecordType = recordType;

  // Reset overview container
  overviewContainer.style.display = "none";

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
      resultBox.innerHTML = renderErrorMessage({
        error: data.error || `Error: ${response.status} ${response.statusText}`,
        error_code: data.error_code || `HTTP_${response.status}`,
        suggestions: data.suggestions || getDefaultSuggestions(response.status),
      });
      return;
    }

    // Add to history
    addToHistory(domain, recordType);

    // Success! Reset retry count
    errorState.retryCount = 0;

    // Handle success response
    if (recordType === "overview") {
      // Display overview score container
      overviewContainer.style.display = "block";

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
    resultBox.innerHTML = renderErrorMessage(errorObj);

    // Instead of using setTimeout to attach a click listener,
    // dynamically create and append the retry button if conditions are met.
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

      // Append the button into a designated container inside the error message.
      // For example, if renderErrorMessage creates a container with class "issue-description":
      const errorDescription = resultBox.querySelector(".issue-description");
      if (errorDescription) {
        errorDescription.appendChild(retryButton);
      }
    }
  }
}

// Get default suggestions based on HTTP status code
function getDefaultSuggestions(statusCode) {
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

// Render multiple records for overview
function renderDetailedRecords(records) {
  if (!records || !Array.isArray(records) || records.length === 0) {
    return "<div class='error'>No records found for this domain.</div>";
  }

  return records
    .map((record, index) => renderDetailedRecordCard(record, index))
    .join("");
}

// Render a single record
function renderDetailedRecord(recordType, data) {
  const record = {
    title: recordType.toUpperCase(),
    value: data,
    parsed_record: data.parsed_record || {},
    status: data.error ? "error" : "success",
  };

  return renderDetailedRecordCard(record, 0);
}

// Updated renderDetailedRecordCard function to fix DKIM status display
function renderDetailedRecordCard(record, index) {
  const recordId = `record-${index}`;

  // Determine the correct status for DKIM records
  let statusClass, statusText, statusIcon;

  if (record.title === "DKIM") {
    // For DKIM, check if any selectors were found successfully
    const foundSelectors = [];
    if (!record.value.error) {
      for (const [selector, data] of Object.entries(record.value)) {
        if (
          data.status === "success" &&
          data.dkim_records &&
          data.dkim_records.length > 0
        ) {
          foundSelectors.push(selector);
        }
      }
    }

    // Set status based on whether any valid DKIM records were found
    if (foundSelectors.length > 0) {
      statusClass = "status-success";
      statusText = "Success";
      statusIcon = "check-circle";
    } else {
      statusClass = "status-error";
      statusText = "Error";
      statusIcon = "exclamation-circle";
    }
  } else {
    // For non-DKIM records, use the original status logic
    statusClass = record.status === "error" ? "status-error" : "status-success";
    statusText = record.status === "error" ? "Error" : "Success";
    statusIcon =
      record.status === "error" ? "exclamation-circle" : "check-circle";
  }

  // Extract the actual record text based on record type
  let actualRecordText = "";
  if (record.status !== "error") {
    if (
      record.title === "DMARC" &&
      record.value.dmarc_records &&
      record.value.dmarc_records.length > 0
    ) {
      actualRecordText = record.value.dmarc_records[0];
    } else if (record.title === "SPF" && record.value.spf_record) {
      actualRecordText = record.value.spf_record;
    } else if (record.title === "DKIM") {
      // For DKIM, show a summary of which selectors were found
      const foundSelectors = [];
      const notFoundSelectors = [];

      for (const [selector, data] of Object.entries(record.value)) {
        if (
          data.status === "success" &&
          data.dkim_records &&
          data.dkim_records.length > 0
        ) {
          foundSelectors.push(selector);
        } else {
          notFoundSelectors.push(selector);
        }
      }

      if (foundSelectors.length > 0) {
        actualRecordText = `Found valid records for selectors: ${foundSelectors.join(
          ", "
        )}`;
      } else {
        actualRecordText = "No valid DKIM records found for any selector";
      }
    } else if (record.title === "DNS") {
      // For DNS, show a summary of found record types
      const recordTypes = [];
      if (record.value.parsed_record) {
        Object.keys(record.value.parsed_record).forEach((type) => {
          if (record.value.parsed_record[type].length > 0) {
            recordTypes.push(type);
          }
        });
      }
      actualRecordText = `Found record types: ${recordTypes.join(", ")}`;
    }
  }

  // Determine recommendations based on record type and content
  let recommendations = "";
  if (record.title === "DMARC" && record.status === "success") {
    const p = record.parsed_record.p || "";
    if (p === "none") {
      recommendations = `
        <div class="recommendation">
          <h4>Recommendation</h4>
          <p>Your DMARC policy is set to 'none', which only monitors emails without taking action on failures. For better security, consider upgrading to 'quarantine' or 'reject' once you've verified that legitimate emails are passing DMARC checks.</p>
        </div>
      `;
    }
  } else if (record.title === "SPF" && record.status === "success") {
    if (record.value.spf_record && record.value.spf_record.includes("~all")) {
      recommendations = `
        <div class="recommendation">
          <h4>Recommendation</h4>
          <p>Your SPF record uses a soft fail (~all) mechanism. For stronger protection against email spoofing, consider using a hard fail (-all) once you've verified all legitimate email sources are included in your SPF record.</p>
        </div>
      `;
    }
  } else if (record.title === "DKIM" && statusClass === "status-error") {
    recommendations = `
      <div class="recommendation">
        <h4>Recommendation</h4>
        <p>No valid DKIM records were found for any of the checked selectors. To improve email authentication, you should set up DKIM for your domain using selectors specified by your email service provider.</p>
      </div>
    `;
  }

  // Show suggestions if available (from server response)
  if (record.value.suggestions && record.value.suggestions.length > 0) {
    const suggestionsHtml = record.value.suggestions
      .map((suggestion) => `<li>${suggestion}</li>`)
      .join("");

    recommendations += `
      <div class="recommendation">
        <h4>Server Suggestions</h4>
        <ul class="suggestions-list">
          ${suggestionsHtml}
        </ul>
      </div>
    `;
  }

  // Parse record details for detailed view
  let parsedDetails = "";
  if (record.parsed_record && Object.keys(record.parsed_record).length > 0) {
    parsedDetails = `
      <table>
        <thead>
          <tr>
            <th>Attribute</th>
            <th>Value</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(record.parsed_record)
            .map(
              ([key, value]) => `
              <tr>
                <td><strong>${key}</strong></td>
                <td>${value || "N/A"}</td>
                <td>${getExplanation(key, record.title.toLowerCase())}</td>
              </tr>
            `
            )
            .join("")}
        </tbody>
      </table>
    `;
  } else {
    parsedDetails = "<p>No parsed details available.</p>";
  }

  return `
    <div class="record-card">
      <div class="record-header" onclick="toggleRecordCard('${recordId}-body')">
        <div class="record-title-area">
          <h3>
            <i class="fas fa-shield-alt"></i>
            ${record.title}
          </h3>
          ${
            actualRecordText
              ? `<div class="actual-record">${actualRecordText}</div>`
              : ""
          }
        </div>
        <div class="record-controls">
          <span class="status-indicator ${statusClass}">
            <i class="fas fa-${statusIcon}"></i>
            ${statusText}
          </span>
          <i class="fas fa-chevron-down expand-icon"></i>
        </div>
      </div>
      <div class="record-body" id="${recordId}-body">
        <div class="tabs" id="${recordId}-tabs">
          <div class="tab active" data-tab="raw" onclick="switchTab('${recordId}', 'raw')">Raw Data</div>
          <div class="tab" data-tab="parsed" onclick="switchTab('${recordId}', 'parsed')">Parsed Details</div>
          <div class="tab" data-tab="recommendations" onclick="switchTab('${recordId}', 'recommendations')">Recommendations</div>
        </div>
        
        <div class="tab-content active" id="${recordId}-raw">
          <div class="record-data">
            <pre>${JSON.stringify(record.value, null, 2)}</pre>
            <div class="action-buttons">
              <button class="secondary" onclick="copyToClipboard('${JSON.stringify(
                record.value
              ).replace(/'/g, "\\'")}')">
                <i class="fas fa-copy"></i> Copy
              </button>
            </div>
          </div>
        </div>
        
        <div class="tab-content" id="${recordId}-parsed">
          <div class="parsed-data">
            ${parsedDetails}
          </div>
        </div>
        
        <div class="tab-content" id="${recordId}-recommendations">
          ${
            recommendations ||
            `<p>No specific recommendations available for this ${record.title} record.</p>`
          }
        </div>
      </div>
    </div>
  `;
}

// Function to update the overview dashboard with correct DKIM status
function updateOverviewDashboard(records) {
  // Find the DKIM record
  const dkimRecord = records.find((record) => record.title === "DKIM");

  if (dkimRecord) {
    // Check if any valid DKIM selectors were found
    let validDkimFound = false;

    if (!dkimRecord.value.error) {
      for (const [selector, data] of Object.entries(dkimRecord.value)) {
        if (
          data.status === "success" &&
          data.dkim_records &&
          data.dkim_records.length > 0
        ) {
          validDkimFound = true;
          break;
        }
      }
    }

    // Update the DKIM indicator in the overview
    const dkimItem = document.querySelector(
      ".score-details .score-item:nth-child(3) .score-item-value"
    );
    if (dkimItem) {
      if (validDkimFound) {
        dkimItem.innerHTML = '<i class="fas fa-check-circle"></i>';
        dkimItem.style.color = "var(--success-color)";
      } else {
        dkimItem.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        dkimItem.style.color = "var(--error-color)";
      }
    }

    // Update the authentication score
    updateAuthenticationScore();
  }
}

// Function to update the authentication score based on all records
function updateAuthenticationScore() {
  const scoreItems = document.querySelectorAll(
    ".score-details .score-item-value"
  );
  let totalItems = scoreItems.length;
  let successItems = 0;

  scoreItems.forEach((item) => {
    if (item.innerHTML.includes("fa-check-circle")) {
      successItems++;
    }
  });

  const scorePercentage = Math.round((successItems / totalItems) * 100);
  const scoreCircle = document.querySelector(".score-circle");
  const scoreValue = document.querySelector(".score-value");

  if (scoreCircle && scoreValue) {
    scoreCircle.style.setProperty("--score-percent", `${scorePercentage}%`);
    scoreValue.textContent = `${scorePercentage}%`;
  }
}

// Record explanations
function getExplanation(key, recordType) {
  const explanations = {
    dmarc: {
      v: "Version of the DMARC policy",
      p: "Policy for emails failing DMARC checks (e.g., 'none', 'quarantine', 'reject')",
      sp: "Policy for subdomains failing DMARC checks",
      pct: "Percentage of emails to which the DMARC policy is applied",
      rua: "Aggregate report URIs (e.g., email addresses) where feedback is sent",
      ruf: "Forensic report URIs for individual failure events",
      adkim: "Alignment mode for DKIM (strict or relaxed)",
      aspf: "Alignment mode for SPF (strict or relaxed)",
      fo: "Failure options for DMARC failures",
      rf: "Report format for forensic reports",
      ri: "Interval for aggregate reports in seconds",
    },
    spf: {
      v: "Version of the SPF policy",
      "-all": "Defines a hard fail policy for unauthorized email sources",
      "~all": "Defines a soft fail policy for unauthorized email sources",
      "?all": "Defines a neutral policy for unauthorized email sources",
      "+all": "Defines a policy to allow all email sources (not recommended)",
      ip4: "Specifies an IPv4 address range allowed to send emails",
      ip6: "Specifies an IPv6 address range allowed to send emails",
      a: "Allows all A records in the domain to send emails",
      mx: "Allows all MX records in the domain to send emails",
      redirect: "Redirects to another domain for SPF checks",
      include: "Includes another domain for SPF checks",
    },
    dkim: {
      v: "Version of the DKIM policy",
      k: "Key type used for DKIM signing (e.g., 'rsa')",
      p: "Public key used for verifying DKIM signatures",
      s: "Service type (e.g., email)",
      t: "Flags indicating testing mode",
      h: "Headers included in the DKIM signature",
    },
    dns: {
      A: "IPv4 address records for the domain",
      AAAA: "IPv6 address records for the domain",
      MX: "Mail exchange server records for the domain",
      TXT: "Text records containing metadata for the domain",
    },
  };

  return explanations[recordType]?.[key] || "No explanation available";
}

// Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", initApp);
