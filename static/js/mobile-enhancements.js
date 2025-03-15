// Mobile Enhancement Functions
// Add these to your script.js file

// Detect if the device is mobile
function isMobileDevice() {
  return (
    window.innerWidth <= 768 ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

// Mobile-specific initializations
function initMobileEnhancements() {
  if (isMobileDevice()) {
    // Adjust history drawer behavior for mobile
    adjustHistoryDrawerForMobile();

    // Add touch-specific handlers
    addTouchHandlers();

    // Optimize toast position based on scroll
    optimizeToastPosition();

    // Add double-tap prevention (common mobile issue)
    preventDoubleTapZoom();
  }
}

// Adjust history drawer for mobile
function adjustHistoryDrawerForMobile() {
  // Add swipe to close functionality for the history drawer
  const historyDrawer = document.getElementById("history-drawer");
  let touchStartX = 0;

  historyDrawer.addEventListener(
    "touchstart",
    function (e) {
      touchStartX = e.touches[0].clientX;
    },
    { passive: true }
  );

  historyDrawer.addEventListener("touchmove", function (e) {
    const touchX = e.touches[0].clientX;
    const diff = touchStartX - touchX;

    // If swiping left, begin closing the drawer
    if (diff > 0) {
      e.preventDefault();
      const translateX = Math.min(diff, 300); // Cap at 300px
      historyDrawer.style.transform = `translateX(${translateX}px)`;
    }
  });

  historyDrawer.addEventListener("touchend", function (e) {
    const touchX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchX;

    // If swiped far enough, close drawer
    if (diff > 50) {
      closeHistoryDrawer();
    }

    // Reset the transform
    historyDrawer.style.transform = "";
  });

  // Close drawer when clicking outside on mobile
  document.addEventListener(
    "touchstart",
    function (e) {
      if (
        historyDrawer.classList.contains("open") &&
        !historyDrawer.contains(e.target) &&
        e.target.id !== "history-link"
      ) {
        closeHistoryDrawer();
      }
    },
    { passive: true }
  );
}

// Add specific touch handlers for mobile
function addTouchHandlers() {
  // Make record headers easier to tap
  const recordHeaders = document.querySelectorAll(".record-header");
  recordHeaders.forEach((header) => {
    header.style.minHeight = "44px";
  });

  // Improve tab switching experience on mobile
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener(
      "touchstart",
      function () {
        this.style.backgroundColor = "rgba(178, 34, 34, 0.1)";
      },
      { passive: true }
    );

    tab.addEventListener(
      "touchend",
      function () {
        setTimeout(() => {
          this.style.backgroundColor = "";
        }, 150);
      },
      { passive: true }
    );
  });
}

// Optimize toast position based on scroll and keyboard
function optimizeToastPosition() {
  const updateToastPosition = () => {
    const toastContainer = document.querySelector(".toast-container");
    if (!toastContainer) return;

    // Check if virtual keyboard is likely open (common on mobile)
    const isKeyboardLikely = window.innerHeight < window.outerHeight * 0.8;

    if (isKeyboardLikely) {
      // Move toasts to top when keyboard is open
      toastContainer.style.top = "20px";
      toastContainer.style.bottom = "auto";
    } else {
      // Default position at bottom
      toastContainer.style.top = "auto";
      toastContainer.style.bottom = "20px";
    }
  };

  // Update on input focus/blur (when keyboard appears/disappears)
  const inputs = document.querySelectorAll("input, select");
  inputs.forEach((input) => {
    input.addEventListener("focus", updateToastPosition);
    input.addEventListener("blur", updateToastPosition);
  });

  // Also check on resize and orientation change
  window.addEventListener("resize", updateToastPosition);
  window.addEventListener("orientationchange", updateToastPosition);
}

// Prevent zooming from double-tap on buttons and interactive elements
function preventDoubleTapZoom() {
  const interactiveElements = document.querySelectorAll(
    "button, .record-header, .tab, nav ul li a"
  );

  interactiveElements.forEach((element) => {
    element.addEventListener("touchend", function (e) {
      e.preventDefault();
      // Still trigger click after preventing default
      setTimeout(() => {
        if (e.target.click) {
          e.target.click();
        }
      }, 100);
    });
  });
}

// Enhance modals for mobile
function enhanceModalsForMobile() {
  // Allow scrolling inside modals but not on background
  const modals = document.querySelectorAll(".modal");

  modals.forEach((modal) => {
    modal.addEventListener(
      "touchmove",
      function (e) {
        e.stopPropagation();
      },
      { passive: true }
    );
  });

  // Close modal by tapping outside
  const modalBackdrops = document.querySelectorAll(".modal-backdrop");
  modalBackdrops.forEach((backdrop) => {
    backdrop.addEventListener("touchend", function (e) {
      if (e.target === this) {
        if (this.id === "help-modal") {
          closeHelpModal();
        } else if (this.id === "score-details-modal") {
          closeScoreDetailsModal();
        }
      }
    });
  });
}

// Add resize handlers for table display on small screens
function handleTableResponsiveness() {
  // Function to adjust table column display based on screen width
  const adjustTableColumns = () => {
    const tables = document.querySelectorAll(".parsed-data table");
    const isNarrow = window.innerWidth < 480;

    tables.forEach((table) => {
      const descriptionCells = table.querySelectorAll(
        "td:nth-child(3), th:nth-child(3)"
      );

      descriptionCells.forEach((cell) => {
        if (isNarrow) {
          cell.style.display = "none";
        } else {
          cell.style.display = "";
        }
      });
    });
  };

  // Run immediately and on resize
  adjustTableColumns();
  window.addEventListener("resize", adjustTableColumns);
}

// Add to the initialization function
document.addEventListener("DOMContentLoaded", function () {
  initApp();
  initScoreMethodology();

  // Initialize mobile enhancements
  initMobileEnhancements();
  enhanceModalsForMobile();
  handleTableResponsiveness();
});

// Update the showToast function to consider mobile positioning
const originalShowToast = showToast;
showToast = function (message, type = "info", duration = 5000) {
  // Call the original function
  originalShowToast(message, type, duration);

  // Then adjust position if on mobile
  if (isMobileDevice()) {
    const toastContainer = document.querySelector(".toast-container");
    if (toastContainer) {
      // Position in the center bottom of screen
      toastContainer.style.left = "50%";
      toastContainer.style.transform = "translateX(-50%)";
      toastContainer.style.width = "90%";
      toastContainer.style.maxWidth = "350px";
    }
  }
};

// Fix the issue with selectors display on mobile
function fixSelectorsContainerOnMobile() {
  const recordTypeSelect = document.getElementById("recordType");
  const selectorsContainer = document.getElementById("selectors-container");

  if (recordTypeSelect && selectorsContainer) {
    // Check initial state and adjust
    if (recordTypeSelect.value === "dkim") {
      selectorsContainer.classList.add("visible");
    }

    // Ensure selectors container is properly sized on mobile
    if (isMobileDevice()) {
      selectorsContainer.style.maxWidth = "100%";

      // Make selector tags more touch-friendly
      const selectorTags = document.querySelectorAll(".selector-tag");
      selectorTags.forEach((tag) => {
        tag.style.padding = "8px 12px";
        tag.style.marginBottom = "5px";
      });
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  // Call our original initializations
  initApp();
  initScoreMethodology();

  // Then call our mobile enhancements
  if (isMobileDevice()) {
    initMobileEnhancements();
    enhanceModalsForMobile();
    handleTableResponsiveness();
    fixSelectorsContainerOnMobile();
  }
});

// Handle orientation changes more gracefully
window.addEventListener("orientationchange", function () {
  // Slight delay to let the browser finish orientation change
  setTimeout(() => {
    handleTableResponsiveness();

    // Reposition any open modals
    const openModals = document.querySelectorAll(".modal-backdrop.open");
    openModals.forEach((modal) => {
      modal.querySelector(".modal").style.maxHeight =
        window.innerHeight * 0.8 + "px";
    });
  }, 300);
});

// Fix for oversensitive export button on mobile devices
function fixExportButtonSensitivity() {
  const exportBtn = document.getElementById("export-btn");
  if (!exportBtn) return;

  // Variables to track touch events
  let touchTimer = null;
  let isHolding = false;
  let holdComplete = false;
  const requiredHoldTime = 800; // Hold for 800ms to activate

  // Add visual indicator for hold progress
  const createHoldIndicator = () => {
    const indicator = document.createElement("div");
    indicator.className = "hold-indicator";
    exportBtn.appendChild(indicator);
    return indicator;
  };

  const indicator = createHoldIndicator();

  // Remove default click handler
  const originalClick = exportBtn.onclick;
  exportBtn.onclick = null;

  // Update button text to indicate hold action
  const originalText = exportBtn.innerHTML;
  exportBtn.innerHTML = `<i class="fas fa-file-export"></i> Press and hold to export`;

  // Touch start handler
  exportBtn.addEventListener("touchstart", function (e) {
    e.preventDefault(); // Prevent any default behavior

    // Clear any existing timer
    if (touchTimer) clearTimeout(touchTimer);

    // Reset state
    isHolding = true;
    holdComplete = false;

    // Show holding animation
    indicator.style.transition = `width ${requiredHoldTime}ms linear`;
    indicator.style.width = "0%";

    // Force a reflow to make sure the animation starts from 0
    void indicator.offsetWidth;

    // Start the animation
    indicator.style.width = "100%";

    // Set timer for the hold duration
    touchTimer = setTimeout(() => {
      if (isHolding) {
        holdComplete = true;

        // Give haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }

        // Show visual feedback
        exportBtn.classList.add("hold-complete");

        // Show confirmation dialog
        if (confirm("Export results as PDF?")) {
          handleExport();
        }

        // Reset after a moment
        setTimeout(() => {
          exportBtn.classList.remove("hold-complete");
          indicator.style.width = "0%";
        }, 300);
      }
    }, requiredHoldTime);
  });

  // Touch move handler - cancel if moved too much
  exportBtn.addEventListener("touchmove", function (e) {
    if (isHolding && !holdComplete) {
      // Get initial touch point
      const touch = e.touches[0];
      const btnRect = exportBtn.getBoundingClientRect();

      // If touch point moves outside button boundaries, cancel the hold
      if (
        touch.clientX < btnRect.left - 10 ||
        touch.clientX > btnRect.right + 10 ||
        touch.clientY < btnRect.top - 10 ||
        touch.clientY > btnRect.bottom + 10
      ) {
        // Cancel the hold
        isHolding = false;
        clearTimeout(touchTimer);
        indicator.style.transition = "width 0.2s ease-out";
        indicator.style.width = "0%";
      }
    }
  });

  // Touch end handler
  exportBtn.addEventListener("touchend", function () {
    // If they release before hold is complete, cancel the action
    if (isHolding && !holdComplete) {
      isHolding = false;
      clearTimeout(touchTimer);
      indicator.style.transition = "width 0.2s ease-out";
      indicator.style.width = "0%";
    }
  });

  // Touch cancel handler
  exportBtn.addEventListener("touchcancel", function () {
    isHolding = false;
    clearTimeout(touchTimer);
    indicator.style.transition = "width 0.2s ease-out";
    indicator.style.width = "0%";
  });
}
