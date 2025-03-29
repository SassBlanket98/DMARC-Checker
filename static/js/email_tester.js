// email_tester.js - Main entry point for email deliverability tester

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
import { showToast } from "./modules/toast.js";
import { runEmailTest, runAdvancedEmailTest } from "./modules/email_tools.js";

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  // Initialize core components
  initHistoryHandler();
  loadHistoryFromStorage();
  initModals();

  // Initialize navigation dropdown
  initNavigation();
  setupNavResizeHandler();

  // Set up event listeners specific to email tester
  setupEmailTesterEventListeners();

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

  console.log("Email Tester initialized!");
});

// Set up event listeners for email tester
function setupEmailTesterEventListeners() {
  // Test mode buttons
  const quickTestBtn = document.getElementById("quick-test-btn");
  const advancedTestBtn = document.getElementById("advanced-test-btn");
  const quickTestPanel = document.getElementById("quick-test-panel");
  const advancedTestPanel = document.getElementById("advanced-test-panel");

  // Test run buttons
  const runTestBtn = document.getElementById("run-test-btn");
  const runAdvancedTestBtn = document.getElementById("run-advanced-test-btn");

  // Make sure the panels are in the correct initial state
  if (quickTestPanel && advancedTestPanel) {
    // Ensure quick test is shown by default and advanced is hidden
    quickTestPanel.classList.remove("hidden");
    advancedTestPanel.classList.add("hidden");
  }

  // Test mode toggle handlers
  if (quickTestBtn) {
    quickTestBtn.addEventListener("click", function () {
      quickTestBtn.classList.add("active");
      advancedTestBtn.classList.remove("active");

      // Hide advanced panel first, then show quick panel
      if (advancedTestPanel) advancedTestPanel.classList.add("hidden");
      if (quickTestPanel) quickTestPanel.classList.remove("hidden");

      console.log("Quick test selected");
    });
  }

  if (advancedTestBtn) {
    advancedTestBtn.addEventListener("click", function () {
      advancedTestBtn.classList.add("active");
      quickTestBtn.classList.remove("active");

      // Hide quick panel first, then show advanced panel
      if (quickTestPanel) quickTestPanel.classList.add("hidden");
      if (advancedTestPanel) advancedTestPanel.classList.remove("hidden");

      console.log("Advanced test selected");
    });
  }

  // Run test button handlers
  if (runTestBtn) {
    runTestBtn.addEventListener("click", function () {
      const fromEmail = document.getElementById("from-email").value.trim();
      const domain = document.getElementById("domain-name").value.trim();

      // Validate inputs
      if (!fromEmail) {
        showToast("Please enter your email address", "error");
        return;
      }

      if (!isValidEmail(fromEmail)) {
        showToast("Please enter a valid email address", "error");
        return;
      }

      if (!domain) {
        showToast("Please enter a domain to test", "error");
        return;
      }

      // If domain field is empty, try to extract from email
      const extractedDomain = domain || fromEmail.split("@")[1];

      // Run the test
      runEmailTest(fromEmail, extractedDomain);
    });
  }

  if (runAdvancedTestBtn) {
    runAdvancedTestBtn.addEventListener("click", function () {
      const fromName = document.getElementById("from-name").value.trim();
      const fromEmail = document.getElementById("from-email-adv").value.trim();
      const subject = document.getElementById("subject").value.trim();
      const content = document.getElementById("email-content").value.trim();
      const testEmail = document.getElementById("test-email").value.trim();

      // Validate inputs
      if (!fromEmail) {
        showToast("Please enter your email address", "error");
        return;
      }

      if (!isValidEmail(fromEmail)) {
        showToast("Please enter a valid email address", "error");
        return;
      }

      if (!testEmail || !isValidEmail(testEmail)) {
        showToast("Please enter a valid test email address", "error");
        return;
      }

      // Run advanced test
      runAdvancedEmailTest(fromName, fromEmail, subject, content, testEmail);
    });
  }

  // Email input auto-fill domain
  const fromEmailInput = document.getElementById("from-email");
  const domainInput = document.getElementById("domain-name");

  if (fromEmailInput && domainInput) {
    fromEmailInput.addEventListener("blur", function () {
      const email = fromEmailInput.value.trim();

      // If email is valid and domain is empty, extract domain from email
      if (isValidEmail(email) && !domainInput.value.trim()) {
        const domain = email.split("@")[1];
        domainInput.value = domain;
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

// Add to history (will be used by email_tools.js)
export function addEmailToHistory(email, domain) {
  try {
    import("./modules/history.js").then((historyModule) => {
      historyModule.addToHistory(`${email} (${domain})`, "email");
    });
  } catch (error) {
    console.error("Failed to add email to history:", error);
  }
}

// Email validation helper
function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

// Helper function to display a time elapsed counter
export function startTimeElapsed(elementId) {
  const startTime = new Date();
  const element = document.getElementById(elementId);

  if (!element) return null;

  const intervalId = setInterval(() => {
    const currentTime = new Date();
    const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    element.textContent = `Time elapsed: ${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
  }, 1000);

  return intervalId;
}

// Stop time elapsed counter
export function stopTimeElapsed(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
  }
}
