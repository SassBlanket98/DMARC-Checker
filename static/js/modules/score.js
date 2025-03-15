// score.js - Score visualization and updating

// Update the overview dashboard with score data
export function updateOverviewDashboard(records) {
  // Check if ScoreMethodology is available
  if (!window.ScoreMethodology) {
    console.error("Score methodology not loaded! Check your script includes.");

    // Import toast module to show warning
    import("./toast.js").then((module) => {
      module.showToast(
        "Error loading score methodology. Some features may be limited.",
        "warning"
      );
    });
    return;
  }

  try {
    // Calculate the authentication score
    const scoreData = window.ScoreMethodology.calculateAuthScore(records);
    console.log("Score data calculated:", scoreData);

    // Update the score circle with CSS variable
    const scoreCircle = document.querySelector(".score-circle");
    const scoreValue = document.querySelector(".score-value");

    if (scoreCircle && scoreValue) {
      // Update the score percentage using CSS variable
      scoreCircle.style.setProperty(
        "--score-percent",
        `${scoreData.overallScore}%`
      );
      scoreValue.textContent = `${scoreData.overallScore}%`;

      // Add the letter grade
      if (!document.querySelector(".letter-grade")) {
        const letterGrade = document.createElement("div");
        letterGrade.className = "letter-grade";
        letterGrade.textContent = `Grade ${scoreData.letterGrade}`;
        scoreValue.appendChild(letterGrade);
      } else {
        document.querySelector(
          ".letter-grade"
        ).textContent = `Grade ${scoreData.letterGrade}`;
      }

      // Add the letter grade indicator
      if (!document.querySelector(".score-letter")) {
        const letterIndicator = document.createElement("div");
        letterIndicator.className = `score-letter score-letter-${scoreData.letterGrade}`;
        letterIndicator.textContent = scoreData.letterGrade;
        document.querySelector(".score-container").appendChild(letterIndicator);
      } else {
        const letterIndicator = document.querySelector(".score-letter");
        letterIndicator.className = `score-letter score-letter-${scoreData.letterGrade}`;
        letterIndicator.textContent = scoreData.letterGrade;
      }
    }

    // Update the individual component indicators
    const componentScores = scoreData.componentScores;

    // Update each component in the score details
    Object.entries(componentScores).forEach(([component, data]) => {
      const componentItem = document.querySelector(
        `.score-details .score-item:nth-child(${getComponentIndex(
          component
        )}) .score-item-value`
      );

      if (componentItem) {
        if (data.status === "success") {
          componentItem.innerHTML = '<i class="fas fa-check-circle"></i>';
          componentItem.className = "score-item-value success";
        } else {
          componentItem.innerHTML =
            '<i class="fas fa-exclamation-triangle"></i>';
          componentItem.className = "score-item-value error";
        }
      }
    });

    // Add a "View Score Details" button
    if (!document.getElementById("view-score-details")) {
      const detailsButton = document.createElement("button");
      detailsButton.id = "view-score-details";
      detailsButton.className = "score-details-button";
      detailsButton.innerHTML =
        '<i class="fas fa-chart-bar"></i> View Detailed Score Breakdown';

      // Add click event listener to open score details modal
      detailsButton.addEventListener("click", () => {
        // Import and use the modal module
        import("./modals.js").then((module) => {
          module.openScoreDetailsModal(scoreData);
        });
      });

      // Append after the score label
      const scoreLabel = document.querySelector(".score-label");
      if (scoreLabel) {
        scoreLabel.after(detailsButton);
      }
    }
  } catch (error) {
    console.error("Error calculating score:", error);

    // Import toast module to show error
    import("./toast.js").then((module) => {
      module.showToast("Error calculating authentication score", "error");
    });
  }
}

// Helper function to get the component index in the score details section
function getComponentIndex(component) {
  const componentOrder = { dmarc: 1, spf: 2, dkim: 3, dns: 4 };
  return componentOrder[component] || 1;
}
