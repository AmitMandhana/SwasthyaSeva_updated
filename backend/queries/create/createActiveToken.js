const crypto = require('crypto');
const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initActiveTokensSQL = require('../init/initActiveTokens');

/**
 * Hash a raw JWT to store in the database (never store raw tokens).
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Register a new active token session.
 * @param {{ token: string, role: string, user_id: number, ip_address?: string, expires_at: Date }} entry
 */
async function createActiveToken({ token, role, user_id, ip_address, expires_at }) {
  const token_hash = hashToken(token);
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('active_tokens')
      .insert({ token_hash, role, user_id, ip_address, expires_at: expires_at.toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, initActiveTokensSQL);
}

module.exports = { createActiveToken, hashToken };
