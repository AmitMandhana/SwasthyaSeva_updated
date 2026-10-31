const maxLength = 50;

function normalize(value) {
  if (typeof value !== "string") return value;
  return value.trim().toUpperCase();
}

function validate(value) {
  if (typeof value !== "string" || !value) return "Must be a non-empty string";
  if (value.length > maxLength) return `Must be at most ${maxLength} characters long`;
  if (!/^[A-Z0-9_]+$/.test(value)) return "Must contain only uppercase letters, numbers, or underscores";
  return null;
}

module.exports = { normalize, validate };
