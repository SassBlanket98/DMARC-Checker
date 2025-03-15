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
          domainSuggestions.classList.remove("visible");
        });
        domainSuggestions.appendChild(div);
      });
      domainSuggestions.classList.add("visible");
    } else {
      domainSuggestions.classList.remove("visible");
    }
  } else {
    domainSuggestions.classList.remove("visible");
  }
}

// Handle document click to hide suggestions
function handleDocumentClick(event) {
  if (
    !domainInput.contains(event.target) &&
    !domainSuggestions.contains(event.target)
  ) {
    domainSuggestions.classList.remove("visible");
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
  if (!body) {
    console.error(`Element with id ${id} not found`);
    return;
  }

  body.classList.toggle("expanded");

  const header = body.previousElementSibling;
  if (!header) {
    console.error(`Header element not found for ${id}`);
    return;
  }

  const icon = header.querySelector(".expand-icon");
  if (!icon) {
    console.error(`Expand icon not found for ${id}`);
    return;
  }

  if (body.classList.contains("expanded")) {
    icon.classList.remove("fa-chevron-down");
    icon.classList.add("fa-chevron-up");
  } else {
    icon.classList.remove("fa-chevron-up");
    icon.classList.add("fa-chevron-down");
  }
};

// Updated switchTab function to properly hide inactive tabs
window.switchTab = function (recordId, tabName) {
  // Get the tab container
  const tabContainer = document.getElementById(`${recordId}-tabs`);
  if (!tabContainer) {
    console.error(`Tab container for ${recordId} not found`);
    return;
  }

  // Hide all tab contents in this record
  const tabContents = document.querySelectorAll(`#${recordId} .tab-content`);
  if (tabContents.length === 0) {
    // If we can't find tab contents with the original selector, try a more specific one
    const altTabContents = document.querySelectorAll(
      `[id^="${recordId}-"][id$="-raw"], [id^="${recordId}-"][id$="-parsed"], [id^="${recordId}-"][id$="-recommendations"]`
    );
    altTabContents.forEach((tab) => {
      tab.classList.remove("active");
    });
  } else {
    tabContents.forEach((tab) => {
      tab.classList.remove("active");
    });
  }

  // Remove active class from all tabs
  const tabs = tabContainer.querySelectorAll(".tab");
  tabs.forEach((tab) => tab.classList.remove("active"));

  // Show selected tab
  const activeTab = document.getElementById(`${recordId}-${tabName}`);
  if (activeTab) {
    activeTab.classList.add("active");
  } else {
    console.error(`Tab ${tabName} for ${recordId} not found`);
  }

  // Add active class to selected tab button
  const activeTabButton = tabContainer.querySelector(
    `.tab[data-tab="${tabName}"]`
  );
  if (activeTabButton) {
    activeTabButton.classList.add("active");
  } else {
    console.error(`Tab button for ${tabName} not found`);
  }
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

// Updated renderErrorMessage function with improved DKIM error display
function renderErrorMessage(error, recordType = null) {
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

// Enhanced DKIM record render function
function renderDkimRecord(data, domain) {
  // Handle case where there's a general error (not selector-specific)
  if (data.error) {
    return renderErrorMessage(data, "DKIM");
  }

  // Track successful and failed selectors
  const foundSelectors = [];
  const notFoundSelectors = [];
  const selectorDetails = [];

  // Loop through all properties to find selectors
  for (const [key, value] of Object.entries(data)) {
    // Skip non-selector keys
    if (
      key === "overall_status" ||
      key === "recommendations" ||
      key === "suggestions"
    ) {
      continue;
    }

    // Handle successful selectors
    if (
      value.status === "success" &&
      value.dkim_records &&
      value.dkim_records.length > 0
    ) {
      foundSelectors.push(key);

      // Add detailed information for each found selector
      value.dkim_records.forEach((record) => {
        selectorDetails.push(`
            <div class="dkim-selector-detail success">
              <div class="selector-name">
                <i class="fas fa-check-circle"></i> 
                Selector: <strong>${key}</strong>
              </div>
              <div class="selector-record">
                <pre>${record}</pre>
                <button onclick="copyToClipboard(\`${record
                  .replace(/'/g, "\\'")
                  .replace(/"/g, '\\"')}\`)" class="secondary small">
                  <i class="fas fa-copy"></i> Copy
                </button>
              </div>
            </div>
          `);
      });
    }
    // Handle failed selectors
    else {
      notFoundSelectors.push(key);

      // Add detailed information for each not found selector
      const errorMessage = value.error || "No DKIM record found";
      selectorDetails.push(`
          <div class="dkim-selector-detail error">
            <div class="selector-name">
              <i class="fas fa-times-circle"></i> 
              Selector: <strong>${key}</strong>
            </div>
            <div class="selector-error">
              <p>${errorMessage}</p>
              ${
                value.error_code
                  ? `<div class="error-code">Error code: ${value.error_code}</div>`
                  : ""
              }
              ${
                value.suggestions && value.suggestions.length > 0
                  ? `<div class="selector-suggestions">
                  <p><strong>Suggestions:</strong></p>
                  <ul>${value.suggestions
                    .map((s) => `<li>${s}</li>`)
                    .join("")}</ul>
                </div>`
                  : ""
              }
            </div>
          </div>
        `);
    }
  }

  // Generate summary text
  let summaryText = `<h4>DKIM Records for ${domain}</h4>`;

  if (foundSelectors.length > 0) {
    summaryText += `<p class="dkim-summary success"><i class="fas fa-check-circle"></i> Found valid DKIM records for selectors: <strong>${foundSelectors.join(
      ", "
    )}</strong></p>`;
  }

  if (notFoundSelectors.length > 0) {
    summaryText += `<p class="dkim-summary error"><i class="fas fa-times-circle"></i> No valid DKIM records found for selectors: <strong>${notFoundSelectors.join(
      ", "
    )}</strong></p>`;
  }

  // Add global suggestions if available
  let suggestionsHtml = "";
  if (data.suggestions && data.suggestions.length > 0) {
    const suggestionsItems = data.suggestions
      .map((suggestion) => `<li>${suggestion}</li>`)
      .join("");
    suggestionsHtml = `
        <div class="dkim-suggestions">
          <p><i class="fas fa-lightbulb"></i> Suggestions:</p>
          <ul>${suggestionsItems}</ul>
        </div>
      `;
  }

  // Combine all elements for the complete content
  return `
      <div class="dkim-details">
        ${summaryText}
        
        <div class="dkim-selectors-container">
          <h4>Selector Details:</h4>
          ${
            selectorDetails.length > 0
              ? selectorDetails.join("")
              : `
            <div class="empty-state">
              <p>No DKIM selectors were checked successfully.</p>
              <p>Try adding different selectors based on your email service provider.</p>
            </div>
          `
          }
        </div>
        
        ${suggestionsHtml}
        
        <div class="dkim-common-selectors">
          <h4>Common DKIM Selectors by Provider:</h4>
          <ul>
            <li><strong>Google Workspace:</strong> google, 20160929, 20161025</li>
            <li><strong>Microsoft 365:</strong> selector1, selector2</li>
            <li><strong>Zoho:</strong> zoho</li>
            <li><strong>Amazon SES:</strong> amazonses</li>
            <li><strong>Mailchimp:</strong> k1, k2, k3</li>
            <li><strong>Other:</strong> default, dkim, mail</li>
          </ul>
        </div>
      </div>
    `;
}

// Updated checkRecord function to pass record type to error handler
async function checkRecord() {
  const domain = domainInput.value.trim();
  const recordType = recordTypeSelect.value;

  // Store for potential retries
  errorState.lastDomain = domain;
  errorState.lastRecordType = recordType;

  // Reset overview container
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
      // Display overview score container
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

    // Dynamically create and append the retry button if conditions are met.
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

function renderDetailedRecord(recordType, data) {
  // For DMARC records, extract the actual record text to display
  let recordPreview = "";
  if (
    recordType.toUpperCase() === "DMARC" &&
    data.dmarc_records &&
    data.dmarc_records.length > 0
  ) {
    recordPreview = `<div class="main-record-preview">${data.dmarc_records[0]}</div>`;
  } else if (recordType.toUpperCase() === "SPF" && data.spf_record) {
    recordPreview = `<div class="main-record-preview">${data.spf_record}</div>`;
  }

  // Format the record as if it were a standard record
  const record = {
    title: recordType.toUpperCase(),
    value: data,
    parsed_record: data.parsed_record || {},
    status: data.error ? "error" : "success",
  };

  // Wrap the record in a container with the preview at the top level
  return `
    <div class="record-container">
      ${recordPreview}
      ${renderDetailedRecordCard(record, 0)}
    </div>
  `;
}

// Enhanced function to render the raw data content for different record types
function renderRawDataContent(record) {
  // Special handling for DKIM records (this already has enhanced display)
  if (record.title === "DKIM") {
    return renderDkimRecord(record.value, errorState.lastDomain);
  }
  // For error records, show the existing error message
  else if (record.status === "error") {
    return renderErrorMessage(record.value);
  }

  // Get record text based on record type
  let recordText = "";
  let recordData = null;

  if (
    record.title === "DMARC" &&
    record.value.dmarc_records &&
    record.value.dmarc_records.length > 0
  ) {
    recordText = record.value.dmarc_records[0];
    recordData = record.value.parsed_record || {};
  } else if (record.title === "SPF" && record.value.spf_record) {
    recordText = record.value.spf_record;
    recordData = record.value.parsed_record || {};
  } else if (record.title === "DNS") {
    // For DNS, customize based on available data
    return renderDnsRawData(record.value);
  }

  // If we don't have record text, show a simple message
  if (!recordText) {
    return `<div class="record-data"><p>No raw data available.</p></div>`;
  }

  // Escape special characters for the copy button
  const escapedText = recordText.replace(/'/g, "\\'").replace(/"/g, '\\"');

  // Based on record type, generate enhanced displays
  if (record.title === "DMARC") {
    return renderDmarcRawData(recordText, recordData);
  } else if (record.title === "SPF") {
    return renderSpfRawData(recordText, recordData);
  } else {
    // Default display for other record types
    return `
      <div class="record-data">
        <div class="actual-record expanded-record">
          ${recordText}
        </div>
        <div class="action-buttons">
          <button onclick="copyToClipboard('${escapedText}')" class="secondary">
            <i class="fas fa-copy"></i> Copy
          </button>
        </div>
      </div>
    `;
  }
}

// Enhanced DMARC raw data display with breakdowns and explanations
function renderDmarcRawData(recordText, parsedData) {
  // Split the DMARC record into its component parts
  const dmarcParts = recordText
    .replace(/"/g, "")
    .split(";")
    .filter((p) => p.trim());

  // Create a visual breakdown of the DMARC record
  const partsHtml = dmarcParts
    .map((part) => {
      const trimmedPart = part.trim();
      let explanation = "";
      let highlightClass = "";

      // Add explanations for common tags
      if (trimmedPart.startsWith("v=")) {
        explanation = "Version tag - identifies this as a DMARC record";
      } else if (trimmedPart.startsWith("p=")) {
        const policy = trimmedPart.split("=")[1];
        explanation = `Policy tag - specifies how to handle emails that fail DMARC checks`;

        // Highlight different policy levels
        if (policy === "none") {
          highlightClass = "tag-policy-none";
          explanation += ` (monitoring only)`;
        } else if (policy === "quarantine") {
          highlightClass = "tag-policy-quarantine";
          explanation += ` (suspicious emails go to spam)`;
        } else if (policy === "reject") {
          highlightClass = "tag-policy-reject";
          explanation += ` (failing emails are rejected)`;
        }
      } else if (trimmedPart.startsWith("sp=")) {
        explanation =
          "Subdomain policy tag - policy for organizational subdomains";
      } else if (trimmedPart.startsWith("pct=")) {
        explanation =
          "Percentage tag - applies policy to this percentage of suspicious emails";
      } else if (trimmedPart.startsWith("rua=")) {
        explanation =
          "Aggregate report URI - email address to receive aggregate reports";
      } else if (trimmedPart.startsWith("ruf=")) {
        explanation =
          "Forensic report URI - email address to receive detailed failure reports";
      } else if (trimmedPart.startsWith("fo=")) {
        explanation =
          "Failure reporting options - controls what info is included in failure reports";
      } else if (trimmedPart.startsWith("adkim=")) {
        explanation =
          "DKIM alignment mode - strict or relaxed DKIM domain matching";
      } else if (trimmedPart.startsWith("aspf=")) {
        explanation =
          "SPF alignment mode - strict or relaxed SPF domain matching";
      } else if (trimmedPart.startsWith("ri=")) {
        explanation =
          "Report interval - how often reports should be sent (in seconds)";
      }

      return `
      <div class="dmarc-part ${highlightClass}">
        <div class="dmarc-part-value">${trimmedPart}</div>
        <div class="dmarc-part-explanation">${explanation}</div>
      </div>
    `;
    })
    .join("");

  // Determine overall policy strength
  let policyStrength = "";
  let policyIcon = "";

  if (parsedData && parsedData.p) {
    if (parsedData.p === "reject") {
      policyStrength = '<span class="policy-strong">Strong Protection</span>';
      policyIcon = '<i class="fas fa-shield-alt"></i>';
    } else if (parsedData.p === "quarantine") {
      policyStrength = '<span class="policy-medium">Medium Protection</span>';
      policyIcon = '<i class="fas fa-shield-alt"></i>';
    } else if (parsedData.p === "none") {
      policyStrength = '<span class="policy-weak">Monitoring Only</span>';
      policyIcon = '<i class="fas fa-eye"></i>';
    }
  }

  // Check for reporting configuration
  const hasAggregateReports = parsedData && parsedData.rua ? true : false;
  const hasForensicReports = parsedData && parsedData.ruf ? true : false;

  // Create the enhanced display
  return `
    <div class="dmarc-raw-container">
      <div class="dmarc-visual-summary">
        <div class="policy-indicator">
          ${policyIcon}
          <div>${policyStrength}</div>
        </div>
        <div class="dmarc-settings">
          <div class="dmarc-setting">
            <i class="fas ${
              parsedData && parsedData.p
                ? "fa-check-circle setting-enabled"
                : "fa-times-circle setting-disabled"
            }"></i>
            <span>Policy: ${
              parsedData && parsedData.p ? parsedData.p : "Not specified"
            }</span>
          </div>
          <div class="dmarc-setting">
            <i class="fas ${
              hasAggregateReports
                ? "fa-check-circle setting-enabled"
                : "fa-times-circle setting-disabled"
            }"></i>
            <span>Aggregate Reports: ${
              hasAggregateReports ? "Configured" : "Not configured"
            }</span>
          </div>
          <div class="dmarc-setting">
            <i class="fas ${
              hasForensicReports
                ? "fa-check-circle setting-enabled"
                : "fa-times-circle setting-disabled"
            }"></i>
            <span>Forensic Reports: ${
              hasForensicReports ? "Configured" : "Not configured"
            }</span>
          </div>
          <div class="dmarc-setting">
            <i class="fas ${
              parsedData && parsedData.pct
                ? "fa-check-circle setting-enabled"
                : "fa-info-circle"
            }"></i>
            <span>Percentage: ${
              parsedData && parsedData.pct
                ? parsedData.pct + "%"
                : "100% (default)"
            }</span>
          </div>
        </div>
      </div>
      
      <div class="dmarc-original-record">
        ${recordText}
      </div>
      
      <div class="dmarc-breakdown-title">Record Breakdown</div>
      <div class="dmarc-parts">
        ${partsHtml}
      </div>
      
      <div class="action-buttons">
        <button onclick="copyToClipboard('${recordText
          .replace(/'/g, "\\'")
          .replace(/"/g, '\\"')}')" class="secondary">
          <i class="fas fa-copy"></i> Copy Record
        </button>
      </div>
    </div>
  `;
}

// Enhanced SPF raw data display with visual breakdown
function renderSpfRawData(recordText, parsedData) {
  // Split the SPF record into its component parts
  const spfParts = recordText
    .replace(/"/g, "")
    .split(" ")
    .filter((p) => p.trim());

  // Create a visual breakdown of the SPF record
  const partsHtml = spfParts
    .map((part) => {
      const trimmedPart = part.trim();
      let explanation = "";
      let highlightClass = "";

      // Add explanations for common mechanisms
      if (trimmedPart.startsWith("v=spf1")) {
        explanation = "Version tag - identifies this as an SPF record";
        highlightClass = "tag-version";
      } else if (trimmedPart === "-all") {
        explanation =
          "Fail mechanism - email should be rejected if not from authorized sources (recommended)";
        highlightClass = "tag-all-reject";
      } else if (trimmedPart === "~all") {
        explanation =
          "SoftFail mechanism - unauthorized emails should be marked as suspicious but accepted";
        highlightClass = "tag-all-softfail";
      } else if (trimmedPart === "?all") {
        explanation =
          "Neutral mechanism - no policy recommendation (weak protection)";
        highlightClass = "tag-all-neutral";
      } else if (trimmedPart === "+all") {
        explanation =
          "Pass mechanism - allows all sources (security risk - not recommended)";
        highlightClass = "tag-all-pass";
      } else if (trimmedPart.startsWith("include:")) {
        const domain = trimmedPart.substring(8);
        explanation = `Include mechanism - references SPF record of ${domain}`;
        highlightClass = "tag-include";
      } else if (trimmedPart.startsWith("a:") || trimmedPart === "a") {
        explanation = "Allows the domain's A records to send mail";
        highlightClass = "tag-a";
      } else if (trimmedPart.startsWith("mx:") || trimmedPart === "mx") {
        explanation = "Allows the domain's MX records to send mail";
        highlightClass = "tag-mx";
      } else if (trimmedPart.startsWith("ip4:")) {
        explanation = "Allows the specified IPv4 address or range to send mail";
        highlightClass = "tag-ip";
      } else if (trimmedPart.startsWith("ip6:")) {
        explanation = "Allows the specified IPv6 address or range to send mail";
        highlightClass = "tag-ip";
      } else if (trimmedPart.startsWith("exists:")) {
        explanation = "Allows if the specified domain has an A record";
        highlightClass = "tag-exists";
      } else if (trimmedPart.startsWith("redirect=")) {
        explanation = "Redirects to another domain's SPF record";
        highlightClass = "tag-redirect";
      }

      return `
      <div class="spf-part ${highlightClass}">
        <div class="spf-part-value">${trimmedPart}</div>
        <div class="spf-part-explanation">${explanation}</div>
      </div>
    `;
    })
    .join("");

  // Determine overall policy strength based on the 'all' mechanism
  let policyStrength = "Not specified";
  let policyIcon = '<i class="fas fa-question-circle"></i>';

  if (recordText.includes("-all")) {
    policyStrength =
      '<span class="policy-strong">Strong Protection (Hard Fail)</span>';
    policyIcon = '<i class="fas fa-shield-alt"></i>';
  } else if (recordText.includes("~all")) {
    policyStrength =
      '<span class="policy-medium">Medium Protection (Soft Fail)</span>';
    policyIcon = '<i class="fas fa-shield-alt"></i>';
  } else if (recordText.includes("?all")) {
    policyStrength =
      '<span class="policy-weak">Weak Protection (Neutral)</span>';
    policyIcon = '<i class="fas fa-shield-alt"></i>';
  } else if (recordText.includes("+all")) {
    policyStrength =
      '<span class="policy-none">No Protection (Pass All - Risk)</span>';
    policyIcon = '<i class="fas fa-exclamation-triangle"></i>';
  }

  // Count the includes, IPs and other mechanisms
  const includesCount = spfParts.filter((p) => p.startsWith("include:")).length;
  const ipCount = spfParts.filter(
    (p) => p.startsWith("ip4:") || p.startsWith("ip6:")
  ).length;
  const hasA = spfParts.some((p) => p === "a" || p.startsWith("a:"));
  const hasMX = spfParts.some((p) => p === "mx" || p.startsWith("mx:"));

  // Create the enhanced display
  return `
    <div class="spf-raw-container">
      <div class="spf-visual-summary">
        <div class="policy-indicator">
          ${policyIcon}
          <div>${policyStrength}</div>
        </div>
        <div class="spf-settings">
          <div class="spf-setting">
            <i class="fas ${
              includesCount > 0
                ? "fa-check-circle setting-enabled"
                : "fa-info-circle"
            }"></i>
            <span>Includes: ${includesCount} domain${
    includesCount !== 1 ? "s" : ""
  }</span>
          </div>
          <div class="spf-setting">
            <i class="fas ${
              ipCount > 0 ? "fa-check-circle setting-enabled" : "fa-info-circle"
            }"></i>
            <span>IP addresses: ${ipCount}</span>
          </div>
          <div class="spf-setting">
            <i class="fas ${
              hasA ? "fa-check-circle setting-enabled" : "fa-info-circle"
            }"></i>
            <span>A records: ${hasA ? "Included" : "Not included"}</span>
          </div>
          <div class="spf-setting">
            <i class="fas ${
              hasMX ? "fa-check-circle setting-enabled" : "fa-info-circle"
            }"></i>
            <span>MX records: ${hasMX ? "Included" : "Not included"}</span>
          </div>
          <div class="spf-setting">
            <i class="fas ${
              includesCount > 10
                ? "fa-exclamation-triangle setting-warning"
                : "fa-info-circle"
            }"></i>
            <span>SPF Lookup Count: ${
              includesCount > 10
                ? "May exceed 10 DNS lookup limit!"
                : "Within limits"
            }</span>
          </div>
        </div>
      </div>
      
      <div class="spf-original-record">
        ${recordText}
      </div>
      
      <div class="spf-breakdown-title">Record Breakdown</div>
      <div class="spf-parts">
        ${partsHtml}
      </div>
      
      <div class="action-buttons">
        <button onclick="copyToClipboard('${recordText
          .replace(/'/g, "\\'")
          .replace(/"/g, '\\"')}')" class="secondary">
          <i class="fas fa-copy"></i> Copy Record
        </button>
      </div>
    </div>
  `;
}

// Enhanced DNS raw data display
function renderDnsRawData(recordData) {
  if (recordData.error) {
    return renderErrorMessage(recordData);
  }

  // Get parsed record if available
  const parsedRecord = recordData.parsed_record || {};

  // Create separate sections for each record type
  let recordSections = "";

  // Format for common DNS record types
  const recordTypes = ["A", "AAAA", "MX", "TXT"];

  recordTypes.forEach((type) => {
    if (parsedRecord[type] && parsedRecord[type].length > 0) {
      const recordItems = parsedRecord[type]
        .map((item) => {
          // Extract just the record text from the format "Record: xyz"
          const recordText = item.startsWith("Record: ")
            ? item.substring(8)
            : item;
          return `<li class="dns-record-item">${recordText}</li>`;
        })
        .join("");

      recordSections += `
        <div class="dns-record-section">
          <h4 class="dns-record-type">${type} Records</h4>
          <ul class="dns-record-list">
            ${recordItems}
          </ul>
        </div>
      `;
    }
  });

  // If no records were found
  if (!recordSections) {
    recordSections = `
      <div class="dns-no-records">
        <i class="fas fa-info-circle"></i>
        <p>No DNS records found for this domain.</p>
      </div>
    `;
  }

  // Add email providers if available
  let emailProviders = "";
  if (parsedRecord.email_providers && parsedRecord.email_providers.length > 0) {
    const providerItems = parsedRecord.email_providers
      .map(
        (provider) =>
          `<li class="provider-item"><i class="fas fa-envelope"></i> ${provider}</li>`
      )
      .join("");

    emailProviders = `
      <div class="email-providers-section">
        <h4>Detected Email Providers</h4>
        <ul class="provider-list">
          ${providerItems}
        </ul>
      </div>
    `;
  }

  // Create the enhanced display
  return `
    <div class="dns-raw-container">
      ${emailProviders}
      ${recordSections}
    </div>
  `;
}

// Enhanced renderDetailedRecordCard function with improved DKIM record display
function renderDetailedRecordCard(record, index) {
  const recordId = `record-${index}`;

  // Determine the correct status for DKIM records
  let statusClass, statusText, statusIcon;

  if (record.title === "DKIM") {
    // For DKIM, check if any selectors were found successfully
    const foundSelectors = [];
    const notFoundSelectors = [];

    if (!record.value.error) {
      for (const [selector, data] of Object.entries(record.value)) {
        if (
          selector !== "overall_status" &&
          selector !== "recommendations" &&
          selector !== "suggestions"
        ) {
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

  // Extract the actual record text to display in collapsed state
  let actualRecordText = "";
  if (
    record.title === "DMARC" &&
    record.value.dmarc_records &&
    record.value.dmarc_records.length > 0
  ) {
    actualRecordText = record.value.dmarc_records[0];
  } else if (record.title === "SPF" && record.value.spf_record) {
    actualRecordText = record.value.spf_record;
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

  // Create the record preview to show in collapsed state
  const recordPreview = actualRecordText
    ? `<div class="actual-record collapsed-record">${actualRecordText}</div>`
    : "";

  // Generate raw data content using the new enhanced function
  const rawDataContent = renderRawDataContent(record);

  // Generate parsed details rows (existing code remains the same)
  let parsedDetailRows = "";
  if (record.parsed_record && Object.keys(record.parsed_record).length > 0) {
    // Special handling for SPF record includes which might be arrays
    if (record.title === "SPF") {
      parsedDetailRows = Object.entries(record.parsed_record)
        .map(([key, value]) => {
          // Handle arrays (like for 'include' directives)
          let displayValue = value;
          if (Array.isArray(value)) {
            displayValue = value.join(", ");
          }

          // For 'include:domain.com' keys, display the original key in the table
          let displayKey = key;
          if (key.startsWith("include:")) {
            displayKey = key; // Keep the full key with domain
          }

          return `
        <tr>
          <td><strong>${displayKey}</strong></td>
          <td>${displayValue || "Not specified"}</td>
          <td>${getExplanation(key, record.title.toLowerCase())}</td>
        </tr>
        `;
        })
        .join("");
    } else {
      // Standard handling for other record types
      parsedDetailRows = Object.entries(record.parsed_record)
        .map(
          ([key, value]) => `
        <tr>
          <td><strong>${key}</strong></td>
          <td>${value || "Not specified"}</td>
          <td>${getExplanation(key, record.title.toLowerCase())}</td>
        </tr>
      `
        )
        .join("");
    }
  }

  // Determine recommendations based on record type and content
  let recommendations = "";
  if (record.title === "DMARC" && record.status === "success") {
    const dmarcData = record.value.parsed_record || {};
    const p = dmarcData.p || "";
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

  // Complete HTML for the record card with proper tab structure
  return `
    <div class="record-card">
      <div class="record-header" onclick="toggleRecordCard('${recordId}-body')">
        <div class="record-title-area">
          <h3>
            <i class="fas fa-file-alt"></i>
            ${record.title}
          </h3>
          <div class="status-indicator ${statusClass}">
            <i class="fas fa-${statusIcon}"></i>
            ${statusText}
          </div>
          ${recordPreview}
        </div>
        <div class="record-controls">
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
          ${rawDataContent}
        </div>
        
        <div class="tab-content" id="${recordId}-parsed">
          <div class="parsed-data">
            <table>
              <thead>
                <tr>
                  <th>Attribute</th>
                  <th>Value</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                ${
                  parsedDetailRows ||
                  "<tr><td colspan='3'>No parsed details available.</td></tr>"
                }
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="tab-content" id="${recordId}-recommendations">
          ${recommendations || "<p>No recommendations available.</p>"}
        </div>
      </div>
    </div>
  `;
}

// Function to update the overview dashboard with correct DKIM status
function updateOverviewDashboard(records) {
  // Initialize the score methodology modal
  initScoreDetailsModal();

  // Calculate the authentication score
  const scoreData = window.ScoreMethodology.calculateAuthScore(records);

  // Update the score circle with CSS variable
  const scoreCircle = document.querySelector(".score-circle");
  const scoreValue = document.querySelector(".score-value");

  if (scoreCircle && scoreValue) {
    // Update the score percentage using CSS variable
    scoreCircle.style.setProperty(
      "--score-percent",
      `${scoreData.overallScore}%`
    );
    scoreValue.textContent = `${scoreData.overallScore}%`;

    // Add the letter grade
    if (!document.querySelector(".letter-grade")) {
      const letterGrade = document.createElement("div");
      letterGrade.className = "letter-grade";
      letterGrade.textContent = `Grade ${scoreData.letterGrade}`;
      scoreValue.appendChild(letterGrade);
    } else {
      document.querySelector(
        ".letter-grade"
      ).textContent = `Grade ${scoreData.letterGrade}`;
    }

    // Add the letter grade indicator
    if (!document.querySelector(".score-letter")) {
      const letterIndicator = document.createElement("div");
      letterIndicator.className = `score-letter score-letter-${scoreData.letterGrade}`;
      letterIndicator.textContent = scoreData.letterGrade;
      document.querySelector(".score-container").appendChild(letterIndicator);
    } else {
      const letterIndicator = document.querySelector(".score-letter");
      letterIndicator.className = `score-letter score-letter-${scoreData.letterGrade}`;
      letterIndicator.textContent = scoreData.letterGrade;
    }
  }

  // Update the individual component indicators
  const componentScores = scoreData.componentScores;

  // Update each component in the score details
  Object.entries(componentScores).forEach(([component, data]) => {
    const componentItem = document.querySelector(
      `.score-details .score-item:nth-child(${getComponentIndex(
        component
      )}) .score-item-value`
    );

    if (componentItem) {
      if (data.status === "success") {
        componentItem.innerHTML = '<i class="fas fa-check-circle"></i>';
        componentItem.className = "score-item-value success";
      } else {
        componentItem.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        componentItem.className = "score-item-value error";
      }
    }
  });

  // Update the issues and recommendations section
  updateIssuesSection(scoreData.recommendations);

  // Add a "View Score Details" button
  if (!document.getElementById("view-score-details")) {
    const detailsButton = document.createElement("button");
    detailsButton.id = "view-score-details";
    detailsButton.className = "score-details-button";
    detailsButton.innerHTML =
      '<i class="fas fa-chart-bar"></i> View Detailed Score Breakdown';
    detailsButton.addEventListener("click", () =>
      openScoreDetailsModal(scoreData)
    );

    // Append after the score label
    document.querySelector(".score-label").after(detailsButton);
  }
}

// Helper function to get the component index in the score details section
function getComponentIndex(component) {
  const componentOrder = { dmarc: 1, spf: 2, dkim: 3, dns: 4 };
  return componentOrder[component] || 1;
}

// Update the issues section with recommendations
function updateIssuesSection(recommendations) {
  const issuesContainer = document.querySelector(".issues-container");
  if (!issuesContainer) return;

  // Clear existing issues except the title
  const issuesTitle = issuesContainer.querySelector("h3");
  issuesContainer.innerHTML = "";
  issuesContainer.appendChild(issuesTitle);

  if (recommendations.length === 0) {
    // Add a success message if no recommendations
    const successItem = document.createElement("div");
    successItem.className = "issue-item issue-info";
    successItem.innerHTML = `
      <div class="issue-icon">
        <i class="fas fa-check-circle"></i>
      </div>
      <div class="issue-content">
        <div class="issue-title">No Critical Issues Found</div>
        <div class="issue-description">
          Your email authentication configuration appears to be following best practices. Continue monitoring your domain's email security regularly.
        </div>
      </div>
    `;
    issuesContainer.appendChild(successItem);
  } else {
    // Add each recommendation as an issue
    recommendations.forEach((rec) => {
      const priority = rec.priority;
      const issueClass =
        priority === "high"
          ? "issue-error"
          : priority === "medium"
          ? "issue-warning"
          : "issue-info";
      const iconClass =
        priority === "high"
          ? "exclamation-circle"
          : priority === "medium"
          ? "exclamation-triangle"
          : "info-circle";

      const issueItem = document.createElement("div");
      issueItem.className = `issue-item ${issueClass}`;
      issueItem.innerHTML = `
        <div class="issue-icon">
          <i class="fas fa-${iconClass}"></i>
        </div>
        <div class="issue-content">
          <div class="issue-title">${rec.title}</div>
          <div class="issue-description">${rec.description}</div>
        </div>
      `;
      issuesContainer.appendChild(issueItem);
    });
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
      include: "Includes another domain's SPF policy in this domain's policy",
      warning: "Warning message about the SPF record configuration",
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

  // Handle specific case for include with modified key
  if (recordType === "spf" && key === "include") {
    return explanations.spf.include;
  }

  // Clean up key for SPF record types to match our explanations
  let lookupKey = key;
  if (recordType === "spf") {
    // Strip any domains from include: directives for lookup
    if (key.startsWith("include:")) {
      lookupKey = "include";
    }

    // Handle 'all' mechanisms with their modifiers
    if (["-all", "~all", "?all", "+all"].includes(key)) {
      lookupKey = key;
    }
  }

  return explanations[recordType]?.[lookupKey] || "No explanation available";
}

// Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", initApp);

// Score Details Modal
let scoreDetailsModal;
let currentScoreData;

function initScoreDetailsModal() {
  // Create the modal if it doesn't exist
  if (!document.getElementById("score-details-modal")) {
    const modalHtml = `
      <div id="score-details-modal" class="modal-backdrop">
        <div class="modal score-details-modal">
          <div class="modal-header">
            <div class="modal-title">Email Authentication Score Details</div>
            <button class="modal-close" id="score-details-close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body" id="score-details-content">
            <!-- Score details will be inserted here -->
          </div>
        </div>
      </div>
    `;

    // Append the modal to the body
    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    // Add event listeners
    document
      .getElementById("score-details-close")
      .addEventListener("click", closeScoreDetailsModal);
    document
      .getElementById("score-details-modal")
      .addEventListener("click", function (event) {
        if (event.target === this) {
          closeScoreDetailsModal();
        }
      });

    // Store the modal reference
    scoreDetailsModal = document.getElementById("score-details-modal");
  }
}

function openScoreDetailsModal(scoreData) {
  // Store the current score data
  currentScoreData = scoreData;

  // Generate the content
  const content = document.getElementById("score-details-content");
  content.innerHTML = generateScoreDetailsContent(scoreData);

  // Show the modal
  scoreDetailsModal.classList.add("open");
}

function closeScoreDetailsModal() {
  scoreDetailsModal.classList.remove("open");
}

function generateScoreDetailsContent(scoreData) {
  const { overallScore, letterGrade, componentScores, recommendations } =
    scoreData;

  // Generate HTML for each component
  const componentsHtml = Object.entries(componentScores)
    .map(([component, data]) => {
      const detailsHtml = data.details
        .map(
          (detail) => `
      <div class="score-detail-item">${detail}</div>
    `
        )
        .join("");

      return `
      <div class="score-component-details">
        <h4>
          ${component.toUpperCase()} 
          <span class="component-score">${data.score}/${
        data.maxScore
      } points</span>
          <span class="status-indicator status-${data.status}">
            <i class="fas fa-${
              data.status === "success" ? "check-circle" : "exclamation-circle"
            }"></i>
            ${data.status === "success" ? "Passed" : "Failed"}
          </span>
        </h4>
        <div class="score-detail-items">
          ${detailsHtml}
        </div>
      </div>
    `;
    })
    .join("");

  // Generate HTML for recommendations
  const recommendationsHtml =
    recommendations.length > 0
      ? recommendations
          .map(
            (rec) => `
      <div class="recommendation ${rec.priority}-priority">
        <h4>${rec.title}</h4>
        <p>${rec.description}</p>
      </div>
    `
          )
          .join("")
      : "<p>No additional recommendations at this time.</p>";

  // Complete content
  return `
    <div class="score-summary">
      <h3>Overall Score: ${overallScore}% (Grade ${letterGrade})</h3>
      <p>Your domain's email authentication configuration has been evaluated based on industry best practices.</p>
    </div>
    
    <h3>Component Scores</h3>
    ${componentsHtml}
    
    <h3>Recommendations</h3>
    ${recommendationsHtml}
    
    <div class="methodology-link">
      <p>
        <a href="#" id="view-methodology-link">View Score Methodology</a> to understand how these scores are calculated.
      </p>
    </div>
  `;
}

// Initialize event listener for viewing methodology from the score details modal
document.addEventListener("click", function (event) {
  if (event.target.id === "view-methodology-link") {
    event.preventDefault();
    closeScoreDetailsModal(); // Close the score details modal
    openHelpModal(); // Open the help modal

    // Scroll to the methodology section after a slight delay
    setTimeout(() => {
      const methodologySection = document.querySelector(
        ".modal-section:nth-child(5)"
      );
      if (methodologySection) {
        methodologySection.scrollIntoView({ behavior: "smooth" });
      }
    }, 300);
  }
});
