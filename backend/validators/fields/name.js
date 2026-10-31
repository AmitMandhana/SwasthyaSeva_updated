const maxLength = 40;

function normalize(value) {
  if (typeof value !== "string") return value;
  //Convert to title case
  return value.trim().replace(/\s+/g, ' ')
  .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function validate(value) {
  if (typeof value !== "string" || !value) return "Must be a non-empty string";
  if(value.length > maxLength) return `Must be at most ${maxLength} characters long`;
  if(!/^[a-zA-Z ]+$/.test(value)) return "Only alphabetic characters are allowed";
  return null;
}

module.exports = { isPII: true, normalize, validate };
