// scoreMethodologyWrapper.js
export function initScoreMethodology() {
  // Call whatever initialization function exists in the global scope
  // or just return if it's already handled by the script loading
  if (window.ScoreMethodology) {
    console.log("Score methodology module loaded");
    return true;
  }
  return false;
}
