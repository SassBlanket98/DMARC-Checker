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
    if (event.key === "Enter") {
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
function removeSelector(element) {
  element.parentElement.remove();
}

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
  // In a real implementation, this would generate a file with the results
  alert(
    "This would export the current results to a JSON or PDF file in a complete implementation."
  );
}

// Handle batch check button click
function handleBatchCheck() {
  // In a real implementation, this would open a modal for entering multiple domains
  alert(
    "This would open a dialog to check multiple domains at once in a complete implementation."
  );
}

// Toggle record card expansion
function toggleRecordCard(id) {
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
}

// Switch tabs in record cards
function switchTab(recordId, tabName) {
  // Hide all tab contents in this record
  const tabContents = document.querySelectorAll(`#${recordId} .tab-content`);
  tabContents.forEach((tab) => tab.classList.remove("active"));

  // Remove active class from all tabs
  const tabs = document.querySelectorAll(`#${recordId}-tabs .tab`);
  tabs.forEach((tab) => tab.classList.remove("active"));

  // Show selected tab
  document.getElementById(`${recordId}-${tabName}`).classList.add("active");
  document
    .querySelector(`#${recordId}-tabs .tab[data-tab="${tabName}"]`)
    .classList.add("active");
}

// Copy record data to clipboard
function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      // Show a success message
      alert("Copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
      alert("Failed to copy text. Please try again.");
    });
}

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

// Record checking function - core functionality
async function checkRecord() {
  const domain = document.getElementById("domain").value.trim();
  const recordType = document.getElementById("recordType").value;

  // Validate domain input
  if (!domain) {
    resultBox.innerHTML = `
      <div class="issue-item issue-error">
        <div class="issue-icon">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <div class="issue-content">
          <div class="issue-title">Invalid Input</div>
          <div class="issue-description">
            Please enter a valid domain name.
          </div>
        </div>
      </div>
    `;
    overviewContainer.style.display = "none";
    return;
  }

  // Get DKIM selectors if applicable
  let selectors = [];
  if (recordType === "dkim") {
    const selectorTags = document.querySelectorAll(".selector-tag");
    selectorTags.forEach((tag) => {
      selectors.push(tag.textContent.trim());
    });
  }

  // Construct API URL
  const url =
    recordType === "overview"
      ? `/api/overview?domain=${domain}`
      : `/api/${recordType}?domain=${domain}${
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
  overviewContainer.style.display = "none";

  try {
    // Fetch data from API
    const response = await fetch(url);
    const data = await response.json();

    // Add to history
    addToHistory(domain, recordType);

    // Handle API response
    if (response.ok) {
      if (recordType === "overview") {
        // Display overview score container
        overviewContainer.style.display = "block";

        // Render records
        resultBox.innerHTML = renderDetailedRecords(data.records);
      } else {
        // Render single record
        resultBox.innerHTML = renderDetailedRecord(recordType, data);
      }
    } else {
      resultBox.innerHTML = `
        <div class="issue-item issue-error">
          <div class="issue-icon">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <div class="issue-content">
            <div class="issue-title">API Error</div>
            <div class="issue-description">
              ${data.error || "Failed to fetch data from the server."}
            </div>
          </div>
        </div>
      `;
    }
  } catch (error) {
    resultBox.innerHTML = `
      <div class="issue-item issue-error">
        <div class="issue-icon">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <div class="issue-content">
          <div class="issue-title">Error</div>
          <div class="issue-description">
            ${error.message || "An unexpected error occurred."}
          </div>
        </div>
      </div>
    `;
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

// Render a detailed record card with tabs
function renderDetailedRecordCard(record, index) {
  const recordId = `record-${index}`;
  const statusClass =
    record.status === "error" ? "status-error" : "status-success";
  const statusText = record.status === "error" ? "Error" : "Success";
  const statusIcon =
    record.status === "error" ? "exclamation-circle" : "check-circle";

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
        if (data.status === "success") {
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

// Switch tabs in record cards - Updated to force displaying only the selected tab
function switchTab(recordId, tabName) {
  // Hide all tab contents in this record
  const tabContents = document.querySelectorAll(
    `#${recordId}-body .tab-content`
  );
  tabContents.forEach((tab) => {
    tab.classList.remove("active");
    tab.style.display = "none"; // Force hide all tabs with inline style
  });

  // Remove active class from all tabs
  const tabs = document.querySelectorAll(`#${recordId}-tabs .tab`);
  tabs.forEach((tab) => tab.classList.remove("active"));

  // Show selected tab
  const activeTab = document.getElementById(`${recordId}-${tabName}`);
  if (activeTab) {
    activeTab.classList.add("active");
    activeTab.style.display = "block"; // Force show the active tab with inline style
  }

  document
    .querySelector(`#${recordId}-tabs .tab[data-tab="${tabName}"]`)
    .classList.add("active");
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
