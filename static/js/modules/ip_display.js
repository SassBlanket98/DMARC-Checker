// ip_display.js - Functions for rendering IP information

// Render IP data
export function renderIpData(data) {
  // Check if there's an error
  if (data.error) {
    return renderErrorMessage(data);
  }

  // Extract IP details
  const {
    ip,
    version,
    city,
    region,
    country,
    location,
    isp,
    timezone,
    asn,
    reputation = {},
    recommendations = [],
  } = data;

  // Determine reputation score class
  let scoreClass = "score-medium";
  let scoreText = "Average";

  if (reputation.reputation_score >= 80) {
    scoreClass = "score-good";
    scoreText = "Good";
  } else if (reputation.reputation_score < 50) {
    scoreClass = "score-poor";
    scoreText = "Poor";
  }

  // Build the recommendations HTML
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
      : `<p>No specific recommendations available for this IP address.</p>`;

  // Generate the full HTML
  return `
    <div class="ip-info-container">
      <div class="ip-card">
        <div class="ip-header">
          <div class="ip-address-display">${ip || "Unknown IP"}</div>
          <div class="ip-version-badge ${
            version === "IPv4" ? "ipv4-badge" : "ipv6-badge"
          }">${version || "Unknown"}</div>
          <button class="ip-copy-btn secondary small">
            <i class="fas fa-copy"></i> Copy
          </button>
        </div>
        
        <div class="ip-data-grid">
          <div class="ip-data-section">
            <h3><i class="fas fa-map-marker-alt"></i> Location</h3>
            <div class="ip-data-item">
              <i class="fas fa-city"></i>
              <span class="ip-data-label">City:</span>
              <span class="ip-data-value">${city || "Unknown"}</span>
            </div>
            <div class="ip-data-item">
              <i class="fas fa-map"></i>
              <span class="ip-data-label">Region:</span>
              <span class="ip-data-value">${region || "Unknown"}</span>
            </div>
            <div class="ip-data-item">
              <i class="fas fa-flag"></i>
              <span class="ip-data-label">Country:</span>
              <span class="ip-data-value">${country || "Unknown"}</span>
            </div>
            <div class="ip-data-item">
              <i class="fas fa-globe"></i>
              <span class="ip-data-label">Coordinates:</span>
              <span class="ip-data-value">
                ${
                  location?.latitude
                    ? `${location.latitude}, ${location.longitude}`
                    : "Unknown"
                }
              </span>
            </div>
          </div>
          
          <div class="ip-data-section">
            <h3><i class="fas fa-network-wired"></i> Network</h3>
            <div class="ip-data-item">
              <i class="fas fa-building"></i>
              <span class="ip-data-label">ISP:</span>
              <span class="ip-data-value">${isp || "Unknown"}</span>
            </div>
            <div class="ip-data-item">
              <i class="fas fa-sitemap"></i>
              <span class="ip-data-label">ASN:</span>
              <span class="ip-data-value">${asn || "Unknown"}</span>
            </div>
            <div class="ip-data-item">
              <i class="fas fa-clock"></i>
              <span class="ip-data-label">Timezone:</span>
              <span class="ip-data-value">${timezone || "Unknown"}</span>
            </div>
          </div>
        </div>
      </div>
      
      ${
        reputation.reputation_score
          ? `
        <div class="ip-reputation">
          <div class="reputation-header">
            <div class="reputation-score-container ${scoreClass}">${
              reputation.reputation_score
            }</div>
            <div>
              <h3>IP Reputation: ${scoreText}</h3>
              <p>Based on security analysis and blacklist checks</p>
            </div>
          </div>
          
          <div class="reputation-details">
            <div class="reputation-item">
              <i class="fas ${
                reputation.is_listed
                  ? "fa-times-circle poor"
                  : "fa-check-circle good"
              }"></i>
              <span>Blacklist Status: ${
                reputation.is_listed ? "Listed" : "Not Listed"
              }</span>
            </div>
            <div class="reputation-item">
              <i class="fas fa-history medium"></i>
              <span>Reports: ${reputation.reports || 0}</span>
            </div>
            ${
              reputation.last_reported
                ? `
              <div class="reputation-item">
                <i class="fas fa-calendar-alt medium"></i>
                <span>Last Reported: ${reputation.last_reported}</span>
              </div>
            `
                : ""
            }
          </div>
        </div>
      `
          : ""
      }
      
      <div class="ip-recommendations">
        <h3>Recommendations</h3>
        ${recommendationsHtml}
      </div>
    </div>
  `;
}

// Render error message
function renderErrorMessage(data) {
  const errorMessage = data.error || "An unknown error occurred";
  const errorCode = data.error_code || "UNKNOWN_ERROR";
  const suggestions = data.suggestions || ["Please try again later"];

  // Generate suggestions HTML
  const suggestionsHtml = suggestions
    .map((suggestion) => `<li>${suggestion}</li>`)
    .join("");

  return `
    <div class="issue-item issue-error">
      <div class="issue-icon">
        <i class="fas fa-exclamation-circle"></i>
      </div>
      <div class="issue-content">
        <div class="issue-title">${errorMessage}</div>
        <div class="issue-description">
          <div class="error-code">Error code: ${errorCode}</div>
          <div class="suggestions-container">
            <p>Suggestions:</p>
            <ul class="suggestions-list">${suggestionsHtml}</ul>
          </div>
        </div>
      </div>
    </div>
  `;
}
