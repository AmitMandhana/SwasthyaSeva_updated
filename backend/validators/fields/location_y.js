function normalize(value) {
  if (typeof value === "string") value = Number(value);
  if (typeof value !== "number") return value;
  return Math.round((value + Number.EPSILON) * 1000000) / 1000000;
}

function validate(value) {
  if (typeof value !== "number") return "Must be a floating point number";
  if (!Number.isFinite(value)) return "Must be a finite number";
  if (value < -90 || value > 90) return "Must be between -90 and 90";
  return null;
}

module.exports = { normalize, validate };
