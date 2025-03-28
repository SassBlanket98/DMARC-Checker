// score_methodology.js
// This module implements the email authentication score calculation methodology

/**
 * Calculate the email authentication score based on DMARC, SPF, DKIM, DNS records, and Domain Reputation
 * @param {Object} records - Object containing the authentication records
 * @returns {Object} - Score data with overall percentage and individual scores
 */
function calculateAuthScore(records) {
  // Initialize scores for each component
  const scores = {
    dmarc: { score: 0, maxScore: 30, status: "error", details: [] },
    spf: { score: 0, maxScore: 25, status: "error", details: [] },
    dkim: { score: 0, maxScore: 20, status: "error", details: [] },
    dns: { score: 0, maxScore: 10, status: "error", details: [] },
    reputation: { score: 0, maxScore: 15, status: "error", details: [] }, // Added reputation component
  };

  // Process each record type
  records.forEach((record) => {
    const recordType = record.title.toLowerCase();

    // Skip if record type is not in our scoring system
    if (!scores[recordType]) return;

    // Initial check if record exists and has no error
    if (record.status === "success") {
      // Set base score for having a valid record
      scores[recordType].status = "success";

      // Apply record-specific scoring logic
      switch (recordType) {
        case "dmarc":
          scoreDmarc(record, scores.dmarc);
          break;
        case "spf":
          scoreSpf(record, scores.spf);
          break;
        case "dkim":
          scoreDkim(record, scores.dkim);
          break;
        case "dns":
          scoreDns(record, scores.dns);
          break;
        case "reputation":
          scoreReputation(record, scores.reputation);
          break;
      }
    } else {
      // Record has an error or doesn't exist
      scores[recordType].details.push(
        `No valid ${recordType.toUpperCase()} record found`
      );
    }
  });

  // Calculate overall score
  const totalScore = Object.values(scores).reduce(
    (sum, item) => sum + item.score,
    0
  );
  const maxPossibleScore = Object.values(scores).reduce(
    (sum, item) => sum + item.maxScore,
    0
  );
  const overallPercentage = Math.round((totalScore / maxPossibleScore) * 100);

  // Generate letter grade based on score percentage
  const letterGrade = getLetterGrade(overallPercentage);

  return {
    overallScore: overallPercentage,
    letterGrade,
    componentScores: scores,
    recommendations: generateRecommendations(scores),
  };
}

/**
 * Score DMARC record (30 points max)
 * @param {Object} record - DMARC record data
 * @param {Object} scoreObj - Score object to update
 */
function scoreDmarc(record, scoreObj) {
  const parsedRecord = record.parsed_record || {};

  // Base points for having a DMARC record (15 points)
  scoreObj.score += 15;
  scoreObj.details.push("DMARC record is present (+15)");

  // Policy points (up to 15 additional points)
  if (parsedRecord.p) {
    switch (parsedRecord.p) {
      case "reject":
        scoreObj.score += 15;
        scoreObj.details.push("DMARC policy is set to reject (+15)");
        break;
      case "quarantine":
        scoreObj.score += 10;
        scoreObj.details.push("DMARC policy is set to quarantine (+10)");
        break;
      case "none":
        scoreObj.score += 5;
        scoreObj.details.push("DMARC policy is set to none (+5)");
        break;
    }
  }

  // Reporting points (5 points)
  if (parsedRecord.rua) {
    scoreObj.score += 5;
    scoreObj.details.push("DMARC aggregate reporting is configured (rua) (+5)");
  } else {
    scoreObj.details.push("DMARC is missing aggregate reporting (rua) (0)");
  }
}

/**
 * Score SPF record (25 points max)
 * @param {Object} record - SPF record data
 * @param {Object} scoreObj - Score object to update
 */
function scoreSpf(record, scoreObj) {
  const parsedRecord = record.parsed_record || {};
  const spfRecord = record.value?.spf_record || "";

  // Base points for having an SPF record (15 points)
  scoreObj.score += 15;
  scoreObj.details.push("SPF record is present (+15)");

  // All mechanism points (up to 10 points)
  if (parsedRecord["-all"]) {
    scoreObj.score += 10;
    scoreObj.details.push("SPF has hard fail mechanism (-all) (+10)");
  } else if (parsedRecord["~all"]) {
    scoreObj.score += 5;
    scoreObj.details.push("SPF has soft fail mechanism (~all) (+5)");
  } else if (parsedRecord["?all"]) {
    scoreObj.score += 2;
    scoreObj.details.push("SPF has neutral mechanism (?all) (+2)");
  } else if (parsedRecord["+all"]) {
    scoreObj.details.push(
      "SPF has pass mechanism (+all) which is a security risk (0)"
    );
  } else {
    scoreObj.details.push('SPF is missing an "all" mechanism (0)');
  }

  // SPF complexity and correctness (5 points)
  if (spfRecord) {
    // Check if SPF record includes important mechanisms
    const hasImportantMechanisms =
      parsedRecord.include ||
      parsedRecord.a ||
      parsedRecord.mx ||
      parsedRecord.ip4 ||
      parsedRecord.ip6;

    if (hasImportantMechanisms) {
      scoreObj.score += 5;
      scoreObj.details.push("SPF includes required sending sources (+5)");
    } else {
      scoreObj.details.push("SPF may be missing important sending sources (0)");
    }
  }
}

/**
 * Score DKIM record (20 points max)
 * @param {Object} record - DKIM record data
 * @param {Object} scoreObj - Score object to update
 */
function scoreDkim(record, scoreObj) {
  // Check if any valid DKIM records were found
  let validSelectors = [];
  let total = 0;

  if (!record.value.error) {
    for (const [selector, data] of Object.entries(record.value)) {
      if (
        selector !== "overall_status" &&
        selector !== "recommendations" &&
        data.status === "success" &&
        data.dkim_records &&
        data.dkim_records.length > 0
      ) {
        validSelectors.push(selector);
        total++;
      }
    }
  }

  // Base points for having at least one DKIM record (15 points)
  if (validSelectors.length > 0) {
    scoreObj.score += 15;
    scoreObj.details.push(
      "DKIM is configured with at least one selector (+15)"
    );

    // Bonus points for multiple selectors (up to 5 additional points)
    if (validSelectors.length >= 2) {
      const additionalPoints = Math.min(5, validSelectors.length * 2);
      scoreObj.score += additionalPoints;
      scoreObj.details.push(
        `Multiple DKIM selectors configured (${validSelectors.length}) (+${additionalPoints})`
      );
    }
  } else {
    scoreObj.details.push("No valid DKIM selectors found (0)");
  }
}

/**
 * Score DNS record configuration (10 points max)
 * @param {Object} record - DNS record data
 * @param {Object} scoreObj - Score object to update
 */
function scoreDns(record, scoreObj) {
  const parsedRecord = record.parsed_record || {};

  // MX records check (5 points)
  if (parsedRecord.MX && parsedRecord.MX.length > 0) {
    scoreObj.score += 5;
    scoreObj.details.push("MX records properly configured (+5)");
  } else {
    scoreObj.details.push("MX records missing or not properly configured (0)");
  }

  // A/AAAA records check (3 points)
  if (
    (parsedRecord.A && parsedRecord.A.length > 0) ||
    (parsedRecord.AAAA && parsedRecord.AAAA.length > 0)
  ) {
    scoreObj.score += 3;
    scoreObj.details.push("A/AAAA records properly configured (+3)");
  } else {
    scoreObj.details.push("A/AAAA records missing (0)");
  }

  // TXT records check (2 points)
  if (parsedRecord.TXT && parsedRecord.TXT.length > 0) {
    scoreObj.score += 2;
    scoreObj.details.push("TXT records properly configured (+2)");
  } else {
    scoreObj.details.push("TXT records missing (0)");
  }
}

/**
 * Score domain reputation (15 points max)
 * @param {Object} record - Reputation record data
 * @param {Object} scoreObj - Score object to update
 */
function scoreReputation(record, scoreObj) {
  const reputationData = record.parsed_record || {};

  // Get reputation score from the backend (0-100)
  const reputationScore = reputationData.reputation_score || 0;

  // Calculate points based on reputation score (max 15 points)
  let points = 0;

  if (reputationScore >= 90) {
    // Excellent reputation
    points = 15;
    scoreObj.details.push("Domain has excellent reputation (+15)");
  } else if (reputationScore >= 70) {
    // Good reputation
    points = 12;
    scoreObj.details.push("Domain has good reputation (+12)");
  } else if (reputationScore >= 50) {
    // Fair reputation
    points = 8;
    scoreObj.details.push("Domain has fair reputation (+8)");
  } else if (reputationScore >= 30) {
    // Poor reputation
    points = 4;
    scoreObj.details.push("Domain has poor reputation (+4)");
  } else {
    // Very poor reputation
    points = 0;
    scoreObj.details.push("Domain has very poor reputation (+0)");
  }

  // Check if domain is blacklisted
  if (reputationData.blacklisted) {
    const blacklistCount = reputationData.blacklist_count || 0;
    scoreObj.details.push(`Domain is on ${blacklistCount} blacklist(s)`);

    // If blacklisted, reduce the score based on how many blacklists
    if (blacklistCount > 3) {
      // Severe blacklisting issue
      points = Math.max(0, points - 12);
    } else {
      // Less severe blacklisting
      points = Math.max(0, points - 8);
    }
  } else {
    scoreObj.details.push("Domain is not on any checked blacklists (+5)");
    // Add bonus points for not being blacklisted at all
    points = Math.min(15, points + 5);
  }

  scoreObj.score = points;
}

/**
 * Get letter grade based on score percentage
 * @param {number} percentage - Score percentage
 * @returns {string} - Letter grade
 */
function getLetterGrade(percentage) {
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
}

/**
 * Generate prioritized recommendations based on scores
 * @param {Object} scores - Component scores
 * @returns {Array} - List of recommendations
 */
function generateRecommendations(scores) {
  const recommendations = [];

  // DMARC recommendations
  if (scores.dmarc.status === "error") {
    recommendations.push({
      priority: "high",
      title: "Configure DMARC",
      description:
        "Add a DMARC record to improve email authentication and prevent spoofing.",
    });
  } else if (scores.dmarc.score < 20) {
    const policy = findMissingPolicy(scores.dmarc.details);
    if (policy === "none") {
      recommendations.push({
        priority: "medium",
        title: "Strengthen DMARC Policy",
        description:
          'Your DMARC policy is set to "none". Consider upgrading to quarantine or reject once you\'ve verified legitimate emails pass authentication checks.',
      });
    }
  }

  // SPF recommendations
  if (scores.spf.status === "error") {
    recommendations.push({
      priority: "high",
      title: "Configure SPF",
      description:
        "Add an SPF record to specify which mail servers are authorized to send email on behalf of your domain.",
    });
  } else if (scores.spf.score < 15) {
    recommendations.push({
      priority: "medium",
      title: "Strengthen SPF Configuration",
      description:
        'Your SPF record could be improved. Consider adding a strict "-all" mechanism to prevent unauthorized sources from sending email as your domain.',
    });
  }

  // DKIM recommendations
  if (scores.dkim.status === "error") {
    recommendations.push({
      priority: "high",
      title: "Configure DKIM",
      description:
        "Set up DKIM signing to cryptographically verify emails sent from your domain.",
    });
  }

  // DNS recommendations
  if (scores.dns.score < 5) {
    recommendations.push({
      priority: "medium",
      title: "Review DNS Configuration",
      description:
        "Your domain's DNS configuration could be improved. Ensure MX, A, and TXT records are properly configured.",
    });
  }

  // Reputation recommendations
  if (scores.reputation.status === "error") {
    recommendations.push({
      priority: "high",
      title: "Check Domain Reputation",
      description:
        "Unable to check domain reputation. This is important for email deliverability.",
    });
  } else if (scores.reputation.score < 8) {
    recommendations.push({
      priority: "high",
      title: "Address Domain Reputation Issues",
      description:
        "Your domain has reputation issues that could affect email deliverability. Check if your domain is on email blacklists and take steps to improve your reputation.",
    });
  }

  return recommendations;
}

/**
 * Helper function to determine DMARC policy from score details
 * @param {Array} details - Score details
 * @returns {string} - DMARC policy or null
 */
function findMissingPolicy(details) {
  for (const detail of details) {
    if (detail.includes("policy is set to none")) {
      return "none";
    }
  }
  return null;
}

// Export functions for use in main application
window.ScoreMethodology = {
  calculateAuthScore,
  getLetterGrade,
  generateRecommendations,
};
