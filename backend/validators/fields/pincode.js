function normalize(value) {
  if (typeof value !== "string") return value;
  return value.trim();
}

function validate(value) {
  if (typeof value !== "string" || !value)
    return "Must be a non-empty string";
  if (!/^\d{6}$/.test(value))
    return "Pincode must be a 6-digit number";
  return null;
}

module.exports = { normalize, validate };
