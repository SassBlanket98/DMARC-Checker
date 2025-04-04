// ip_tools.js - Functions for IP address checking and display with improved error handling

import { renderIpData } from "./ip_display.js";
import { showToast } from "./toast.js";
import { addIpToHistory } from "../ip_checker.js";

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
