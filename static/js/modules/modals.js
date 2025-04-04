// modals.js - Modal and drawer management

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
