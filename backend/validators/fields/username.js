const maxLength = 50;
const minLength = 3;

function normalize(value) {
  if (typeof value !== "string") return value;
  return value.trim();
}

function validate(value) {
  if (typeof value !== "string" || !value) return "Must be a non-empty string";
  if (value.length < minLength) return `Must be at least ${minLength} characters long`;
  if (value.length > maxLength) return `Must be at most ${maxLength} characters long`;
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) return "Must contain only letters, numbers, dots, underscores, or hyphens";
  return null;
}

module.exports = { normalize, validate };
