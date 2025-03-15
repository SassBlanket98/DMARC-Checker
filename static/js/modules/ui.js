// ui.js - Basic UI setup and event handlers

import { checkRecord } from "./api.js";
import { showToast } from "./toast.js";
import { addToHistory } from "./history.js";

// DOM element references
export let domainInput;
export let recordTypeSelect;
export let selectorsContainer;
export let selectorsList;
export let resultBox;
export let overviewContainer;

// Initialize UI elements and store references
export function initUI() {
  // Get DOM references
  domainInput = document.getElementById("domain");
  recordTypeSelect = document.getElementById("recordType");
  selectorsContainer = document.getElementById("selectors-container");
  selectorsList = document.getElementById("selectors-list");
  resultBox = document.getElementById("result");
  overviewContainer = document.getElementById("overview-container");

  // Initialize selectors
  const selectorsData = [
    "google",
    "selector1",
    "selector2",
    "amazonses",
    "default",
  ];
  selectorsData.forEach((selector) => {
    addSelectorTag(selector);
  });

  console.log("UI initialized");
}

// Set up all event listeners
export function setupEventListeners() {
  // Record type change handler
  recordTypeSelect.addEventListener("change", handleRecordTypeChange);

  // Add selector button click handler
  const addSelectorBtn = document.getElementById("add-selector-btn");
  if (addSelectorBtn) {
    addSelectorBtn.addEventListener("click", handleAddSelector);
  }

  // Add selector on Enter key
  const newSelectorInput = document.getElementById("new-selector");
  if (newSelectorInput) {
    newSelectorInput.addEventListener("keydown", handleSelectorKeydown);
  }

  // Domain input autocomplete
  if (domainInput) {
    domainInput.addEventListener("input", handleDomainInput);
  }

  // Theme toggle
  const themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleDarkMode);
  }

  // Check button
  const checkBtn = document.getElementById("check-btn");
  if (checkBtn) {
    checkBtn.addEventListener("click", checkRecord);
  }

  // Export button
  const exportBtn = document.getElementById("export-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", handleExport);
  }

  // Enter key handler for searching
  document.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && document.activeElement === domainInput) {
      checkRecord();
    }
  });

  console.log("Event listeners set up");
}

// Toggle dark mode
export function toggleDarkMode() {
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

// Handle record type change
export function handleRecordTypeChange() {
  if (this.value === "dkim") {
    selectorsContainer.classList.add("visible");
  } else {
    selectorsContainer.classList.remove("visible");
  }
}

// Add selector tag
export function addSelectorTag(selector) {
  if (!selector) return;

  // Check if this selector already exists
  const existingSelectors = Array.from(
    document.querySelectorAll(".selector-tag")
  ).map((tag) => tag.textContent.trim().replace(/\s*×.*$/, ""));

  if (existingSelectors.includes(selector)) {
    return; // Skip adding if it already exists
  }

  const tag = document.createElement("div");
  tag.className = "selector-tag";
  tag.innerHTML = `
    ${selector}
    <i class="fas fa-times" onclick="removeSelector(this)"></i>
  `;
  selectorsList.appendChild(tag);
}

// Remove selector - needs to be global for onclick handler
window.removeSelector = function (element) {
  element.parentElement.remove();
};

// Handle add selector button click
export function handleAddSelector() {
  const newSelectorInput = document.getElementById("new-selector");
  const selector = newSelectorInput.value.trim();
  if (selector) {
    addSelectorTag(selector);
    newSelectorInput.value = "";
  }
}

// Handle selector input keydown
export function handleSelectorKeydown(e) {
  if (e.key === "Enter") {
    const selector = this.value.trim();
    if (selector) {
      addSelectorTag(selector);
      this.value = "";
    }
  }
}

// Handle domain input for autocomplete
export function handleDomainInput() {
  const domainSuggestions = document.getElementById("domain-suggestions");
  const input = this.value.toLowerCase();
  domainSuggestions.innerHTML = "";

  // Implement autocomplete logic here
  // For now, we'll just show/hide the suggestions container
  if (input.length > 1) {
    // In a real implementation, you would filter domain suggestions here
    domainSuggestions.classList.add("visible");
  } else {
    domainSuggestions.classList.remove("visible");
  }
}

// Handle document click to hide suggestions
export function handleDocumentClick(event) {
  const domainSuggestions = document.getElementById("domain-suggestions");
  if (
    !domainInput.contains(event.target) &&
    !domainSuggestions.contains(event.target)
  ) {
    domainSuggestions.classList.remove("visible");
  }
}

// Export button handler
export function handleExport() {
  // To be implemented - this would generate a PDF or other export format
  showToast("Exporting functionality to be implemented", "info");
}
