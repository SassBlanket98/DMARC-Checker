// navigation.js - Navigation toggle functionality

// Initialize navigation dropdown
export function initNavigation() {
  const navToggle = document.getElementById("nav-toggle");
  const dropdownMenu = document.getElementById("nav-dropdown-menu");

  if (!navToggle || !dropdownMenu) {
    console.error("Navigation elements not found");
    return;
  }

  // Toggle dropdown when clicking the toggle button
  navToggle.addEventListener("click", function (e) {
    e.preventDefault();
    dropdownMenu.classList.toggle("show");
    navToggle.classList.toggle("active");

    // Set aria-expanded for accessibility
    const isExpanded = dropdownMenu.classList.contains("show");
    navToggle.setAttribute("aria-expanded", isExpanded);
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function (e) {
    if (!navToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove("show");
      navToggle.classList.remove("active");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  // Support keyboard navigation - close with escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && dropdownMenu.classList.contains("show")) {
      dropdownMenu.classList.remove("show");
      navToggle.classList.remove("active");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  // Set current page as active
  setActiveNavItem();
}

// Set the active navigation item based on current URL
function setActiveNavItem() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll(".dropdown-menu a");

  navLinks.forEach((link) => {
    link.classList.remove("active");

    // Get the href value of the link
    const linkPath = link.getAttribute("href");

    // Check if the link path matches the current path
    if (
      linkPath === currentPath ||
      (currentPath === "/" && linkPath === "/") ||
      (linkPath !== "/" && currentPath.startsWith(linkPath))
    ) {
      link.classList.add("active");
    }
  });
}

// Add resize handler for mobile adjustments
export function setupNavResizeHandler() {
  const dropdownMenu = document.getElementById("nav-dropdown-menu");
  const navToggle = document.getElementById("nav-toggle");

  if (!dropdownMenu || !navToggle) return;

  window.addEventListener("resize", function () {
    // Reset dropdown when resizing
    dropdownMenu.classList.remove("show");
    navToggle.classList.remove("active");
    navToggle.setAttribute("aria-expanded", "false");
  });
}
