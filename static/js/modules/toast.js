// toast.js - Toast notification system

// Show toast notification
export function showToast(message, type = "info", duration = 5000) {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  // Create the toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  // Set icon based on type
  let icon;
  switch (type) {
    case "error":
      icon = "exclamation-circle";
      break;
    case "warning":
      icon = "exclamation-triangle";
      break;
    case "success":
      icon = "check-circle";
      break;
    default:
      icon = "info-circle";
  }

  // Create toast content
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas fa-${icon}"></i>
    </div>
    <div class="toast-content">${message}</div>
    <button class="toast-close">
      <i class="fas fa-times"></i>
    </button>
  `;

  // Add to container
  toastContainer.appendChild(toast);

  // Add close button functionality
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.classList.add("toast-hiding");
    setTimeout(() => {
      toast.remove();
    }, 300); // Match the CSS transition duration
  });

  // Auto-remove after duration
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add("toast-hiding");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }
  }, duration);

  // Show toast with animation
  setTimeout(() => {
    toast.classList.add("toast-visible");
  }, 10);
}
