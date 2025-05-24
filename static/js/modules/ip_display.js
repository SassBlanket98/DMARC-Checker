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
    external_reputation_sources = [],
    overall_calculated_reputation = {},
  } = data;
  // Determine reputation score class based on overall calculated reputation or fallback to existing
  let scoreClass = "score-medium";
  let scoreText = "Average";
  let reputationScore =
    overall_calculated_reputation.score || reputation.reputation_score;

  if (reputationScore >= 80) {
    scoreClass = "score-good";
    scoreText = "Good";
  } else if (reputationScore >= 60) {
    scoreClass = "score-medium";
    scoreText = "Average";
  } else if (reputationScore >= 40) {
    scoreClass = "score-warning";
    scoreText = "Warning";
  } else if (reputationScore < 40) {
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
          reputationScore || reputation.reputation_score
            ? `
        <div class="ip-reputation">
          <div class="reputation-header">
            <div class="reputation-score-container ${scoreClass}">${
                reputationScore || reputation.reputation_score
              }</div>
            <div>
              <h3>IP Reputation: ${scoreText}</h3>
              <p>Based on comprehensive security analysis and threat intelligence</p>
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
          
          ${renderExternalReputationSources(external_reputation_sources)}
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

// Render external reputation sources
function renderExternalReputationSources(sources) {
  if (!sources || sources.length === 0) {
    return "";
  }

  const sourcesHtml = sources
    .map((source) => {
      const sourceName = source.source || "Unknown Source";

      // Handle error cases
      if (source.error) {
        return `
        <div class="external-source">
          <div class="source-header">
            <i class="fas fa-exclamation-triangle warning"></i>
            <span class="source-name">${sourceName}</span>
            <span class="source-status error">Error</span>
          </div>
          <div class="source-details">
            <p class="error-message">${source.error}</p>
          </div>
        </div>
      `;
      }

      // Handle info cases (like IP not found)
      if (source.info) {
        return `
        <div class="external-source">
          <div class="source-header">
            <i class="fas fa-info-circle medium"></i>
            <span class="source-name">${sourceName}</span>
            <span class="source-status info">No Data</span>
          </div>
          <div class="source-details">
            <p>${source.info}</p>
          </div>
        </div>
      `;
      }

      // Handle successful data
      if (source.data) {
        return renderSourceData(sourceName, source.data);
      }

      return "";
    })
    .filter((html) => html !== "")
    .join("");

  return `
    <div class="external-sources">
      <h4><i class="fas fa-shield-alt"></i> External Threat Intelligence</h4>
      <div class="sources-grid">
        ${sourcesHtml}
      </div>
    </div>
  `;
}

// Render specific source data based on source type
function renderSourceData(sourceName, data) {
  switch (sourceName) {
    case "AbuseIPDB":
      return renderAbuseIPDBData(data);
    case "VirusTotal":
      return renderVirusTotalData(data);
    case "DNSBL":
      return renderDNSBLData(data);
    default:
      return renderGenericSourceData(sourceName, data);
  }
}

// Render AbuseIPDB specific data
function renderAbuseIPDBData(data) {
  const abuseData = data.data || {};
  const abuseConfidence = abuseData.abuseConfidencePercentage || 0;
  const usageType = abuseData.usageType || "Unknown";
  const isp = abuseData.isp || "Unknown";
  const totalReports = abuseData.totalReports || 0;

  let confidenceClass = "good";
  let confidenceText = "Clean";

  if (abuseConfidence >= 75) {
    confidenceClass = "poor";
    confidenceText = "High Risk";
  } else if (abuseConfidence >= 25) {
    confidenceClass = "warning";
    confidenceText = "Medium Risk";
  } else if (abuseConfidence > 0) {
    confidenceClass = "medium";
    confidenceText = "Low Risk";
  }

  return `
    <div class="external-source">
      <div class="source-header">
        <i class="fas fa-database"></i>
        <span class="source-name">AbuseIPDB</span>
        <span class="source-status ${confidenceClass}">${confidenceText}</span>
      </div>
      <div class="source-details">
        <div class="source-metric">
          <span class="metric-label">Abuse Confidence:</span>
          <span class="metric-value ${confidenceClass}">${abuseConfidence}%</span>
        </div>
        <div class="source-metric">
          <span class="metric-label">Total Reports:</span>
          <span class="metric-value">${totalReports}</span>
        </div>
        <div class="source-metric">
          <span class="metric-label">Usage Type:</span>
          <span class="metric-value">${usageType}</span>
        </div>
        <div class="source-metric">
          <span class="metric-label">ISP:</span>
          <span class="metric-value">${isp}</span>
        </div>
      </div>
    </div>
  `;
}

// Render VirusTotal specific data
function renderVirusTotalData(data) {
  const reputation = data.reputation || 0;
  const lastAnalysisStats = data.last_analysis_stats || {};
  const malicious = lastAnalysisStats.malicious || 0;
  const suspicious = lastAnalysisStats.suspicious || 0;
  const clean = lastAnalysisStats.harmless || 0;
  const undetected = lastAnalysisStats.undetected || 0;

  let reputationClass = "good";
  let reputationText = "Clean";

  if (malicious > 0) {
    reputationClass = "poor";
    reputationText = "Malicious";
  } else if (suspicious > 0) {
    reputationClass = "warning";
    reputationText = "Suspicious";
  } else if (reputation < 0) {
    reputationClass = "medium";
    reputationText = "Poor Reputation";
  }

  return `
    <div class="external-source">
      <div class="source-header">
        <i class="fas fa-virus"></i>
        <span class="source-name">VirusTotal</span>
        <span class="source-status ${reputationClass}">${reputationText}</span>
      </div>
      <div class="source-details">
        <div class="source-metric">
          <span class="metric-label">Reputation Score:</span>
          <span class="metric-value ${reputationClass}">${reputation}</span>
        </div>
        ${
          malicious > 0
            ? `
        <div class="source-metric">
          <span class="metric-label">Malicious Detections:</span>
          <span class="metric-value poor">${malicious}</span>
        </div>
        `
            : ""
        }
        ${
          suspicious > 0
            ? `
        <div class="source-metric">
          <span class="metric-label">Suspicious Detections:</span>
          <span class="metric-value warning">${suspicious}</span>
        </div>
        `
            : ""
        }
        <div class="source-metric">
          <span class="metric-label">Clean Detections:</span>
          <span class="metric-value good">${clean}</span>
        </div>
      </div>
    </div>
  `;
}

// Render DNSBL specific data
function renderDNSBLData(data) {
  const checkedServers = data.checked_servers || [];
  const listedCount = Object.values(data).filter(
    (status) => status === "listed"
  ).length;

  let statusClass = "good";
  let statusText = "Not Listed";

  if (listedCount > 0) {
    statusClass = "poor";
    statusText = `Listed on ${listedCount} blacklist(s)`;
  }

  return `
    <div class="external-source">
      <div class="source-header">
        <i class="fas fa-list"></i>
        <span class="source-name">DNS Blacklists</span>
        <span class="source-status ${statusClass}">${statusText}</span>
      </div>
      <div class="source-details">
        <div class="source-metric">
          <span class="metric-label">Checked Servers:</span>
          <span class="metric-value">${checkedServers.length}</span>
        </div>
        <div class="source-metric">
          <span class="metric-label">Listed Count:</span>
          <span class="metric-value ${statusClass}">${listedCount}</span>
        </div>
        ${
          data.info
            ? `
        <div class="source-metric">
          <span class="metric-label">Status:</span>
          <span class="metric-value">${data.info}</span>
        </div>
        `
            : ""
        }
      </div>
    </div>
  `;
}

// Render generic source data
function renderGenericSourceData(sourceName, data) {
  const keys = Object.keys(data).slice(0, 4); // Limit to first 4 properties

  const metricsHtml = keys
    .map((key) => {
      const value = data[key];
      return `
      <div class="source-metric">
        <span class="metric-label">${key.replace(/_/g, " ")}:</span>
        <span class="metric-value">${value}</span>
      </div>
    `;
    })
    .join("");

  return `
    <div class="external-source">
      <div class="source-header">
        <i class="fas fa-info-circle"></i>
        <span class="source-name">${sourceName}</span>
        <span class="source-status medium">Data Available</span>
      </div>
      <div class="source-details">
        ${metricsHtml}
      </div>
    </div>
  `;
}
