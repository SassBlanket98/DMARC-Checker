// utils.js - Utility functions

// Helper function to get color based on score percentage
export function getScoreColor(score) {
  if (score >= 90) return "#2ecc71"; // A - Green
  if (score >= 80) return "#27ae60"; // B - Darker green
  if (score >= 70) return "#f39c12"; // C - Yellow/orange
  if (score >= 60) return "#e67e22"; // D - Orange
  return "#e74c3c"; // F - Red
}

// Helper function to convert hex color to RGB components
export function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace("#", "");

  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return { r, g, b };
}

// Helper function for debouncing function calls
export function debounce(func, wait) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Format a date for display
export function formatDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }

  return date.toLocaleString();
}

// Create a UUID for unique IDs
export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Check if a string is a valid JSON
export function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}
