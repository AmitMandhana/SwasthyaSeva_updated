const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initActiveTokensSQL = require('../init/initActiveTokens');

/**
 * Get all active (non-expired) tokens for a given role + user_id.
 */
async function getActiveTokensByUser(role, user_id) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('active_tokens')
      .select('*')
      .eq('role', role)
      .eq('user_id', user_id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }, initActiveTokensSQL);
}

/**
 * Check if a token hash exists and is not expired.
 */
async function isTokenActive(token_hash) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('active_tokens')
      .select('token_id')
      .eq('token_hash', token_hash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }, initActiveTokensSQL);
}

module.exports = { getActiveTokensByUser, isTokenActive };
