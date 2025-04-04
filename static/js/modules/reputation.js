// reputation.js - Domain reputation check visualization and handling

export function renderReputationData(data) {
  // If there's an error with the reputation check
  if (data.error) {
    return `
      <div class="reputation-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error checking domain reputation: ${data.error}</p>
        ${
          data.error_code
            ? `<div class="error-code">Code: ${data.error_code}</div>`
            : ""
        }
      </div>
    `;
  }

  // Detailed data rendering with comprehensive information
  return `
    <div class="reputation-raw-data">
      <div class="data-section">
        <h4>Reputation Score Breakdown</h4>
        <table class="reputation-details-table">
          <tr>
            <th>Reputation Score</th>
            <td>${
              data.reputation_score !== undefined
                ? data.reputation_score
                : "N/A"
            }/100</td>
          </tr>
          <tr>
            <th>Blacklist Status</th>
            <td class="${data.blacklisted ? "text-danger" : "text-success"}">
              ${data.blacklisted ? "Blacklisted" : "Not Blacklisted"}
            </td>
          </tr>
          <tr>
            <th>Total Blacklist Services Checked</th>
            <td>${data.total_services || "N/A"}</td>
          </tr>
          <tr>
            <th>Blacklist Count</th>
            <td>${data.blacklist_count || 0}</td>
          </tr>
        </table>
      </div>

      <div class="data-section">
        <h4>Domain Service Checks</h4>
        <table class="reputation-details-table">
          <tr>
            <th>Total Domain Services Checked</th>
            <td>${
              data.domain_services
                ? Object.keys(data.domain_services).length
                : "N/A"
            }</td>
          </tr>
          ${renderDomainServiceDetails(data.domain_services)}
        </table>
      </div>

      <div class="data-section">
        <h4>IP Service Checks</h4>
        <table class="reputation-details-table">
          <tr>
            <th>Total IPs Checked</th>
            <td>${
              data.ip_services ? Object.keys(data.ip_services).length : "N/A"
            }</td>
          </tr>
          ${renderIPServiceDetails(data.ip_services)}
        </table>
      </div>

      ${renderBlacklistDetails(data.blacklist_details, data.service_names)}
    </div>
  `;
}

function renderDomainServiceDetails(domainServices) {
  if (!domainServices || Object.keys(domainServices).length === 0) {
    return `<tr><td colspan="2">No domain service details available</td></tr>`;
  }

  let detailsHtml = "";
  const statuses = {
    blacklisted: "text-danger",
    clean: "text-success",
    error: "text-warning",
    timeout: "text-warning",
  };

  Object.entries(domainServices).forEach(([service, status]) => {
    detailsHtml += `
      <tr>
        <th>${service}</th>
        <td class="${statuses[status] || ""}">${status}</td>
      </tr>
    `;
  });

  return detailsHtml;
}

function renderIPServiceDetails(ipServices) {
  if (!ipServices || Object.keys(ipServices).length === 0) {
    return `<tr><td colspan="2">No IP service details available</td></tr>`;
  }

  let detailsHtml = "";
  const statuses = {
    blacklisted: "text-danger",
    clean: "text-success",
    error: "text-warning",
    timeout: "text-warning",
  };

  Object.entries(ipServices).forEach(([ip, services]) => {
    let ipDetailsHtml = Object.entries(services)
      .map(
        ([service, status]) => `
      <tr>
        <th>${ip} - ${service}</th>
        <td class="${statuses[status] || ""}">${status}</td>
      </tr>
    `
      )
      .join("");

    detailsHtml += ipDetailsHtml;
  });

  return detailsHtml;
}

function renderBlacklistDetails(blacklistDetails, serviceNames) {
  if (!blacklistDetails || blacklistDetails.length === 0) {
    return "";
  }

  const detailsItems = blacklistDetails
    .map((item) => {
      // Use the friendly name if available
      const serviceName = serviceNames[item] || item;
      return `<li class="blacklist-item">${serviceName}</li>`;
    })
    .join("");

  return `
    <div class="data-section">
      <h4>Detailed Blacklist Information</h4>
      <ul class="blacklist-list">
        ${detailsItems}
      </ul>
    </div>
  `;
}

// Function to process reputation data for scoring
export function processReputationForScoring(data) {
  return {
    reputationScore: data.reputation_score || 0,
    blacklisted: data.blacklisted || false,
    blacklistCount: data.blacklist_count || 0,
    totalServices: data.total_services || 0,
  };
}

export function renderReputationRecommendations(data) {
  // If there's an error with the reputation check, show a basic message
  if (data.error) {
    return `<p>Unable to provide recommendations due to an error checking domain reputation.</p>`;
  }

  // Check if we already have recommendations from the server
  if (data.recommendations && data.recommendations.length > 0) {
    // Use the server-provided recommendations instead of generating our own
    const recItems = data.recommendations
      .map(
        (rec) =>
          `<div class="recommendation ${rec.priority}-priority">
            <h4>${rec.title}</h4>
            <p>${rec.description}</p>
          </div>`
      )
      .join("");

    return `
      <div class="reputation-recommendations">
        ${recItems}
      </div>
    `;
  }

  // If no server recommendations but domain is blacklisted, show a generic removal steps recommendation
  else if (data.blacklisted) {
    return `
      <div class="recommendation high-priority">
        <h4>Blacklist Removal Steps</h4>
        <ol>
          <li>Identify and fix the issue that caused blacklisting (spam, security breach, etc.)</li>
          <li>Implement proper email authentication (SPF, DKIM, DMARC)</li>
          <li>Submit removal requests to each blacklist operator</li>
          <li>Monitor your domain reputation regularly</li>
        </ol>
      </div>
    `;
  }

  // If no recommendations and not blacklisted
  else {
    return `<p>No specific recommendations available for this domain.</p>`;
  }
}
