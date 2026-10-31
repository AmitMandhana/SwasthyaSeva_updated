/**
 * DDL for the active_tokens table.
 * Tracks active JWT sessions per user to enforce device limits.
 */
const initActiveTokensSQL = `
CREATE TABLE IF NOT EXISTS active_tokens (
    token_id SERIAL PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    role TEXT NOT NULL,
    user_id INT NOT NULL,
    ip_address TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_active_tokens_role_user ON active_tokens(role, user_id);
CREATE INDEX IF NOT EXISTS idx_active_tokens_expires ON active_tokens(expires_at);
`;

module.exports = initActiveTokensSQL;
