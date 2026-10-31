const { encrypt } = require('../utils/pii');

function isPresent(value) {
  return value !== null && value !== undefined && value !== '';
}

module.exports = function validateWithSchema(schema, rawInput, options = {}) {
  const { encryptPII = true, onlyPresent = false } = options;
  const normalizedData = {};
  const errors = [];

  for (const [field, config] of Object.entries(schema)) {
    const rawValue = rawInput?.[field] ?? null;
    
    // If onlyPresent mode, skip fields not in rawInput
    if (onlyPresent && !(field in (rawInput || {}))) {
      continue;
    }

    const normalized = config.normalize(rawValue);
    if (config.isPII && encryptPII && isPresent(normalized))
      normalizedData[field] = encrypt(normalized);
    else
      normalizedData[field] = normalized;

    if (isPresent(normalized)) {
      // If non-empty → Validation
      const error = config.validate(normalized);
      if (!!error) {
        errors.push({ field, message: error });
      }
      continue;
    }
    
    // If empty → Check if required
    if (config.required) {
      errors.push({ field, message: `${field} is required` });
    }
  }

  return {
    success: errors.length === 0,
    data: normalizedData,
    errors,
  };
}
