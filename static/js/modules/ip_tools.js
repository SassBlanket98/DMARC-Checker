// ip_tools.js - Functions for IP address checking and display with improved error handling

import { showToast } from "./toast.js";
import { addIpToHistory } from "../ip_checker.js";

// ---------- BEGIN MERGED FUNCTIONS FROM ip_display.js ----------

// Render IP data
function renderIpData(data) {
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

// ---------- END MERGED FUNCTIONS FROM ip_display.js ----------

// Maximum number of retry attempts
const MAX_RETRIES = 2;
let retryCount = 0;

// Check a specific IP address
export function checkIpAddress(ip_address) {
  const resultBox = document.getElementById("ip-result");

  // If no IP provided, check current IP
  if (!ip_address) {
    checkCurrentIp();
    return;
  }

  // Validate IP format (basic check)
  if (!isValidIpFormat(ip_address)) {
    showToast("Invalid IP address format", "error");

    // Show error in the result box
    resultBox.innerHTML = `
      <div class="issue-item issue-error">
        <div class="issue-icon">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <div class="issue-content">
          <div class="issue-title">Invalid IP address format</div>
          <div class="issue-description">
            <div class="error-code">Error code: INVALID_IP_FORMAT</div>
            <div class="suggestions-container">
              <p>Suggestions:</p>
              <ul class="suggestions-list">
                <li>IP address should be in a valid IPv4 or IPv6 format.</li>
                <li>IPv4 example: 192.168.1.1</li>
                <li>IPv6 example: 2001:0db8:85a3:0000:0000:8a2e:0370:7334</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // Reset retry count when checking a new IP
  retryCount = 0;

  // Show loading state
  resultBox.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <div>Loading IP information for ${ip_address}...</div>
    </div>
  `;

  // Fetch IP information from the API
  fetchIpInfo(ip_address)
    .then((data) => {
      // Add to history
      addIpToHistory(ip_address);

      // Render IP data
      resultBox.innerHTML = renderIpData(data);

      // Set up any interactive elements (like copy buttons)
      setupIpInteractions();
    })
    .catch((error) => {
      console.error("Error fetching IP information:", error);

      // Show error toast
      showToast("Error retrieving IP information", "error");

      // Show error in the result box with retry button
      resultBox.innerHTML = `
        <div class="issue-item issue-error">
          <div class="issue-icon">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <div class="issue-content">
            <div class="issue-title">Error retrieving IP information</div>
            <div class="issue-description">
              <div class="error-code">Error code: ${
                error.code || "IP_FETCH_ERROR"
              }</div>
              <div class="suggestions-container">
                <p>Suggestions:</p>
                <ul class="suggestions-list">
                  <li>Check your internet connection</li>
                  <li>Try again in a few moments</li>
                  <li>Verify that the IP address is correct</li>
                </ul>
              </div>
              ${
                retryCount < MAX_RETRIES
                  ? `
                <button id="retry-ip-btn" class="recovery-button">
                  <i class="fas fa-redo"></i> Retry
                </button>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      `;

      // Add retry button functionality if showing
      if (retryCount < MAX_RETRIES) {
        const retryBtn = document.getElementById("retry-ip-btn");
        if (retryBtn) {
          retryBtn.addEventListener("click", () => {
            retryCount++;
            checkIpAddress(ip_address);
          });
        }
      }
    });
}

// Check the user's current IP address
export function checkCurrentIp() {
  const resultBox = document.getElementById("ip-result");
  const ipInput = document.getElementById("ip-address");

  // Reset retry count when checking a new IP
  retryCount = 0;

  // Show loading state
  resultBox.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <div>Detecting your current IP address...</div>
    </div>
  `;

  // First try to get IP address using a reliable public service
  fetch("https://api.ipify.org?format=json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Could not detect IP with primary service");
      }
      return response.json();
    })
    .then((data) => {
      const ip = data.ip;

      // Now that we have the IP, check it with our backend
      if (ip) {
        // Update the input field with the detected IP
        if (ipInput) {
          ipInput.value = ip;
        }

        // Now get full details about this IP
        return fetchIpInfo(ip);
      } else {
        // If ipify doesn't return a valid IP, fall back to our backend
        return fetchIpInfo();
      }
    })
    .catch((error) => {
      console.warn("Error with ipify service, falling back to backend:", error);
      // Fall back to our backend for IP detection
      return fetchIpInfo();
    })
    .then((data) => {
      // Add to history
      if (data.ip) {
        addIpToHistory(data.ip);

        // Update the input field with the detected IP
        if (ipInput) {
          ipInput.value = data.ip;
        }
      }

      // Render IP data
      resultBox.innerHTML = renderIpData(data);

      // Set up any interactive elements (like copy buttons)
      setupIpInteractions();
    })
    .catch((error) => {
      console.error("Error fetching current IP information:", error);

      // Show error toast
      showToast("Error retrieving your IP information", "error");

      // Show error in the result box with retry button
      resultBox.innerHTML = `
        <div class="issue-item issue-error">
          <div class="issue-icon">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <div class="issue-content">
            <div class="issue-title">Error retrieving your IP information</div>
            <div class="issue-description">
              <div class="error-code">Error code: ${
                error.code || "CURRENT_IP_FETCH_ERROR"
              }</div>
              <div class="suggestions-container">
                <p>Suggestions:</p>
                <ul class="suggestions-list">
                  <li>Check your internet connection</li>
                  <li>Try again in a few moments</li>
                  <li>Your firewall or security settings may be blocking the request</li>
                </ul>
              </div>
              ${
                retryCount < MAX_RETRIES
                  ? `
                <button id="retry-current-ip-btn" class="recovery-button">
                  <i class="fas fa-redo"></i> Retry
                </button>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      `;

      // Add retry button functionality if showing
      if (retryCount < MAX_RETRIES) {
        const retryBtn = document.getElementById("retry-current-ip-btn");
        if (retryBtn) {
          retryBtn.addEventListener("click", () => {
            retryCount++;
            checkCurrentIp();
          });
        }
      }
    });
}

// Fetch IP information from the server
async function fetchIpInfo(ipAddress = null) {
  try {
    // Construct API URL
    const url = `/api/ip-info${
      ipAddress ? `?ip=${encodeURIComponent(ipAddress)}` : ""
    }`;

    // Fetch the data with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(
        errorData.error || `HTTP error ${response.status}`
      );
      error.code = errorData.error_code || `HTTP_${response.status}`;
      throw error;
    }

    // Parse and return the data
    const data = await response.json();

    // Check if there's an error in the response data
    if (data.error) {
      const error = new Error(data.error);
      error.code = data.error_code || "API_ERROR";
      throw error;
    }

    return data;
  } catch (error) {
    // Handle AbortController timeout
    if (error.name === "AbortError") {
      error.code = "REQUEST_TIMEOUT";
      error.message = "The request took too long to complete";
    }

    console.error("Fetch error:", error);
    throw error;
  }
}

// Basic validation of IP format
function isValidIpFormat(ip) {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;

  // Simplified IPv6 pattern
  const ipv6Pattern =
    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}::?){1,7}[0-9a-fA-F]{1,4}$/;

  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

// Set up interactive elements after rendering IP data
function setupIpInteractions() {
  // Find and set up copy button functionality
  const copyBtn = document.querySelector(".ip-copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      const ipText = document.querySelector(".ip-address-display").textContent;
      navigator.clipboard
        .writeText(ipText)
        .then(() => {
          showToast("IP address copied to clipboard", "success");
        })
        .catch(() => {
          showToast("Failed to copy IP address", "error");
        });
    });
  }
}
