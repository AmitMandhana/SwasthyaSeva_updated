const VALID_FORMATS = ['GEN_MED', 'GEN_SURG', 'ENT'];

function normalize(value) {
  if (typeof value !== "string") return value;
  return value.trim().toUpperCase();
}

function validate(value) {
  if (typeof value !== "string" || !value) return "Must be a non-empty string";
  if (!VALID_FORMATS.includes(value)) return `Must be one of: ${VALID_FORMATS.join(', ')}`;
  return null;
}

module.exports = { normalize, validate, VALID_FORMATS };
