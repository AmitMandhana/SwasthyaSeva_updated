const maxLength = 100;

function normalize(value) {
  if (typeof value !== "string") return value;
  return value.trim().toLowerCase();
}

function validate(value) {
  if (typeof value !== "string" || !value) return "Must be a non-empty string";
  if (value.length > maxLength) return `Must be at most ${maxLength} characters long`;
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) return "Invalid email format";
  const domain = value?.split("@")[1];
  const domainParts = domain?.split(".");
  if (domainParts.length > 5) return "Subdomain depth exceeds limit";
  // if (blockedDomains.includes(domain)) return "Email domain is blocked"; // Improvement needed
  return null;
}

module.exports = { isPII: true, normalize, validate };
