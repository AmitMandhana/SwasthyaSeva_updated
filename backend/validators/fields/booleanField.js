function normalize(value) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return value;
}

function validate(value) {
  if (typeof value !== "boolean") return "Must be a boolean";
  return null;
}

module.exports = { normalize, validate };
