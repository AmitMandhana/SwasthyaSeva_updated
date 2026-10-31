const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = "14d";

if (!JWT_SECRET) {
  throw new Error("❌ JWT_SECRET environment variable is required");
}

function generateToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    ...options,
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function extractUserId(token) {
  const payload = verifyToken(token);
  return payload?.user_id ?? null;
}

module.exports = {
  generateToken,
  verifyToken,
  extractUserId,
};
