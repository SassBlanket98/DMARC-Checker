// domainValidation.js - Domain validation functions

// Validate domain input
export function validateDomain(domain) {
  if (!domain) {
    return {
      valid: false,
      error: {
        error: "Please enter a domain name",
        error_code: "EMPTY_DOMAIN",
        suggestions: ["Enter a domain name (e.g., example.com)"],
      },
    };
  }

  // Basic domain validation with a regular expression
  const domainRegex =
    /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

  if (!domainRegex.test(domain)) {
    return {
      valid: false,
      error: {
        error: "Invalid domain format",
        error_code: "INVALID_DOMAIN_FORMAT",
        suggestions: [
          "Domain should be in format: example.com",
          "Don't include http:// or www.",
          "Check for typos and special characters",
        ],
      },
    };
  }

  return { valid: true };
}
