// recordParsers.js - Functions for parsing and visualizing different record types

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
