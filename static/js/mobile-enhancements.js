// mobile-enhancements.js - Mobile device detection and enhancements
// Converted to ES module format with proper exports

// Export this function so it can be imported in main.js
export function isMobileDevice() {
  return (
    window.innerWidth <= 768 ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

// Export the main mobile enhancement initialization function
export function initMobileEnhancements() {
  if (!isMobileDevice()) return;

  // Adjust history drawer behavior for mobile
  adjustHistoryDrawerForMobile();

  // Add touch-specific handlers
  addTouchHandlers();

  // Optimize toast position based on scroll
  optimizeToastPosition();

  // Add double-tap prevention (common mobile issue)
  preventDoubleTapZoom();
}

// Adjust history drawer for mobile
function adjustHistoryDrawerForMobile() {
  // Add swipe to close functionality for the history drawer
  const historyDrawer = document.getElementById("history-drawer");
  if (!historyDrawer) return;

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
      // Use dynamic import to access the history module
      import("./modules/history.js").then((historyModule) => {
        historyModule.closeHistoryDrawer();
      });
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
        import("./modules/history.js").then((historyModule) => {
          historyModule.closeHistoryDrawer();
        });
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

// Export the modal enhancement function
export function enhanceModalsForMobile() {
  if (!isMobileDevice()) return;

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
          import("./modules/modals.js").then((modalsModule) => {
            modalsModule.closeHelpModal();
          });
        } else if (this.id === "score-details-modal") {
          import("./modules/modals.js").then((modalsModule) => {
            modalsModule.closeScoreDetailsModal();
          });
        }
      }
    });
  });
}

// Export the table responsiveness function
export function handleTableResponsiveness() {
  if (!isMobileDevice()) return;

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

// Export the mobile toast enhancement function
export function enhanceMobileToast() {
  if (!isMobileDevice()) return;

  // Create a globally accessible wrapper function for mobile toast
  window.showMobileToast = function (message, type = "info", duration = 5000) {
    // Import the toast module when needed
    import("./modules/toast.js").then((toastModule) => {
      // Call the original toast function
      toastModule.showToast(message, type, duration);

      // Then apply mobile-specific styling
      setTimeout(() => {
        const toastContainer = document.querySelector(".toast-container");
        if (toastContainer) {
          toastContainer.style.left = "50%";
          toastContainer.style.transform = "translateX(-50%)";
          toastContainer.style.width = "90%";
          toastContainer.style.maxWidth = "350px";
        }
      }, 10); // Small delay to ensure the toast container exists
    });
  };

  // Add a MutationObserver to detect when toasts are added to the DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          // Check if the added node is a toast container
          if (node.classList && node.classList.contains("toast-container")) {
            // Apply mobile styling
            node.style.left = "50%";
            node.style.transform = "translateX(-50%)";
            node.style.width = "90%";
            node.style.maxWidth = "350px";
          }

          // Check if the added node is a toast
          if (node.classList && node.classList.contains("toast")) {
            // If we're adding a toast to an existing container
            const container = node.parentElement;
            if (container && container.classList.contains("toast-container")) {
              container.style.left = "50%";
              container.style.transform = "translateX(-50%)";
              container.style.width = "90%";
              container.style.maxWidth = "350px";
            }
          }
        });
      }
    });
  });

  // Start observing the document body for toast-related changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Export the selectors container function
export function fixSelectorsContainerOnMobile() {
  if (!isMobileDevice()) return;

  const recordTypeSelect = document.getElementById("recordType");
  const selectorsContainer = document.getElementById("selectors-container");

  if (recordTypeSelect && selectorsContainer) {
    // Check initial state and adjust
    if (recordTypeSelect.value === "dkim") {
      selectorsContainer.classList.add("visible");
    }

    // Ensure selectors container is properly sized on mobile
    selectorsContainer.style.maxWidth = "100%";

    // Make selector tags more touch-friendly
    const selectorTags = document.querySelectorAll(".selector-tag");
    selectorTags.forEach((tag) => {
      tag.style.padding = "8px 12px";
      tag.style.marginBottom = "5px";
    });
  }
}

// Export orientation change handler
export function setupOrientationChangeHandler() {
  if (!isMobileDevice()) return;

  window.addEventListener("orientationchange", function () {
    // Slight delay to let the browser finish orientation change
    setTimeout(() => {
      handleTableResponsiveness();

      // Reposition any open modals
      const openModals = document.querySelectorAll(".modal-backdrop.open");
      openModals.forEach((modal) => {
        const modalElement = modal.querySelector(".modal");
        if (modalElement) {
          modalElement.style.maxHeight = window.innerHeight * 0.8 + "px";
        }
      });
    }, 300);
  });
}

// Temporarily removed export button sensitivity fix
// Export the export button sensitivity fix
/* 
export function fixExportButtonSensitivity() {
  if (!isMobileDevice()) return;

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
          import("./modules/ui.js").then((uiModule) => {
            if (uiModule.handleExport) {
              uiModule.handleExport();
            }
          });
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
*/
