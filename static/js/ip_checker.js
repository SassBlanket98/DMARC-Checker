// ip_checker.js - Main entry point for IP checker page

// Import modules
import {
  initHistoryHandler,
  loadHistoryFromStorage,
} from "./modules/history.js";
import { initModals } from "./modules/modals.js";
import {
  isMobileDevice,
  initMobileEnhancements,
  enhanceModalsForMobile,
  enhanceMobileToast,
  setupOrientationChangeHandler,
  enhanceNavigationForMobile,
} from "./mobile-enhancements.js";
import { initNavigation, setupNavResizeHandler } from "./modules/navigation.js";
import { checkIpAddress, checkCurrentIp } from "./modules/ip_tools.js";
import { showToast } from "./modules/toast.js";

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  // Initialize core components
  initHistoryHandler();
  loadHistoryFromStorage();
  initModals();

  // Initialize navigation dropdown
  initNavigation();
  setupNavResizeHandler();

  // Set up event listeners specific to IP checker
  setupIpCheckerEventListeners();

  // Mobile enhancements if needed
  if (isMobileDevice()) {
    initMobileEnhancements();
    enhanceModalsForMobile();
    enhanceMobileToast();
    setupOrientationChangeHandler();
    enhanceNavigationForMobile();
  }

  // Check for dark mode preference
  applyThemePreference();

  console.log("IP Checker initialized!");
});

// Set up event listeners for IP checker
function setupIpCheckerEventListeners() {
  const checkIpBtn = document.getElementById("check-ip-btn");
  const checkCurrentIpBtn = document.getElementById("check-current-ip-btn");
  const ipAddressInput = document.getElementById("ip-address");

  // Check IP button click handler
  if (checkIpBtn) {
    checkIpBtn.addEventListener("click", function () {
      const ipAddress = ipAddressInput.value.trim();
      checkIpAddress(ipAddress);
    });
  }

  // Check current IP button click handler
  if (checkCurrentIpBtn) {
    checkCurrentIpBtn.addEventListener("click", function () {
      checkCurrentIp();
    });
  }

  // Enter key handler for IP input
  if (ipAddressInput) {
    ipAddressInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        const ipAddress = ipAddressInput.value.trim();
        checkIpAddress(ipAddress);
      }
    });
  }

  // Theme toggle functionality
  const themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleDarkMode);
  }
}

// Toggle dark mode function
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const icon = this.querySelector("i");
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
function applyThemePreference() {
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

// Add to history (will be used by ip_tools.js)
export function addIpToHistory(ipAddress) {
  try {
    import("./modules/history.js").then((historyModule) => {
      historyModule.addToHistory(ipAddress, "ip");
    });
  } catch (error) {
    console.error("Failed to add IP to history:", error);
  }
}
