const COUNTRY_MAP = {
  "in": "India",
  "india": "India",
  "bharat": "India",
  "🇮🇳": "India"
};

const maxLength = 40;

function normalize(value) {
  if (typeof value !== "string") return value;
  const key = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return COUNTRY_MAP[key] || key.replace(/\b\w/g, (char) => char.toUpperCase()); //to Title Case
}

function validate(value) {
  if (typeof value !== "string" || !value)
    return "Must be a non-empty string";
  if (value.length > maxLength)
    return `Must be at most ${maxLength} characters long`;
  if (!/^[a-zA-Z0-9 ]*$/.test(value))
    return "Must contain only letters, numbers, or spaces";
  return null;
}

module.exports = { normalize, validate };