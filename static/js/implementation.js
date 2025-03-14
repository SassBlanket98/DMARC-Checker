// Add this to the bottom of script.js or create a new script file to be included in index.html

/**
 * Score Methodology Implementation
 * This script handles loading the score methodology module and integrating it with the application
 */

// Load the score methodology script
function loadScoreMethodologyScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/static/js/score_methodology.js";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load score methodology script"));
    document.head.appendChild(script);
  });
}

// Initialize the score methodology module
async function initScoreMethodology() {
  try {
    await loadScoreMethodologyScript();
    console.log("Score methodology module loaded successfully");

    // Add score details button to existing domains
    if (
      document.querySelector(".score-container") &&
      !document.getElementById("view-score-details")
    ) {
      const domain = domainInput.value.trim();
      if (domain) {
        checkRecord(); // Re-run the check to update the score display
      }
    }
  } catch (error) {
    console.error("Error initializing score methodology:", error);
    showToast(
      "Error loading score methodology module. Some features may be limited.",
      "warning"
    );
  }
}

// Update the document ready event listener to initialize the score methodology
document.addEventListener("DOMContentLoaded", () => {
  initApp();
  initScoreMethodology();
});

// Update the help modal to add the methodology section
function enhanceHelpModal() {
  // Check if the help modal exists
  const helpModal = document.getElementById("help-modal");
  if (!helpModal) return;

  // Check if methodology section already exists
  const existingMethodology = helpModal.querySelector(
    ".modal-section:nth-child(5)"
  );
  if (existingMethodology) return;

  // Create the methodology section
  const methodologySection = document.createElement("div");
  methodologySection.className = "modal-section";
  methodologySection.innerHTML = `
    <h3>Email Authentication Score Methodology</h3>
    <p>
      The Email Authentication Score is a comprehensive rating of your domain's email security configuration.
      The score is calculated based on four key components with weighted importance:
    </p>
    
    <div class="methodology-breakdown">
      <div class="methodology-component">
        <h4>DMARC (35%)</h4>
        <ul>
          <li>Having a DMARC record: 15 points</li>
          <li>Policy strength:
            <ul>
              <li>Reject (p=reject): 15 points</li>
              <li>Quarantine (p=quarantine): 10 points</li>
              <li>None (p=none): 5 points</li>
            </ul>
          </li>
          <li>Aggregate reporting (rua tag): 5 points</li>
        </ul>
      </div>
      
      <div class="methodology-component">
        <h4>SPF (30%)</h4>
        <ul>
          <li>Having an SPF record: 15 points</li>
          <li>Policy strength:
            <ul>
              <li>Hard fail (-all): 10 points</li>
              <li>Soft fail (~all): 5 points</li>
              <li>Neutral (?all): 2 points</li>
              <li>Pass (+all): 0 points (security risk)</li>
            </ul>
          </li>
          <li>Including required sending sources: 5 points</li>
        </ul>
      </div>
      
      <div class="methodology-component">
        <h4>DKIM (25%)</h4>
        <ul>
          <li>Having at least one valid DKIM selector: 15 points</li>
          <li>Multiple valid DKIM selectors: up to 10 additional points</li>
        </ul>
      </div>
      
      <div class="methodology-component">
        <h4>DNS Configuration (10%)</h4>
        <ul>
          <li>MX records properly configured: 5 points</li>
          <li>A/AAAA records properly configured: 3 points</li>
          <li>TXT records properly configured: 2 points</li>
        </ul>
      </div>
    </div>
    
    <h4>Letter Grade Interpretation</h4>
    <ul>
      <li><strong>A (90-100%)</strong>: Excellent protection. Your domain has strong email authentication.</li>
      <li><strong>B (80-89%)</strong>: Good protection with minor improvements possible.</li>
      <li><strong>C (70-79%)</strong>: Moderate protection with several improvements recommended.</li>
      <li><strong>D (60-69%)</strong>: Minimal protection with significant improvements needed.</li>
      <li><strong>F (0-59%)</strong>: Inadequate protection. Your domain is vulnerable to email spoofing.</li>
    </ul>
    
    <p class="note">
      <i class="fas fa-info-circle"></i> Note: This scoring system prioritizes security best practices and 
      follows industry recommendations from M3AAWG, NIST, and the DMARC.org organization.
    </p>
  `;

  // Add the methodology section to the modal body
  const modalBody = helpModal.querySelector(".modal-body");
  if (modalBody) {
    modalBody.appendChild(methodologySection);
  }
}

// Call enhanceHelpModal when the help link is clicked
document.getElementById("help-link").addEventListener("click", () => {
  enhanceHelpModal();
});
