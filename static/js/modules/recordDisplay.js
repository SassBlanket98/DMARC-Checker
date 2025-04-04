// recordDisplay.js - Functions for displaying and formatting DNS records

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
renderRawDataContent;

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
    parsed_record: data.parsed_record || {},
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
  let actualRecordText = getRecordSummaryText(record);

  // Create the record preview to show in collapsed state
  const recordPreview = actualRecordText
    ? `<div class="actual-record collapsed-record">${actualRecordText}</div>`
    : "";

  // Generate raw data content using the enhanced function
  const rawDataContent = renderRawDataContent(record);

  // Generate parsed details rows
  let parsedDetailRows = generateParsedDetailRows(record);

  // Determine recommendations
  let recommendations = generateRecommendations(record);

  // Check if this is a DMARC or SPF record (which will only have 2 tabs)
  const isSimplifiedView =
    record.title === "DMARC" ||
    record.title === "SPF" ||
    record.title === "REPUTATION";

  // Create the tabs HTML based on record type
  const tabsHtml = isSimplifiedView
    ? `<div class="tabs" id="${recordId}-tabs">
      <div class="tab active" data-tab="raw" onclick="switchTab('${recordId}', 'raw')">Data</div>
      <div class="tab" data-tab="recommendations" onclick="switchTab('${recordId}', 'recommendations')">Recommendations</div>
    </div>`
    : `<div class="tabs" id="${recordId}-tabs">
      <div class="tab active" data-tab="raw" onclick="switchTab('${recordId}', 'raw')">Data</div>
      <div class="tab" data-tab="parsed" onclick="switchTab('${recordId}', 'parsed')">Parsed Details</div>
      <div class="tab" data-tab="recommendations" onclick="switchTab('${recordId}', 'recommendations')">Recommendations</div>
    </div>`;

  // Create the content HTML
  // For DMARC and SPF, don't include the parsed details tab content
  const parsedTabHtml = isSimplifiedView
    ? ""
    : `<div class="tab-content" id="${recordId}-parsed">
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
    </div>`;

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
      ${tabsHtml}
      
      <div class="tab-content active" id="${recordId}-raw">
        ${rawDataContent}
      </div>
      
      ${parsedTabHtml}
      
      <div class="tab-content" id="${recordId}-recommendations">
        ${recommendations || "<p>No recommendations available.</p>"}
      </div>
    </div>
  </div>
`;
}

// Helper function to get record summary text
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
    // Add code for DKIM summary text
    const foundSelectors = [];

    // Loop through all properties to find successful selectors
    for (const [key, value] of Object.entries(record.value)) {
      // Skip non-selector keys
      if (
        key === "overall_status" ||
        key === "recommendations" ||
        key === "suggestions"
      ) {
        continue;
      }

      // Add selector name if it has valid records
      if (
        value.status === "success" &&
        value.dkim_records &&
        value.dkim_records.length > 0
      ) {
        foundSelectors.push(key);
      }
    }

    // Create summary text showing found selectors
    if (foundSelectors.length > 0) {
      actualRecordText = `Found selectors: ${foundSelectors.join(", ")}`;
    } else {
      actualRecordText = "No valid DKIM selectors found";
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

  return actualRecordText;
}

// Helper function to generate parsed detail rows
function generateParsedDetailRows(record) {
  let parsedDetailRows = "";

  if (record.parsed_record && Object.keys(record.parsed_record).length > 0) {
    // Standard handling for record types
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
  } else if (record.title === "DKIM") {
    // Special handling for DKIM records
    // Find the first successful selector with parsed records
    const foundSelector = Object.entries(record.value).find(
      ([key, value]) =>
        key !== "overall_status" &&
        key !== "recommendations" &&
        key !== "suggestions" &&
        value.status === "success" &&
        value.parsed_records &&
        value.parsed_records.length > 0
    );

    if (foundSelector) {
      const [selectorName, selectorData] = foundSelector;
      // Use the first parsed record from this selector
      const parsedRecord = selectorData.parsed_records[0];

      if (parsedRecord) {
        parsedDetailRows = Object.entries(parsedRecord)
          .map(
            ([key, value]) => `
          <tr>
            <td><strong>${key}</strong></td>
            <td>${value || "Not specified"}</td>
            <td>${getExplanation(key, "dkim")}</td>
          </tr>
        `
          )
          .join("");

        // Add a row to show which selector this data is from
        parsedDetailRows =
          `
        <tr class="selector-info-row">
          <td colspan="3" class="selector-info">
            <i class="fas fa-info-circle"></i> 
            Showing details for selector: <strong>${selectorName}</strong>
          </td>
        </tr>
      ` + parsedDetailRows;
      }
    } else {
      parsedDetailRows = `
        <tr>
          <td colspan="3">No parsed DKIM record details available.</td>
        </tr>
      `;
    }
  } else if (record.title === "REPUTATION") {
    // Special handling for reputation records viewed individually
    // When viewing reputation individually, grab data from record.value
    const reputationData = record.value || {};

    if (Object.keys(reputationData).length > 0) {
      // Generate rows from the reputation data
      parsedDetailRows = Object.entries(reputationData)
        .filter(
          ([key]) =>
            !key.startsWith("error") &&
            key !== "suggestions" &&
            typeof key !== "object"
        )
        .map(
          ([key, value]) => `
        <tr>
          <td><strong>${key}</strong></td>
          <td>${formatReputationValue(key, value)}</td>
          <td>${getExplanation(key, "reputation")}</td>
        </tr>
      `
        )
        .join("");
    }
  }

  return parsedDetailRows;
}

function formatReputationValue(key, value) {
  // Format the values nicely
  if (value === null || value === undefined) {
    return "Not available";
  }

  // Handle different keys with specific formatting
  switch (key) {
    case "reputation_score":
      // Add color-coding based on score
      let scoreClass = "";
      if (value >= 90) scoreClass = "reputation-score-excellent";
      else if (value >= 70) scoreClass = "reputation-score-good";
      else if (value >= 50) scoreClass = "reputation-score-fair";
      else scoreClass = "reputation-score-poor";

      return `<span class="reputation-score-value ${scoreClass}">${value}/100</span>`;

    case "blacklisted":
      return value
        ? '<span style="color: var(--error-color);"><i class="fas fa-times-circle"></i> Yes</span>'
        : '<span style="color: var(--success-color);"><i class="fas fa-check-circle"></i> No</span>';

    case "blacklist_details":
      if (Array.isArray(value) && value.length > 0) {
        return value
          .map(
            (item) =>
              `<div class="blacklist-entry"><i class="fas fa-exclamation-triangle"></i> ${item}</div>`
          )
          .join("");
      }
      return "None";

    case "domain_services":
      if (typeof value === "object" && Object.keys(value).length > 0) {
        const total = Object.keys(value).length;
        const failed = Object.values(value).filter(
          (status) =>
            status === "blacklisted" ||
            status === "error" ||
            status === "timeout"
        ).length;
        return `Checked ${total} domain services. ${
          failed > 0 ? `${failed} issue(s) found.` : "All clean."
        }`;
      }
      return "No domain services checked or data unavailable.";

    case "ip_services":
      if (typeof value === "object" && Object.keys(value).length > 0) {
        const ipCount = Object.keys(value).length;
        let totalIssues = 0;
        Object.values(value).forEach((services) => {
          totalIssues += Object.values(services).filter(
            (status) => status !== "clean"
          ).length;
        });
        return `Checked ${ipCount} IP(s). ${
          totalIssues > 0
            ? `${totalIssues} issue(s) found across IPs.`
            : "All IPs clean."
        }`;
      }
      return "No IP services checked or data unavailable.";

    case "recommendations":
      if (Array.isArray(value) && value.length > 0) {
        return value
          .map((rec) => {
            if (typeof rec === "object") {
              return `<div class="recommendation-preview">
              <strong>${rec.title || "Recommendation"}:</strong> ${
                rec.description || JSON.stringify(rec)
              }
            </div>`;
            }
            return String(rec);
          })
          .join("<br>");
      }
      return "No recommendations";

    default:
      // Handle boolean values
      if (typeof value === "boolean") {
        return value ? "Yes" : "No";
      }
      if (value === null || value === undefined) {
        return "Not available";
      }
      // For complex objects/arrays not handled specifically, show a placeholder
      if (typeof value === "object") {
        return "[Complex data - view recommendations or raw data]";
      }
      return String(value);
  }
}

// Helper function to generate recommendations
function generateRecommendations(record) {
  let recommendations = "";

  // Special handling for reputation records - use our new function
  if (record.title === "REPUTATION") {
    return renderReputationRecommendations(record.value);
  }

  // Handle other record types as before
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
  } else if (record.title === "DKIM" && record.status === "error") {
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

  return recommendations;
}

// Enhanced function to render the raw data content for different record types
export function renderRawDataContent(record) {
  // Special handling for DKIM records
  if (record.title === "DKIM") {
    return renderDkimRecord(
      record.value,
      document.getElementById("domain").value.trim()
    );
  }

  // Special handling for reputation data
  else if (record.title === "REPUTATION") {
    return renderReputationData(record.value);
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

// Function to get explanation for record attributes
export function getExplanation(key, recordType) {
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
    reputation: {
      domain: "The domain checked for reputation",
      reputation_score:
        "Overall reputation score based on checks (0-100, higher is better)",
      blacklisted:
        "Indicates if the domain or its IPs were found on any checked blacklists",
      blacklist_count: "Number of blacklists the domain/IPs are listed on",
      blacklist_details:
        "List of specific blacklists where the domain/IPs were found",
      total_services: "Total number of blacklist services queried",
      domain_services:
        "Results from checking the domain name against domain-based blacklists (RHSBLs)",
      ip_services:
        "Results from checking the domain's IP addresses against IP-based blacklists (DNSBLs)",
      recommendations:
        "Suggestions for improving or maintaining domain reputation",
      ip_lookup_error:
        "Indicates if there was an error resolving the domain to IP addresses",
      timeout: "Indicates if the blacklist checks took too long to complete",
      service_names: "Mapping of internal service names to user-friendly names",
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

  // Check if this is a DMARC or SPF record (which only has 2 tabs)
  const recordHeader = document.querySelector(
    `#${recordId}-body`
  ).previousElementSibling;
  const recordTitle = recordHeader.querySelector("h3").textContent.trim();
  const isSimplifiedView =
    recordTitle.includes("DMARC") || recordTitle.includes("SPF");

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
      import("./toast.js").then((module) => {
        module.showToast("Copied to clipboard!", "success");
      });
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
      import("./toast.js").then((module) => {
        module.showToast("Failed to copy text. Please try again.", "error");
      });
    });
};
