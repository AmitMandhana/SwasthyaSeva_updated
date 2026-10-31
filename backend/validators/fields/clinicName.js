const maxLength = 20;

function normalize(value) {
  if (typeof value !== "string") return value;
  return value.trim();
}

function validate(value) {
  if (typeof value !== "string" || !value) return "Must be a non-empty string";
  if (value.length > maxLength) return `Must be at most ${maxLength} characters long`;
  return null;
}

module.exports = { normalize, validate };
