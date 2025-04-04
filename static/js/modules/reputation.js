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

  // Get reputation score and service names map
  const reputationScore =
    data.reputation_score !== undefined ? data.reputation_score : 0;
  const serviceNames = data.service_names || {}; // Get the friendly names map

  // Determine status color based on score
  let statusClass, statusText;
  if (reputationScore >= 90) {
    statusClass = "status-success";
    statusText = "Excellent";
  } else if (reputationScore >= 70) {
    statusClass = "status-info";
    statusText = "Good";
  } else if (reputationScore >= 50) {
    statusClass = "status-warning";
    statusText = "Fair";
  } else {
    statusClass = "status-error";
    statusText = "Poor";
  }

  // Check if domain is blacklisted
  const blacklisted = data.blacklisted || false;
  const blacklistCount = data.blacklist_count || 0;
  const totalServices = data.total_services || 0;

  // Generate blacklist details HTML using friendly names
  let blacklistDetailsHtml = "";
  if (
    blacklisted &&
    data.blacklist_details &&
    data.blacklist_details.length > 0
  ) {
    const detailsItems = data.blacklist_details
      .map((item) => {
        // Use the friendly name if available
        const serviceName = serviceNames[item] || item;
        return `<li class="blacklist-item">${serviceName}</li>`;
      })
      .join("");

    blacklistDetailsHtml = `
      <div class="blacklist-details">
        <h4>Blacklisted On (${blacklistCount}):</h4>
        <ul class="blacklist-list">
          ${detailsItems}
        </ul>
      </div>
    `;
  }

  // --- Improved Domain/IP Service Details ---
  let serviceChecksHtml = "<p>No detailed service checks available.</p>"; // Default message

  // Domain Service Check Summary
  let domainServiceSummary = "";
  const domainServicesCount = data.domain_services
    ? Object.keys(data.domain_services).length
    : 0; // Get actual count
  if (domainServicesCount > 0) {
    const domainBlacklistedCount = Object.values(data.domain_services).filter(
      (status) => status === "blacklisted"
    ).length;
    // **Modified Line:** Be specific about domain services
    domainServiceSummary = `
      <div class="service-check-summary">
        <i class="fas fa-globe"></i> <strong>Domain-Specific Checks:</strong> ${domainBlacklistedCount} blacklisting(s) found across ${domainServicesCount} domain services checked.
      </div>
    `;
  }

  // IP Service Check Summary
  let ipServiceSummary = "";
  if (data.ip_services && Object.keys(data.ip_services).length > 0) {
    const ipCount = Object.keys(data.ip_services).length;
    let totalIpBlacklistings = 0;
    Object.values(data.ip_services).forEach((services) => {
      totalIpBlacklistings += Object.values(services).filter((status) =>
        status.startsWith("blacklisted")
      ).length;
    });

    ipServiceSummary = `
      <div class="service-check-summary">
        <i class="fas fa-network-wired"></i> <strong>IP Checks (${ipCount} IPs):</strong> ${totalIpBlacklistings} blacklisting(s) found.
      </div>
    `;
    // (Optional: Add detailed breakdown per IP if needed)
  }

  if (domainServiceSummary || ipServiceSummary) {
    serviceChecksHtml = `
       <div class="service-checks-section">
         <h4>Blacklist Service Checks:</h4>
         ${
           domainServiceSummary ||
           "<p>No domain-specific checks performed or data available.</p>"
         }
         ${
           ipServiceSummary ||
           "<p>No IP address checks performed or data available.</p>"
         }
         <p class="total-services-note">Note: A total of ${
           data.total_services || "N/A"
         } blacklist services (domain and IP combined) were queried.</p> 
       </div>
     `;
  }
  // --- End of Improved Service Details ---

  // Create the complete reputation data display
  return `
    <div class="reputation-container">
      <div class="reputation-summary">
        <div class="reputation-score-container ${statusClass}">
          <div class="reputation-score">${reputationScore}</div>
          <div class="reputation-status">${statusText}</div>
        </div>
        
        <div class="reputation-overview">
          <div class="reputation-stat">
            <div class="reputation-stat-label">Blacklist Status:</div>
            <div class="reputation-stat-value ${
              blacklisted ? "status-error" : "status-success"
            }">
              ${
                blacklisted
                  ? `<i class="fas fa-times-circle"></i> Blacklisted (${blacklistCount})`
                  : `<i class="fas fa-check-circle"></i> Not blacklisted`
              }
            </div>
          </div>
          
          <div class="reputation-stat">
            <div class="reputation-stat-label">Services Checked:</div>
            <div class="reputation-stat-value">${totalServices}</div>
          </div>
        </div>
      </div>
      
      ${blacklistDetailsHtml} 
      ${serviceChecksHtml} 
      
      <div class="reputation-explanation">
        <p>Domain reputation affects email deliverability. Being on email blacklists can cause your messages to be blocked or sent to spam folders.</p>
      </div>
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
