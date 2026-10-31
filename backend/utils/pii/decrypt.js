const crypto = require('crypto');
const { ALGORITHM, IV_LENGTH, SALT_LENGTH, TAG_LENGTH, KEY_LENGTH, PBKDF2_ITERATIONS } = require('./config');

function decrypt(encryptedData) {
  if (!process.env.PII_SECRET) {
    throw new Error('PII_SECRET is not defined');
  }

  const buffer = Buffer.from(encryptedData, 'base64');
  
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  const key = crypto.pbkdf2Sync(process.env.PII_SECRET, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
}

module.exports = decrypt;
