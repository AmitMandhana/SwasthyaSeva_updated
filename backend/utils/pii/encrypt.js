const crypto = require('crypto');
const { ALGORITHM, IV_LENGTH, SALT_LENGTH, TAG_LENGTH, KEY_LENGTH, PBKDF2_ITERATIONS } = require('./config');

function encrypt(text) {
  if (!process.env.PII_SECRET) {
    throw new Error('PII_SECRET is not defined');
  }

  // Convert to string if not already
  const stringValue = String(text);

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(process.env.PII_SECRET, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(stringValue, 'utf8'),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();
  
  const result = Buffer.concat([salt, iv, tag, encrypted]);
  
  return result.toString('base64');
}

module.exports = encrypt;