// utils_bundle.js - Consolidated utility functions

// ====== UTILITY FUNCTIONS (from utils.js) ======

// Helper function to get color based on score percentage
export function getScoreColor(score) {
  if (score >= 90) return "#2ecc71"; // A - Green
  if (score >= 80) return "#27ae60"; // B - Darker green
  if (score >= 70) return "#f39c12"; // C - Yellow/orange
  if (score >= 60) return "#e67e22"; // D - Orange
  return "#e74c3c"; // F - Red
}

// Helper function to convert hex color to RGB components
export function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace("#", "");

  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return { r, g, b };
}

// Helper function for debouncing function calls
export function debounce(func, wait) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Format a date for display
export function formatDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }

  return date.toLocaleString();
}

// Create a UUID for unique IDs
export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Check if a string is a valid JSON
export function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// ====== TOAST NOTIFICATION SYSTEM (from toast.js) ======

// Show toast notification
export function showToast(message, type = "info", duration = 5000) {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  // Create the toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  // Set icon based on type
  let icon;
  switch (type) {
    case "error":
      icon = "exclamation-circle";
      break;
    case "warning":
      icon = "exclamation-triangle";
      break;
    case "success":
      icon = "check-circle";
      break;
    default:
      icon = "info-circle";
  }

  // Create toast content
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas fa-${icon}"></i>
    </div>
    <div class="toast-content">${message}</div>
    <button class="toast-close">
      <i class="fas fa-times"></i>
    </button>
  `;

  // Add to container
  toastContainer.appendChild(toast);

  // Add close button functionality
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.classList.add("toast-hiding");
    setTimeout(() => {
      toast.remove();
    }, 300); // Match the CSS transition duration
  });

  // Auto-remove after duration
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add("toast-hiding");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }
  }, duration);

  // Show toast with animation
  setTimeout(() => {
    toast.classList.add("toast-visible");
  }, 10);
}

// ====== HISTORY MANAGEMENT (from history.js) ======

// Initialize history handler
export function initHistoryHandler() {
  // Setup history drawer links
  document
    .getElementById("history-link")
    .addEventListener("click", openHistoryDrawer);
  document
    .getElementById("history-close")
    .addEventListener("click", closeHistoryDrawer);
}

// Open history drawer
export function openHistoryDrawer(e) {
  if (e) e.preventDefault();
  document.getElementById("history-drawer").classList.add("open");
}

// Close history drawer
export function closeHistoryDrawer() {
  document.getElementById("history-drawer").classList.remove("open");
}

// Add a domain check to history
export function addToHistory(domain, recordType) {
  const historyList = document.querySelector(".history-list");
  const now = new Date();
  const timeString = now.toLocaleString();

  const historyItem = document.createElement("div");
  historyItem.className = "history-item";
  historyItem.innerHTML = `
    <div class="history-domain">${domain}</div>
    <div class="history-date">${timeString} <span class="history-record-type">${recordType.toUpperCase()}</span></div>
  `;

  historyItem.addEventListener("click", function () {
    document.getElementById("domain").value = domain;
    document.getElementById("recordType").value = recordType;
    document.getElementById("history-drawer").classList.remove("open");

    // Import checkRecord function and call it
    import("./core_bundle.js").then((module) => {
      module.checkRecord();
    });
  });

  // Add at the top of the list
  historyList.insertBefore(historyItem, historyList.firstChild);

  // Save to local storage for persistence
  saveHistoryToStorage(domain, recordType);
}

// Save history to localStorage
function saveHistoryToStorage(domain, recordType) {
  try {
    // Get existing history or initialize new array
    const history = JSON.parse(localStorage.getItem("domainHistory") || "[]");

    // Add new entry
    history.unshift({
      domain,
      recordType,
      timestamp: new Date().toISOString(),
    });

    // Limit to 20 entries
    if (history.length > 20) {
      history.pop();
    }

    // Save back to localStorage
    localStorage.setItem("domainHistory", JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save history to localStorage:", e);
  }
}

// Load history from localStorage
export function loadHistoryFromStorage() {
  try {
    const history = JSON.parse(localStorage.getItem("domainHistory") || "[]");

    // Clear existing list
    const historyList = document.querySelector(".history-list");
    historyList.innerHTML = "";

    // Add each item to the list
    history.forEach((item) => {
      const historyItem = document.createElement("div");
      historyItem.className = "history-item";

      // Format timestamp
      const date = new Date(item.timestamp);
      const timeString = date.toLocaleString();

      historyItem.innerHTML = `
        <div class="history-domain">${item.domain}</div>
        <div class="history-date">${timeString} <span class="history-record-type">${item.recordType.toUpperCase()}</span></div>
      `;

      historyItem.addEventListener("click", function () {
        document.getElementById("domain").value = item.domain;
        document.getElementById("recordType").value = item.recordType;
        document.getElementById("history-drawer").classList.remove("open");

        // Import checkRecord function and call it
        import("./core_bundle.js").then((module) => {
          module.checkRecord();
        });
      });

      historyList.appendChild(historyItem);
    });
  } catch (e) {
    console.error("Failed to load history from localStorage:", e);
  }
}

// ====== MODAL MANAGEMENT (from modals.js) ======

// Initialize all modals
export function initModals() {
  // Setup help modal
  document.getElementById("help-link").addEventListener("click", openHelpModal);
  document
    .getElementById("help-close")
    .addEventListener("click", closeHelpModal);

  // Prevent modal close when clicking inside
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  });

  // Load modal content
  initScoreDetailsModal();
}

// Open help modal
export function openHelpModal(e) {
  if (e) e.preventDefault();
  document.getElementById("help-modal").classList.add("open");
}

// Close help modal
export function closeHelpModal() {
  document.getElementById("help-modal").classList.remove("open");
}

// Initialize score details modal
export function initScoreDetailsModal() {
  // Create the modal if it doesn't exist
  if (!document.getElementById("score-details-modal")) {
    const modalHtml = `
      <div id="score-details-modal" class="modal-backdrop">
        <div class="modal score-details-modal">
          <div class="modal-header">
            <div class="modal-title">Email Authentication Score Details</div>
            <button class="modal-close" id="score-details-close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body" id="score-details-content">
            <!-- Score details will be inserted here -->
          </div>
        </div>
      </div>
    `;

    // Append the modal to the body
    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    // Add event listeners
    document
      .getElementById("score-details-close")
      .addEventListener("click", closeScoreDetailsModal);
    document
      .getElementById("score-details-modal")
      .addEventListener("click", function (event) {
        if (event.target === this) {
          closeScoreDetailsModal();
        }
      });

    // Add event listener for viewing methodology link
    document.addEventListener("click", function (event) {
      if (event.target.id === "view-methodology-link") {
        event.preventDefault();
        closeScoreDetailsModal(); // Close the score details modal
        openHelpModal(); // Open the help modal

        // Scroll to the methodology section after a slight delay
        setTimeout(() => {
          const methodologySection = document.querySelector(
            ".modal-section:nth-child(5)"
          );
          if (methodologySection) {
            methodologySection.scrollIntoView({ behavior: "smooth" });
          }
        }, 300);
      }
    });
  }
}

// Open score details modal
export function openScoreDetailsModal(scoreData) {
  // Generate the content
  const content = document.getElementById("score-details-content");
  content.innerHTML = generateScoreDetailsContent(scoreData);

  // Show the modal
  document.getElementById("score-details-modal").classList.add("open");
}

// Close score details modal
export function closeScoreDetailsModal() {
  document.getElementById("score-details-modal").classList.remove("open");
}

// Generate score details content
function generateScoreDetailsContent(scoreData) {
  const { overallScore, letterGrade, componentScores, recommendations } =
    scoreData;

  // Generate HTML for each component
  const componentsHtml = Object.entries(componentScores)
    .map(([component, data]) => {
      const detailsHtml = data.details
        .map(
          (detail) => `
      <div class="score-detail-item">${detail}</div>
    `
        )
        .join("");

      return `
      <div class="score-component-details">
        <h4>
          ${component.toUpperCase()} 
          <span class="component-score">${data.score}/${
        data.maxScore
      } points</span>
          <span class="status-indicator status-${data.status}">
            <i class="fas fa-${
              data.status === "success" ? "check-circle" : "exclamation-circle"
            }"></i>
            ${data.status === "success" ? "Passed" : "Failed"}
          </span>
        </h4>
        <div class="score-detail-items">
          ${detailsHtml}
        </div>
      </div>
    `;
    })
    .join("");

  // Generate HTML for recommendations
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
      : "<p>No additional recommendations at this time.</p>";

  // Complete content
  return `
    <div class="score-summary">
      <h3>Overall Score: ${overallScore}% (Grade ${letterGrade})</h3>
      <p>Your domain's email authentication configuration has been evaluated based on industry best practices.</p>
    </div>
    
    <h3>Component Scores</h3>
    ${componentsHtml}
    
    <h3>Recommendations</h3>
    ${recommendationsHtml}
    
    <div class="methodology-link">
      <p>
        <a href="#" id="view-methodology-link">View Score Methodology</a> to understand how these scores are calculated.
      </p>
    </div>
  `;
}

// ====== NAVIGATION FUNCTIONS (from navigation.js) ======

// Initialize navigation dropdown
export function initNavigation() {
  const navToggle = document.getElementById("nav-toggle");
  const dropdownMenu = document.getElementById("nav-dropdown-menu");

  if (!navToggle || !dropdownMenu) {
    console.error("Navigation elements not found");
    return;
  }

  // Toggle dropdown when clicking the toggle button
  navToggle.addEventListener("click", function (e) {
    e.preventDefault();
    dropdownMenu.classList.toggle("show");
    navToggle.classList.toggle("active");

    // Set aria-expanded for accessibility
    const isExpanded = dropdownMenu.classList.contains("show");
    navToggle.setAttribute("aria-expanded", isExpanded);
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function (e) {
    if (!navToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove("show");
      navToggle.classList.remove("active");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  // Support keyboard navigation - close with escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && dropdownMenu.classList.contains("show")) {
      dropdownMenu.classList.remove("show");
      navToggle.classList.remove("active");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  // Set current page as active
  setActiveNavItem();
}

// Set the active navigation item based on current URL
function setActiveNavItem() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll(".dropdown-menu a");

  navLinks.forEach((link) => {
    link.classList.remove("active");

    // Get the href value of the link
    const linkPath = link.getAttribute("href");

    // Check if the link path matches the current path
    if (
      linkPath === currentPath ||
      (currentPath === "/" && linkPath === "/") ||
      (linkPath !== "/" && currentPath.startsWith(linkPath))
    ) {
      link.classList.add("active");
    }
  });
}

// Add resize handler for mobile adjustments
export function setupNavResizeHandler() {
  const dropdownMenu = document.getElementById("nav-dropdown-menu");
  const navToggle = document.getElementById("nav-toggle");

  if (!dropdownMenu || !navToggle) return;

  window.addEventListener("resize", function () {
    // Reset dropdown when resizing
    dropdownMenu.classList.remove("show");
    navToggle.classList.remove("active");
    navToggle.setAttribute("aria-expanded", "false");
  });
}

// ====== SCORE METHODOLOGY WRAPPER (from scoreMethodologyWrapper.js) ======

export function initScoreMethodology() {
  // Call whatever initialization function exists in the global scope
  // or just return if it's already handled by the script loading
  if (window.ScoreMethodology) {
    console.log("Score methodology module loaded");
    return true;
  }
  return false;
}

// Toggle dark mode function
export function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const icon = document.querySelector(".theme-toggle i");
  if (document.body.classList.contains("dark-mode")) {
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
    localStorage.setItem("theme", "dark");
  } else {
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
    localStorage.setItem("theme", "light");
  }
}

// Apply theme preference from localStorage
export function applyThemePreference() {
  const theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    const icon = document.querySelector(".theme-toggle i");
    if (icon) {
      icon.classList.remove("fa-moon");
      icon.classList.add("fa-sun");
    }
  }
}

// Copy to clipboard helper function
export function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast("Copied to clipboard!", "success");
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
      showToast("Failed to copy text", "error");
    });
}

// Define global functions that were originally included via script tags
window.copyToClipboard = copyToClipboard;
window.toggleRecordCard = function (id) {
  const body = document.getElementById(id);
  if (!body) {
    console.error(`Element with id ${id} not found`);
    return;
  }

  body.classList.toggle("expanded");

  const header = body.previousElementSibling;
  if (!header) {
    console.error(`Header element not found for ${id}`);
    return;
  }

  const icon = header.querySelector(".expand-icon");
  if (!icon) {
    console.error(`Expand icon not found for ${id}`);
    return;
  }

  if (body.classList.contains("expanded")) {
    icon.classList.remove("fa-chevron-down");
    icon.classList.add("fa-chevron-up");
  } else {
    icon.classList.remove("fa-chevron-up");
    icon.classList.add("fa-chevron-down");
  }
};

window.switchTab = function (recordId, tabName) {
  // Get the tab container
  const tabContainer = document.getElementById(`${recordId}-tabs`);
  if (!tabContainer) {
    console.error(`Tab container for ${recordId} not found`);
    return;
  }

  // Check if this is a DMARC or SPF record (which only has 2 tabs)
  const recordHeader = document.querySelector(
    `#${recordId}-body`
  ).previousElementSibling;
  const recordTitle = recordHeader.querySelector("h3").textContent.trim();
  const isSimplifiedView =
    recordTitle.includes("DMARC") || recordTitle.includes("SPF");

  // Hide all tab contents in this record
  const tabContents = document.querySelectorAll(`#${recordId} .tab-content`);
  if (tabContents.length === 0) {
    // If we can't find tab contents with the original selector, try a more specific one
    const altTabContents = document.querySelectorAll(
      `[id^="${recordId}-"][id$="-raw"], [id^="${recordId}-"][id$="-parsed"], [id^="${recordId}-"][id$="-recommendations"]`
    );
    altTabContents.forEach((tab) => {
      tab.classList.remove("active");
    });
  } else {
    tabContents.forEach((tab) => {
      tab.classList.remove("active");
    });
  }

  // Remove active class from all tabs
  const tabs = tabContainer.querySelectorAll(".tab");
  tabs.forEach((tab) => tab.classList.remove("active"));

  // Show selected tab
  const activeTab = document.getElementById(`${recordId}-${tabName}`);
  if (activeTab) {
    activeTab.classList.add("active");
  } else {
    console.error(`Tab ${tabName} for ${recordId} not found`);
  }

  // Add active class to selected tab button
  const activeTabButton = tabContainer.querySelector(
    `.tab[data-tab="${tabName}"]`
  );
  if (activeTabButton) {
    activeTabButton.classList.add("active");
  } else {
    console.error(`Tab button for ${tabName} not found`);
  }
};
