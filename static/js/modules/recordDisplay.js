// recordDisplay.js - Combined module for displaying and formatting DNS records
// Includes all functionality from the original recordParsers.js

import {
  renderReputationData,
  renderReputationRecommendations,
} from "./reputation.js";

// ---------- BEGIN MERGED FUNCTIONS FROM recordParsers.js ----------

// Enhanced DMARC raw data display
export function renderDmarcRawData(recordText, parsedData) {
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

// Enhanced SPF raw data display
export function renderSpfRawData(recordText, parsedData) {
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
export function renderDnsRawData(recordData) {
  if (recordData.error) {
    // We would import and use renderErrorMessage here
    // But for simplicity, we'll just return a basic error message
    return `<div class="error">Error: ${recordData.error}</div>`;
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

// Enhanced DKIM record display
export function renderDkimRecord(data, domain) {
  // Handle case where there's a general error (not selector-specific)
  if (data.error) {
    // We would import and use renderErrorMessage here
    // But for simplicity, we'll just return a basic error message
    return `<div class="error">Error: ${data.error}</div>`;
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

  // Generate the enhanced visual summary section
  const visualSummary = `
    <div class="dkim-visual-summary">
      <div class="policy-indicator">
        ${
          foundSelectors.length > 0
            ? '<i class="fas fa-shield-alt"></i>'
            : '<i class="fas fa-exclamation-triangle"></i>'
        }
        <div>${
          foundSelectors.length > 0
            ? '<span class="policy-strong">DKIM Configured</span>'
            : '<span class="policy-none">DKIM Not Found</span>'
        }
        </div>
      </div>
      <div class="dkim-settings">
        <div class="dkim-setting">
          <i class="fas ${
            foundSelectors.length > 0
              ? "fa-check-circle setting-enabled"
              : "fa-times-circle setting-disabled"
          }"></i>
          <span>Found selectors: ${
            foundSelectors.length > 0 ? foundSelectors.join(", ") : "None"
          }</span>
        </div>
        <div class="dkim-setting">
          <i class="fas ${
            foundSelectors.length > 1
              ? "fa-check-circle setting-enabled"
              : "fa-info-circle"
          }"></i>
          <span>Multiple selectors: ${
            foundSelectors.length > 1
              ? "Yes (" + foundSelectors.length + ")"
              : "No"
          }</span>
        </div>
        <div class="dkim-setting">
          <i class="fas ${
            notFoundSelectors.length > 0
              ? "fa-exclamation-triangle setting-warning"
              : "fa-info-circle"
          }"></i>
          <span>Failed selectors: ${
            notFoundSelectors.length > 0 ? notFoundSelectors.join(", ") : "None"
          }</span>
        </div>
        <div class="dkim-setting">
          <i class="fas fa-info-circle"></i>
          <span>Domain: ${domain}</span>
        </div>
      </div>
    </div>
  `;

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
      
      ${visualSummary}
      
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

// ---------- END MERGED FUNCTIONS FROM recordParsers.js ----------

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
  const isSimplifiedView = record.title === "DMARC" || record.title === "SPF";

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
    case "ip_services":
      if (typeof value === "object") {
        try {
          return `<pre>${JSON.stringify(value, null, 2)}</pre>`;
        } catch (e) {
          return "Complex object";
        }
      }
      return String(value);

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

      // Handle objects
      if (typeof value === "object") {
        if (Array.isArray(value)) {
          // For arrays of strings, join them with line breaks
          if (value.length > 0 && typeof value[0] === "string") {
            return value.join("<br>");
          }
          return `Array with ${value.length} items`;
        }

        // For objects, show a JSON representation
        try {
          return `<pre>${JSON.stringify(value, null, 2)}</pre>`;
        } catch (e) {
          return "Complex object";
        }
      }

      // Return the value as a string for all other cases
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
      reputation_score: "Overall reputation score of the domain (0-100)",
      blacklisted: "Whether the domain is on any checked blacklists",
      blacklist_count: "Number of blacklists the domain is listed on",
      blacklist_details: "List of blacklists the domain is found on",
      total_services: "Total number of blacklist services checked",
      domain_services: "Status of domain-based blacklist checks",
      ip_services: "Status of IP-based blacklist checks",
      recommendations: "Suggestions for improving domain reputation",
      overall_status: "Overall status of domain reputation check",
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

// Function imported from api.js to render error messages
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

  // Standard error display
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
        </div>
      </div>
    </div>
  `;
}
