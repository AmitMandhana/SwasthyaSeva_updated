const username = require("../fields/username");

// Simple non-empty string validator for login password (no complexity rules)
const loginPassword = {
  normalize: (v) => v,
  validate: (v) => {
    if (typeof v !== "string" || !v) return "Password is required";
    return null;
  },
};

module.exports = {
  username: { required: true, ...username },
  password: { required: true, ...loginPassword },
};
