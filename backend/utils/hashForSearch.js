const crypto = require('crypto');

function hashForSearch(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

module.exports = hashForSearch;
