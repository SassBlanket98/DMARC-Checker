// static/js/modules/recordDisplay.js

import {
  renderDmarcRawData,
  renderSpfRawData,
  renderDnsRawData,
  renderDkimRecord,
} from "./recordParsers.js";
import {
  renderReputationData,
  renderReputationRecommendations,
} from "./reputation.js";
import { renderErrorMessage } from "./api.js"; // Ensure renderErrorMessage is imported

// Render multiple records for overview
export function renderDetailedRecords(records) {
  if (!records || !Array.isArray(records) || records.length === 0) {
    return "<div class='error'>No records found for this domain.</div>";
  }

  return records
    .map((record, index) => renderDetailedRecordCard(record, index))
    .join("");
}

// Render a single detailed record
export function renderDetailedRecord(recordType, data) {
  // Format the record
  const record = {
    title: recordType.toUpperCase(),
    value: data,
    // Ensure parsed_record is an empty object for reputation if not provided specifically
    parsed_record:
      recordType === "reputation" && !data.parsed_record
        ? {} // Default to empty for reputation if not explicitly passed
        : data.parsed_record || {},
    status: data.error ? "error" : "success",
  };

  // Wrap the record in a container
  return `
    <div class="record-container">
      ${renderDetailedRecordCard(record, 0)}
    </div>
  `;
}

// Render a detailed record card
export function renderDetailedRecordCard(record, index) {
  const recordId = `record-${index}`;

  // Determine the correct status for the record
  let statusClass, statusText, statusIcon;

  if (record.title === "DKIM") {
    const foundSelectors = [];
    if (!record.value.error) {
      for (const [selector, data] of Object.entries(record.value)) {
        if (
          selector !== "overall_status" &&
          selector !== "recommendations" &&
          selector !== "suggestions" &&
          data.status === "success" &&
          data.dkim_records &&
          data.dkim_records.length > 0
        ) {
          foundSelectors.push(selector);
        }
      }
    }
    statusClass = foundSelectors.length > 0 ? "status-success" : "status-error";
    statusText = foundSelectors.length > 0 ? "Success" : "Error";
    statusIcon =
      foundSelectors.length > 0 ? "check-circle" : "exclamation-circle";
  } else {
    statusClass = record.status === "error" ? "status-error" : "status-success";
    statusText = record.status === "error" ? "Error" : "Success";
    statusIcon =
      record.status === "error" ? "exclamation-circle" : "check-circle";
  }

  // Get summary text for collapsed view
  let actualRecordText = getRecordSummaryText(record);
  const recordPreview = actualRecordText
    ? `<div class="actual-record collapsed-record">${actualRecordText}</div>`
    : "";

  // Generate raw data content
  const rawDataContent = renderRawDataContent(record);

  // Generate parsed details rows (only if needed)
  let parsedDetailRows = "";
  // --- MODIFICATION: Check if title is REPUTATION before generating rows ---
  if (record.title !== "REPUTATION") {
    parsedDetailRows = generateParsedDetailRows(record);
  }
  // --- END MODIFICATION ---

  // Determine recommendations
  let recommendations = generateRecommendations(record);

  // --- MODIFICATION: Determine if the "Parsed Details" tab should be shown ---
  const showParsedTab = record.title !== "REPUTATION";
  // --- END MODIFICATION ---

  // Create the tabs HTML conditionally
  const tabsHtml = `
    <div class="tabs" id="${recordId}-tabs">
      <div class="tab active" data-tab="raw" onclick="switchTab('${recordId}', 'raw')">Data</div>
      ${
        // --- MODIFICATION: Conditionally show Parsed Details tab ---
        showParsedTab
          ? `<div class="tab" data-tab="parsed" onclick="switchTab('${recordId}', 'parsed')">Parsed Details</div>`
          : ""
        // --- END MODIFICATION ---
      }
      <div class="tab" data-tab="recommendations" onclick="switchTab('${recordId}', 'recommendations')">Recommendations</div>
    </div>`;

  // Create the "Parsed Details" tab content conditionally
  // --- MODIFICATION: Conditionally generate Parsed Details content ---
  const parsedTabContentHtml = showParsedTab
    ? `
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
    </div>`
    : "";
  // --- END MODIFICATION ---

  // Complete HTML for the record card
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
      ${tabsHtml}
      
      <div class="tab-content active" id="${recordId}-raw">
        ${rawDataContent}
      </div>
      
      ${parsedTabContentHtml} 
      
      <div class="tab-content" id="${recordId}-recommendations">
        ${recommendations || "<p>No recommendations available.</p>"}
      </div>
    </div>
  </div>
`;
}

// Helper function to get record summary text (Included for completeness)
function getRecordSummaryText(record) {
  let actualRecordText = "";

  if (
    record.title === "DMARC" &&
    record.value.dmarc_records &&
    record.value.dmarc_records.length > 0
  ) {
    actualRecordText = record.value.dmarc_records[0];
  } else if (record.title === "SPF" && record.value.spf_record) {
    actualRecordText = record.value.spf_record;
  } else if (record.title === "DKIM") {
    const foundSelectors = [];
    if (!record.value.error) {
      for (const [key, value] of Object.entries(record.value)) {
        if (
          key !== "overall_status" &&
          key !== "recommendations" &&
          key !== "suggestions" &&
          value.status === "success" &&
          value.dkim_records &&
          value.dkim_records.length > 0
        ) {
          foundSelectors.push(key);
        }
      }
    }
    actualRecordText =
      foundSelectors.length > 0
        ? `Found selectors: ${foundSelectors.join(", ")}`
        : "No valid DKIM selectors found";
  } else if (record.title === "DNS") {
    const recordTypes = [];
    if (record.value.parsed_record) {
      Object.keys(record.value.parsed_record).forEach((type) => {
        if (
          record.value.parsed_record[type] &&
          record.value.parsed_record[type].length > 0
        ) {
          recordTypes.push(type);
        }
      });
    }
    actualRecordText =
      recordTypes.length > 0
        ? `Found record types: ${recordTypes.join(", ")}`
        : "No DNS records found";
  } else if (record.title === "REPUTATION") {
    // Summary for reputation
    const blacklistCount = record.value.blacklist_count || 0;
    const score = record.value.reputation_score;
    if (record.value.error) {
      actualRecordText = "Error checking reputation";
    } else if (record.value.blacklisted) {
      actualRecordText = `Blacklisted on ${blacklistCount} services`;
    } else if (score !== undefined) {
      actualRecordText = `Score: ${score}/100 - Not Blacklisted`;
    } else {
      actualRecordText = "Reputation check status unknown";
    }
  }

  return actualRecordText;
}

// Helper function to generate parsed detail rows (Included for completeness)
function generateParsedDetailRows(record) {
  // --- MODIFICATION: Explicitly return nothing for REPUTATION ---
  if (record.title === "REPUTATION") {
    return "";
  }
  // --- END MODIFICATION ---

  let parsedRecordSource = record.parsed_record;
  let prefixRow = ""; // To hold selector info for DKIM

  // Special handling for DKIM to find the first valid parsed record
  if (record.title === "DKIM") {
    const foundSelector = Object.entries(record.value || {}).find(
      ([key, value]) =>
        key !== "overall_status" &&
        key !== "recommendations" &&
        key !== "suggestions" &&
        value?.status === "success" &&
        value?.parsed_records?.length > 0
    );

    if (foundSelector) {
      const [selectorName, selectorData] = foundSelector;
      parsedRecordSource = selectorData.parsed_records[0];
      prefixRow = `
        <tr class="selector-info-row">
          <td colspan="3" class="selector-info">
            <i class="fas fa-info-circle"></i> 
            Showing details for selector: <strong>${selectorName}</strong>
          </td>
        </tr>
      `;
    } else {
      parsedRecordSource = null; // Indicate no valid parsed record found
    }
  }

  if (!parsedRecordSource || Object.keys(parsedRecordSource).length === 0) {
    return (
      prefixRow + "<tr><td colspan='3'>No parsed details available.</td></tr>"
    );
  }

  const detailRows = Object.entries(parsedRecordSource)
    .map(
      ([key, value]) => `
    <tr>
      <td><strong>${key}</strong></td>
      <td>${formatParsedValue(value)}</td> 
      <td>${getExplanation(key, record.title.toLowerCase())}</td>
    </tr>
  `
    )
    .join("");

  return prefixRow + detailRows; // Prepend selector info if it exists
}

// Helper to format parsed values for the table (Included for completeness)
function formatParsedValue(value) {
  if (value === null || value === undefined) return "Not specified";
  if (typeof value === "object") {
    // Basic JSON formatting for objects/arrays in the table
    try {
      return `<pre>${JSON.stringify(value, null, 2)}</pre>`;
    } catch (e) {
      return "[Object]"; // Fallback for complex/circular objects
    }
  }
  // Escape HTML entities in string values
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper function to generate recommendations (Included for completeness)
function generateRecommendations(record) {
  let recommendationsHtml = "";

  // Use dedicated function for reputation recommendations
  if (record.title === "REPUTATION") {
    // Ensure renderReputationRecommendations is imported or defined
    return renderReputationRecommendations(record.value);
  }

  // Handle server-provided recommendations/suggestions first
  const serverRecs =
    record.value?.recommendations || record.value?.suggestions || [];
  if (serverRecs.length > 0) {
    const recItems = serverRecs
      .map((rec) => {
        if (typeof rec === "object" && rec.title && rec.description) {
          // Handle structured recommendations
          return `<div class="recommendation ${rec.priority || "low"}-priority">
                    <h4>${rec.title}</h4>
                    <p>${rec.description}</p>
                  </div>`;
        } else if (typeof rec === "string") {
          // Handle simple string suggestions
          return `<li>${rec}</li>`;
        }
        return ""; // Skip invalid formats
      })
      .join("");

    if (typeof serverRecs[0] === "string") {
      recommendationsHtml += `<div class="recommendation info-priority"><h4>Suggestions</h4><ul>${recItems}</ul></div>`;
    } else {
      recommendationsHtml += recItems; // Add structured recommendations directly
    }
  }

  // Add specific UI-generated recommendations if no server recs provided
  if (!recommendationsHtml && record.status === "success") {
    // Only add UI recs if record is success and no server recs
    if (record.title === "DMARC") {
      const p = record.parsed_record?.p || "";
      if (p === "none") {
        recommendationsHtml += `<div class="recommendation medium-priority"><h4>Strengthen DMARC Policy</h4><p>Your DMARC policy is 'none'. Consider upgrading to 'quarantine' or 'reject' after monitoring.</p></div>`;
      }
    } else if (record.title === "SPF") {
      if (record.value?.spf_record?.includes("~all")) {
        recommendationsHtml += `<div class="recommendation medium-priority"><h4>Consider Hard Fail SPF</h4><p>Your SPF record uses '~all' (soft fail). Consider '-all' (hard fail) for stronger protection once verified.</p></div>`;
      } else if (record.value?.spf_record?.includes("+all")) {
        recommendationsHtml += `<div class="recommendation high-priority"><h4>Security Risk: SPF +all</h4><p>Your SPF record uses '+all', allowing anyone to send email as your domain. Change to '-all' immediately.</p></div>`;
      }
    }
  } else if (
    !recommendationsHtml &&
    record.title === "DKIM" &&
    record.status === "error"
  ) {
    recommendationsHtml += `<div class="recommendation high-priority"><h4>Configure DKIM</h4><p>No valid DKIM records found. Set up DKIM with your email provider to improve authentication.</p></div>`;
  }

  return recommendationsHtml || "<p>No recommendations available.</p>";
}

// Placeholder for getExplanation function (ensure this is available and updated)
function getExplanation(key, recordType) {
  const explanations = {
    dmarc: {
      v: "Version (should be DMARC1)",
      p: "Policy for domain (none, quarantine, reject)",
      sp: "Policy for subdomains",
      pct: "Percentage of messages to filter",
      rua: "Reporting URI for aggregate reports",
      ruf: "Reporting URI for forensic reports",
      adkim: "DKIM alignment (r=relaxed, s=strict)",
      aspf: "SPF alignment (r=relaxed, s=strict)",
      fo: "Failure reporting options",
      rf: "Forensic report format",
      ri: "Reporting interval (seconds)",
    },
    spf: {
      include: "Include SPF rules from another domain",
      a: "Allow servers from A/AAAA records",
      mx: "Allow servers from MX records",
      ip4: "Allow specific IPv4 address/range",
      ip6: "Allow specific IPv6 address/range",
      exists: "Check if a domain exists",
      ptr: "Check PTR records (not recommended)",
      redirect: "Redirect SPF check to another domain",
      "-all": "Fail if no match (Reject)",
      "~all": "SoftFail if no match (Mark as suspicious)",
      "?all": "Neutral if no match (Accept)",
      "+all": "Pass if no match (Allow all - Risky)",
      warning: "Warning about SPF record configuration",
    },
    dkim: {
      v: "Version (should be DKIM1)",
      a: "Signing algorithm (e.g., rsa-sha256)",
      c: "Canonicalization algorithm (simple/relaxed)",
      d: "Signing domain",
      s: "Selector for the key",
      t: "Timestamps or flags (e.g., y=test mode)",
      bh: "Body hash",
      h: "Signed header fields",
      i: "Identity (user@domain)",
      l: "Body length limit",
      q: "Query method (default dns/txt)",
      k: "Key type (e.g., rsa)",
      p: "Public key data (Base64 encoded)",
      n: "Notes for humans",
      z: "Copied header fields for debugging",
    },
    dns: {
      A: "IPv4 Address record",
      AAAA: "IPv6 Address record",
      MX: "Mail Exchanger record (specifies mail servers)",
      TXT: "Text record (used for SPF, DKIM, DMARC, etc.)",
      CNAME: "Canonical Name (alias for another domain)",
      NS: "Name Server record (authoritative servers for the domain)",
      SOA: "Start of Authority (administrative info about the zone)",
      PTR: "Pointer record (reverse DNS lookup)",
      SRV: "Service record (location of services)",
      CAA: "Certification Authority Authorization",
      email_providers: "Detected email providers based on MX records",
    },
    reputation: {
      // Added explanations for reputation fields
      reputation_score: "Overall reputation score (0-100). Higher is better.",
      blacklisted:
        "Indicates if the domain or its IPs are found on major email blacklists.",
      blacklist_count: "Number of blacklists where the domain/IP was found.",
      total_services: "Total number of blacklist services checked.",
      blacklist_details:
        "List of specific blacklists where the domain/IP is listed.",
      domain_services: "Results from domain-based blacklist checks.",
      ip_services: "Results from IP-based blacklist checks for associated IPs.",
      timeout: "Indicates if the reputation check timed out.",
      timeout_message: "Message explaining the timeout.",
      overall_status: "Overall status indication (e.g., success, error).",
    },
  };
  return explanations[recordType]?.[key] || "No explanation available";
}

// Enhanced function to render the raw data content for different record types (ensure this is available)
function renderRawDataContent(record) {
  // Special handling for DKIM records
  if (record.title === "DKIM") {
    // Assumes renderDkimRecord is defined elsewhere and handles DKIM data appropriately
    // Ensure renderDkimRecord is imported or defined
    const domain =
      document.getElementById("domain")?.value.trim() || "your-domain.com";
    return renderDkimRecord(record.value, domain);
  }
  // Special handling for reputation data
  else if (record.title === "REPUTATION") {
    // Assumes renderReputationData is defined elsewhere and handles reputation data
    // Ensure renderReputationData is imported or defined
    return renderReputationData(record.value);
  }
  // For error records, show the existing error message
  else if (record.status === "error") {
    // Ensure renderErrorMessage is imported or defined
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
    // Ensure renderDmarcRawData is imported or defined
    return renderDmarcRawData(recordText, recordData);
  } else if (record.title === "SPF" && record.value.spf_record) {
    recordText = record.value.spf_record;
    recordData = record.value.parsed_record || {};
    // Ensure renderSpfRawData is imported or defined
    return renderSpfRawData(recordText, recordData);
  } else if (record.title === "DNS") {
    // For DNS, customize based on available data
    // Ensure renderDnsRawData is imported or defined
    return renderDnsRawData(record.value);
  }

  // If we don't have record text or a specific renderer, show a simple message
  if (!recordText && !recordData) {
    return `<div class="record-data"><p>No raw data available.</p></div>`;
  }

  // Fallback for types without specific renderers but with data
  recordText = recordText || JSON.stringify(record.value, null, 2);
  const escapedText = recordText.replace(/'/g, "\\'").replace(/"/g, '\\"');

  return `
    <div class="record-data">
      <div class="actual-record expanded-record">
        <pre>${recordText}</pre>
      </div>
      <div class="action-buttons">
        <button onclick="copyToClipboard('${escapedText}')" class="secondary">
          <i class="fas fa-copy"></i> Copy
        </button>
      </div>
    </div>
  `;
}

// Global functions for interaction (ensure they are accessible)
window.toggleRecordCard = function (id) {
  const body = document.getElementById(id);
  if (!body) return;
  body.classList.toggle("expanded");
  const header = body.previousElementSibling;
  if (!header) return;
  const icon = header.querySelector(".expand-icon");
  if (!icon) return;
  icon.classList.toggle("fa-chevron-down");
  icon.classList.toggle("fa-chevron-up");
};

window.switchTab = function (recordId, tabName) {
  const tabContainer = document.getElementById(`${recordId}-tabs`);
  if (!tabContainer) return;

  // Hide all content panes for this record
  const contents = document.querySelectorAll(
    `#${recordId}-body > .tab-content`
  );
  contents.forEach((content) => content.classList.remove("active"));

  // Deactivate all tabs for this record
  const tabs = tabContainer.querySelectorAll(".tab");
  tabs.forEach((tab) => tab.classList.remove("active"));

  // Activate the selected tab and content
  const activeContent = document.getElementById(`${recordId}-${tabName}`);
  if (activeContent) activeContent.classList.add("active");

  const activeTabButton = tabContainer.querySelector(
    `.tab[data-tab="${tabName}"]`
  );
  if (activeTabButton) activeTabButton.classList.add("active");
};

window.copyToClipboard = function (text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      // Consider using a toast notification module if available
      alert("Copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
      alert("Failed to copy text.");
    });
};
