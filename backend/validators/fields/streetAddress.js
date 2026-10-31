const maxLength = 40;

function normalize(value) {
  if (typeof value !== "string") return null;
  return value.trim().replace(/\s+/g, ' ');
}

function validate(value) {
  if (typeof value !== "string" || !value) return "Must be a non-empty string";
  if (value.length > maxLength) return `Must be at most ${maxLength} characters long`;
  if (!/^[a-zA-Z0-9 ,.-]*$/.test(value)) return "Must not contain special characters except , . -";
  return null;
}

module.exports = { isPII: true, normalize, validate };
