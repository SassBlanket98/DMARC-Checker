// history.js - History management functions

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
    import("./api.js").then((module) => {
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
        import("./api.js").then((module) => {
          module.checkRecord();
        });
      });

      historyList.appendChild(historyItem);
    });
  } catch (e) {
    console.error("Failed to load history from localStorage:", e);
  }
}
