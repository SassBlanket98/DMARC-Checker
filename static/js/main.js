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
  fixExportButtonSensitivity,
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
    fixExportButtonSensitivity();
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
