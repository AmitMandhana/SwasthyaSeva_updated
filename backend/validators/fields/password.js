function normalize(value) {
  return value;
}

function validate(value) {
  if (typeof value !== "string") return "Must be a string";
  if (value.length < 12) return "Password must be at least 12 characters long";
  if (value.length > 100) return "Password must be at most 100 characters long";
  if (!/[a-z]/.test(value)) return "Must contain lowercase letter";
  if (!/[A-Z]/.test(value)) return "Must contain uppercase letter";
  if (!/[0-9]/.test(value)) return "Must contain a digit";
  if (!/[!@#$%^&*]/.test(value)) return "Must contain a special character";
  return null;
}

module.exports = { normalize, validate };
