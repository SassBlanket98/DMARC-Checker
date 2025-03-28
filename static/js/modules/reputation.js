// reputation.js - Domain reputation check visualization and handling

export function renderReputationData(data) {
  // If there's an error with the reputation check
  if (data.error) {
    return `
      <div class="reputation-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error checking domain reputation: ${data.error}</p>
      </div>
    `;
  }

  // Get reputation score
  const reputationScore = data.reputation_score || 0;

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

  // Generate blacklist details HTML
  let blacklistDetailsHtml = "";
  if (
    blacklisted &&
    data.blacklist_details &&
    data.blacklist_details.length > 0
  ) {
    const detailsItems = data.blacklist_details
      .map((item) => `<li class="blacklist-item">${item}</li>`)
      .join("");

    blacklistDetailsHtml = `
      <div class="blacklist-details">
        <h4>Blacklisted On:</h4>
        <ul class="blacklist-list">
          ${detailsItems}
        </ul>
      </div>
    `;
  }

  // Generate IP information HTML
  let ipDetailsHtml = "";
  if (data.ip_services) {
    const ipItems = Object.entries(data.ip_services)
      .map(([ip, services]) => {
        const hasBlacklisting = Object.values(services).some(
          (status) => status !== "clean"
        );
        const statusClass = hasBlacklisting ? "status-error" : "status-success";
        const statusIcon = hasBlacklisting
          ? '<i class="fas fa-times-circle"></i>'
          : '<i class="fas fa-check-circle"></i>';

        return `
        <div class="ip-detail ${statusClass}">
          <div class="ip-header">
            ${statusIcon} IP: ${ip}
          </div>
          <div class="ip-services">
            ${
              Object.entries(services)
                .filter(([_, status]) => status !== "clean")
                .map(
                  ([service, status]) =>
                    `<div class="ip-service-item">${service}: ${status}</div>`
                )
                .join("") ||
              '<div class="ip-service-clean">No blacklistings found</div>'
            }
          </div>
        </div>
      `;
      })
      .join("");

    if (ipItems) {
      ipDetailsHtml = `
        <div class="ip-details-section">
          <h4>IP Reputation:</h4>
          ${ipItems}
        </div>
      `;
    }
  }

  // Generate recommendations HTML
  let recommendationsHtml = "";
  if (data.recommendations && data.recommendations.length > 0) {
    const recItems = data.recommendations
      .map(
        (rec) =>
          `<div class="recommendation ${rec.priority}-priority">
        <h4>${rec.title}</h4>
        <p>${rec.description}</p>
      </div>`
      )
      .join("");

    recommendationsHtml = `
      <div class="reputation-recommendations">
        <h4>Recommendations:</h4>
        ${recItems}
      </div>
    `;
  }

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
                  ? `<i class="fas fa-times-circle"></i> Blacklisted on ${blacklistCount} services`
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
      ${ipDetailsHtml}
      
      <div class="reputation-explanation">
        <p>Domain reputation affects email deliverability. Being on email blacklists can cause your messages to be blocked or sent to spam folders.</p>
      </div>
      
      ${recommendationsHtml}
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
