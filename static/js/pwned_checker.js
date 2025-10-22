// static/js/pwned_checker.js

import { showToast } from "./modules/toast.js";
import { addToHistory } from "./modules/history.js"; // Assuming you want history
import { validateDomain } from "./domainValidation.js";

document.addEventListener("DOMContentLoaded", function () {
  const checkButton = document.getElementById("check-pwned-btn");
  const input = document.getElementById("pwned-input");
  const resultDiv = document.getElementById("pwned-result");
  const modeRadios = document.querySelectorAll('input[name="check-mode"]');

  if (checkButton && input && resultDiv) {
    // Mode change updates placeholder/button
    const syncUiToMode = () => {
      const mode = getMode();
      if (mode === "email") {
        input.type = "email";
        input.placeholder = "Enter email address";
        checkButton.innerHTML = '<i class="fas fa-search"></i> Check Email';
        resultDiv.innerHTML = "Enter an email address to check for breaches.";
      } else {
        input.type = "text";
        input.placeholder = "Enter domain (e.g., example.com)";
        checkButton.innerHTML = '<i class="fas fa-search"></i> Search Domain';
        resultDiv.innerHTML = "Enter a domain to search for exposure signals.";
      }
    };

    const getMode = () => {
      const selected = document.querySelector(
        'input[name="check-mode"]:checked'
      );
      return selected ? selected.value : "email";
    };

    modeRadios.forEach((r) => r.addEventListener("change", syncUiToMode));
    syncUiToMode();

    checkButton.addEventListener("click", () => {
      const mode = getMode();
      if (mode === "email") {
        checkEmailPwned();
      } else {
        checkDomainIntel();
      }
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        const mode =
          document.querySelector('input[name="check-mode"]:checked')?.value ||
          "email";
        if (mode === "email") {
          checkEmailPwned();
        } else {
          checkDomainIntel();
        }
      }
    });
  } else {
    console.error("Required elements for Pwned Checker not found.");
  }
});

async function checkEmailPwned() {
  const emailInput = document.getElementById("pwned-input");
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

async function checkDomainIntel() {
  const input = document.getElementById("pwned-input");
  const resultDiv = document.getElementById("pwned-result");
  const domain = input.value.trim().toLowerCase();

  if (!domain) {
    showToast("Please enter a domain.", "warning");
    return;
  }

  const validation = validateDomain(domain);
  if (!validation.valid) {
    resultDiv.innerHTML = renderPwnedError(validation.error);
    showToast("Please enter a valid domain (e.g., example.com).", "error");
    return;
  }

  resultDiv.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <div>Searching ${escapeHtml(domain)}...</div>
        </div>`;

  try {
    const resp = await fetch(
      `/api/domain-intel?domain=${encodeURIComponent(domain)}`
    );
    const data = await resp.json();

    if (!resp.ok) {
      resultDiv.innerHTML = renderPwnedError(data);
      showToast(data.error || "Error searching domain.", "error");
      return;
    }

    resultDiv.innerHTML = renderDomainIntelResult(data);
    addToHistory(domain, "domain-intel");
  } catch (e) {
    console.error("Domain intel error:", e);
    resultDiv.innerHTML = `
            <div class="pwned-error">
                <i class="fas fa-exclamation-triangle"></i>
                Could not connect to the domain intelligence service. Please try again later.
            </div>`;
    showToast("Network error. Could not query providers.", "error");
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

function renderDomainIntelResult(data) {
  const summary = data.summary || { total_findings: 0, categories: {} };
  const providers = data.providers || {};

  const categoryChips = Object.entries(summary.categories)
    .map(([k, v]) => `<span class="chip">${escapeHtml(k)}: ${v}</span>`)
    .join(" ");

  const providerBlocks = Object.entries(providers)
    .map(([name, p]) => {
      if (!p.configured || p.status === "not_configured") {
        return `
          <div class="breach-item">
            <div class="breach-header">
              <h4>${escapeHtml(name)}</h4>
              <span class="breach-date">Not configured</span>
            </div>
            <div class="breach-description">
              Configure this provider's API key on the server to enable results.
            </div>
          </div>`;
      }

      if (p.status !== "ok") {
        return `
          <div class="breach-item">
            <div class="breach-header">
              <h4>${escapeHtml(name)}</h4>
              <span class="breach-date">Error</span>
            </div>
            <div class="breach-description">
              ${escapeHtml(p.message || "Provider returned an error.")}
              ${
                p.error_code
                  ? `<div><small>Code: ${escapeHtml(
                      p.error_code
                    )}</small></div>`
                  : ""
              }
            </div>
          </div>`;
      }

      const findings = (p.findings || [])
        .map((f) => {
          const meta = f.metadata
            ? `<details><summary>Details</summary><pre>${escapeHtml(
                JSON.stringify(f.metadata, null, 2)
              )}</pre></details>`
            : "";
          return `
          <div class="breach-item">
            <div class="breach-header">
              <h4>${escapeHtml(f.title || "Finding")}</h4>
              <span class="breach-date">${escapeHtml(f.date || "")}</span>
            </div>
            <div class="breach-description">
              <strong>Type:</strong> ${escapeHtml(
                f.type || "unknown"
              )} &nbsp;|&nbsp; <strong>Source:</strong> ${escapeHtml(
            f.source || name
          )}
            </div>
            ${meta}
          </div>`;
        })
        .join("");

      return `
        <div class="provider-block">
          <h4><i class="fas fa-database"></i> ${escapeHtml(name)} (${
        p.findings_count || 0
      })</h4>
          ${
            findings ||
            `<div class="breach-item"><div class="breach-description">No findings returned.</div></div>`
          }
        </div>`;
    })
    .join("");

  return `
    <div class="pwned-found">
      <i class="fas fa-search"></i>
      <h4>Domain Intelligence Summary</h4>
      <p>Total findings: <strong>${summary.total_findings || 0}</strong></p>
      <div class="breach-list">${categoryChips || ""}</div>
      <div class="breach-list">${providerBlocks}</div>
      <p class="note">Provider integrations require valid API keys configured on the server. Unconfigured providers will be skipped.</p>
    </div>
  `;
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
