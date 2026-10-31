const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initAuditLogsSQL = require('../init/initAuditLogs');

/**
 * Returns audit logs with optional filters.
 * @param {{ limit?: number, offset?: number, admin_id?: number, entity_type?: string, action?: string, endpoint?: string, exclude_action?: string }} [opts]
 */
async function getAuditLogs({ limit = 100, offset = 0, admin_id, entity_type, action, endpoint, exclude_action } = {}) {
  return withTableGuard(async () => {
    let query = supabase.from('audit_logs').select('*', { count: 'exact' });

    if (admin_id) query = query.eq('admin_id', admin_id);
    if (entity_type) query = query.eq('entity_type', entity_type);
    if (action) query = query.ilike('action', `%${action}%`);
    if (endpoint) query = query.ilike('endpoint', `%${endpoint}%`);
    if (exclude_action) query = query.neq('action', exclude_action);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { logs: data || [], total: count ?? 0 };
  }, initAuditLogsSQL);
}

module.exports = { getAuditLogs };
