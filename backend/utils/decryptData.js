const { decrypt } = require('./pii');

function decryptData(schema, data) {
  if (!data) return data;
  
  const decryptedData = { ...data };
  
  for (const [field, config] of Object.entries(schema)) {
    if (config.isPII && decryptedData[field]) {
      try {
        decryptedData[field] = decrypt(decryptedData[field]);
      } catch (error) {
        console.error(`Error decrypting field ${field}:`, error.message);
        // Keep encrypted value if decryption fails
      }
    }
  }
  
  return decryptedData;
}

module.exports = decryptData;
