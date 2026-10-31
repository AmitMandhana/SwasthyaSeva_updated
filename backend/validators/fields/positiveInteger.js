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
  if (value < 1) return "Must be a positive integer (greater than 0)";
  return null;
}

module.exports = { normalize, validate };
