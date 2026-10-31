const SENSITIVE_KEYS = new Set([
  'password', 'currentPassword', 'newPassword', 'password_hash',
  'token', 'otp', 'captchaToken', 'turnstileToken',
]);

const MAX_STRING_LENGTH = 1000;
const TRUNCATED_PREVIEW = 200;
const MAX_BODY_SIZE = 10240;

function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const str = JSON.stringify(obj, (key, value) => {
    if (SENSITIVE_KEYS.has(key)) return '[REDACTED]';
    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH)
      return value.slice(0, TRUNCATED_PREVIEW) + '...[truncated]';
    return value;
  });

  if (str.length > MAX_BODY_SIZE)
    return str.slice(0, MAX_BODY_SIZE) + '...[body truncated]';

  return JSON.parse(str);
}

module.exports = { redact, SENSITIVE_KEYS };
