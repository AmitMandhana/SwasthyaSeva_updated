const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initActiveTokensSQL = require('../init/initActiveTokens');

/**
 * Remove a token by its hash (logout).
 */
async function deleteActiveTokenByHash(token_hash) {
  return withTableGuard(async () => {
    const { error } = await supabase
      .from('active_tokens')
      .delete()
      .eq('token_hash', token_hash);
    if (error) throw error;
  }, initActiveTokensSQL);
}

/**
 * Remove a token by its ID (eviction).
 */
async function deleteActiveTokenById(token_id) {
  return withTableGuard(async () => {
    const { error } = await supabase
      .from('active_tokens')
      .delete()
      .eq('token_id', token_id);
    if (error) throw error;
  }, initActiveTokensSQL);
}

/**
 * Remove all expired tokens (cleanup).
 */
async function deleteExpiredTokens() {
  return withTableGuard(async () => {
    const { error } = await supabase
      .from('active_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString());
    if (error) throw error;
  }, initActiveTokensSQL);
}

module.exports = { deleteActiveTokenByHash, deleteActiveTokenById, deleteExpiredTokens };
