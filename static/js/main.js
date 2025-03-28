// main.js - The main entry point for the application

// Import modules
import { initUI, setupEventListeners } from "./modules/ui.js";
import {
  initHistoryHandler,
  loadHistoryFromStorage,
} from "./modules/history.js";
import { initModals } from "./modules/modals.js";
import { initScoreMethodology } from "./modules/scoreMethodologyWrapper.js";
import {
  isMobileDevice,
  initMobileEnhancements,
  enhanceModalsForMobile,
  handleTableResponsiveness,
  fixSelectorsContainerOnMobile,
  enhanceMobileToast,
  setupOrientationChangeHandler,
  // fixExportButtonSensitivity,
} from "./mobile-enhancements.js";

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  // Initialize core components
  initUI();
  setupEventListeners();
  initHistoryHandler();
  loadHistoryFromStorage(); // Load history from storage if available
  initModals();
  initScoreMethodology();

  // Explicitly hide the overview container on page load
  const overviewContainer = document.getElementById("overview-container");
  if (overviewContainer) {
    overviewContainer.style.display = "none";
    overviewContainer.classList.add("hidden");
  }

  // Mobile enhancements if needed
  if (isMobileDevice()) {
    initMobileEnhancements();
    enhanceModalsForMobile();
    handleTableResponsiveness();
    fixSelectorsContainerOnMobile();
    enhanceMobileToast();
    setupOrientationChangeHandler();
    // Temporarily removed export button sensitivity fix
    // fixExportButtonSensitivity();
  }

  // Set up reputation guidance on record type change
  const recordType = document.getElementById("recordType");
  if (recordType) {
    recordType.addEventListener("change", showReputationGuidance);
  }

  console.log("Application initialized successfully!");
});

// Add event listener for page refreshes
window.addEventListener("pageshow", function (event) {
  // Hide overview container on refresh
  if (event.persisted) {
    const overviewContainer = document.getElementById("overview-container");
    if (overviewContainer) {
      overviewContainer.style.display = "none";
      overviewContainer.classList.add("hidden");
    }
  }
});

// Add guidance for first-time reputation check users
function showReputationGuidance() {
  const recordType = document.getElementById("recordType");
  if (recordType && recordType.value === "reputation") {
    import("./modules/toast.js").then((module) => {
      module.showToast(
        "The reputation check will verify if your domain is on common email blacklists, which could affect email deliverability.",
        "info",
        8000
      );
    });
  }
}

// Helper function to detect if reputation module is being loaded for the first time
let reputationCheckedBefore = false;
export function trackReputationCheck(domain) {
  if (!reputationCheckedBefore) {
    reputationCheckedBefore = true;
    // Store that user has checked reputation before
    try {
      localStorage.setItem("reputation_checked", "true");
    } catch (e) {
      console.error(
        "Could not save reputation check status to localStorage",
        e
      );
    }

    // Show a slightly more detailed guidance toast
    import("./modules/toast.js").then((module) => {
      module.showToast(
        "Domain reputation is being checked against multiple blacklist databases. This can take a moment to complete.",
        "info",
        7000
      );
    });
  }
}
