function normalize(value) {
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  }
  return value;
}

function validate(value) {
  if (typeof value !== "number") return "Must be a number";
  if (!Number.isInteger(value)) return "Must be an integer";
  if (value < 0 || value > 47) return "Must be between 0 and 47";
  return null;
}

module.exports = { normalize, validate };
