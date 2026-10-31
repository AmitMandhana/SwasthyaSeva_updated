function normalize(value) {
  if (typeof value !== "number") value = String(value);
  if (typeof value !== "string") return value;
  value = value.replace(/\s/g, '');
  if(value.startsWith("+")) return value;
  return "+91" + value;
}

function validate(value) {
  if (typeof value !== "string") return "Invalid Type";
  if (!value.startsWith('+91')) return "Must start with +91";
  if (!/^\d{10}$/.test(value.substring(3))) return "Must have exactly 10 digits after +91";
  return null;
}

module.exports = { isPII: true, normalize, validate };
