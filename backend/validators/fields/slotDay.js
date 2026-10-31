const VALID_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function normalize(value) {
  if (typeof value !== "string") return value;
  return value.trim().toUpperCase();
}

function validate(value) {
  if (typeof value !== "string" || !value) return "Must be a non-empty string";
  if (!VALID_DAYS.includes(value)) return `Must be one of: ${VALID_DAYS.join(', ')}`;
  return null;
}

module.exports = { normalize, validate };
