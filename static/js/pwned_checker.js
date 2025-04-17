// static/js/pwned_checker.js

import { showToast } from "./modules/toast.js";
import { addToHistory } from "./modules/history.js"; // Assuming you want history

document.addEventListener("DOMContentLoaded", function () {
  const checkButton = document.getElementById("check-pwned-btn");
  const emailInput = document.getElementById("pwned-email");
  const resultDiv = document.getElementById("pwned-result");

  if (checkButton && emailInput && resultDiv) {
    checkButton.addEventListener("click", checkEmailPwned);
    emailInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        checkEmailPwned();
      }
    });
  } else {
    console.error("Required elements for Pwned Checker not found.");
  }
});

async function checkEmailPwned() {
  const emailInput = document.getElementById("pwned-email");
  const resultDiv = document.getElementById("pwned-result");
  const email = emailInput.value.trim();

  if (!email) {
    showToast("Please enter an email address.", "warning");
    return;
  }

  // Basic email format validation (optional, as backend also validates)
  if (!validateEmail(email)) {
    showToast("Please enter a valid email address format.", "error");
    return;
  }

  // Show loading state
  resultDiv.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <div>Checking ${escapeHtml(email)}...</div>
        </div>`;

  try {
    const response = await fetch(
      `/api/check-pwned?email=${encodeURIComponent(email)}`
    );
    const data = await response.json();

    if (!response.ok) {
      // Handle API errors reported by our backend
      resultDiv.innerHTML = renderPwnedError(data);
      showToast(data.error || "Error checking email.", "error");
    } else {
      // Process successful response
      resultDiv.innerHTML = renderPwnedResult(data, email);
      // Add to history only on successful check (found or not found)
      if (data.status) {
        // Check if status exists (pwned or not_pwned)
        addToHistory(email, "pwned"); // Use 'pwned' as the type
      }
    }
  } catch (error) {
    console.error("Error fetching pwned status:", error);
    resultDiv.innerHTML = `
            <div class="pwned-error">
                <i class="fas fa-exclamation-triangle"></i>
                Could not connect to the checking service. Please check your connection and try again.
            </div>`;
    showToast("Network error. Could not check email.", "error");
  }
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function renderPwnedResult(data, email) {
  if (data.status === "not_pwned") {
    return `
            <div class="pwned-safe">
                <i class="fas fa-check-circle"></i>
                <h4>Good news! No breaches found.</h4>
                <p>The email address <strong>${escapeHtml(
                  email
                )}</strong> was not found in any known data breaches in the Have I Been Pwned database.</p>
                <p class="note">Remember to always use strong, unique passwords and enable two-factor authentication where possible.</p>
            </div>`;
  } else if (data.status === "pwned" && data.breaches) {
    const breachHtml = data.breaches
      .map(
        (breach) => `
            <div class="breach-item">
                <div class="breach-header">
                    <img src="${escapeHtml(
                      breach.LogoPath || "https://via.placeholder.com/32"
                    )}" alt="${escapeHtml(
          breach.Name
        )} Logo" width="32" height="32" loading="lazy">
                    <h4>${escapeHtml(breach.Name)}</h4>
                    <span class="breach-date">(Breached on: ${formatDate(
                      breach.BreachDate
                    )})</span>
                </div>
                <div class="breach-description">
                     ${escapeHtml(breach.Description)} </div>
                <div class="breach-data">
                    <strong>Compromised data:</strong>
                    <span>${breach.DataClasses.join(", ")}</span>
                </div>
                ${
                  breach.IsVerified
                    ? '<span class="verified-breach"><i class="fas fa-check"></i> Verified Breach</span>'
                    : ""
                }
                 ${
                   breach.IsSensitive
                     ? '<span class="sensitive-breach"><i class="fas fa-exclamation-triangle"></i> Sensitive Breach</span>'
                     : ""
                 }
                 ${
                   breach.IsSpamList
                     ? '<span class="spam-list"><i class="fas fa-envelope"></i> Spam List</span>'
                     : ""
                 }
            </div>
        `
      )
      .join("");

    return `
            <div class="pwned-found">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Oh no — pwned!</h4>
                <p>The email address <strong>${escapeHtml(
                  email
                )}</strong> was found in <strong>${
      data.breaches.length
    }</strong> known data breach(es):</p>
                <div class="breach-list">
                    ${breachHtml}
                </div>
                 <p class="warning-note">If you use passwords associated with these breaches elsewhere, <strong>change them immediately</strong>. Enable two-factor authentication on all sensitive accounts.</p>
            </div>`;
  } else {
    // Handle unexpected success response format
    return renderPwnedError({
      error: "Received an unexpected response from the server.",
      error_code: "UNEXPECTED_RESPONSE",
    });
  }
}

function renderPwnedError(errorData) {
  const errorMessage =
    errorData.error || "An unknown error occurred while checking the email.";
  const errorCode = errorData.error_code || "UNKNOWN_ERROR";

  let suggestions = "";
  if (errorCode === "HIBP_KEY_MISSING" || errorCode === "HIBP_UNAUTHORIZED") {
    suggestions = `<p><strong>Suggestion:</strong> The server administrator needs to configure a valid Have I Been Pwned API key.</p>`;
  } else if (errorCode === "HIBP_RATE_LIMITED") {
    suggestions = `<p><strong>Suggestion:</strong> The service is busy. Please wait a short while and try again.</p>`;
  } else if (errorCode === "INVALID_EMAIL_FORMAT") {
    suggestions = `<p><strong>Suggestion:</strong> Please ensure you entered a valid email address.</p>`;
  } else {
    suggestions = `<p><strong>Suggestion:</strong> Please try again later. If the problem persists, contact the site administrator.</p>`;
  }

  return `
        <div class="pwned-error">
            <i class="fas fa-times-circle"></i>
            <h4>Error Checking Email</h4>
            <p>${escapeHtml(errorMessage)}</p>
            ${
              errorCode !== "UNKNOWN_ERROR"
                ? `<p><small>Error Code: ${escapeHtml(errorCode)}</small></p>`
                : ""
            }
            ${suggestions}
        </div>`;
}

// Helper to escape HTML entities
function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") {
    return unsafe; // Return non-strings as is
  }
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper to format date string (e.g., "YYYY-MM-DD")
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original string if invalid
    }
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    return dateString; // Return original string on error
  }
}
