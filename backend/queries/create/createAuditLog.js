const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initAuditLogsSQL = require('../init/initAuditLogs');

/**
 * Insert an audit log entry.
 * @param {{ admin_id: number, admin_username: string, action: string, entity_type: string, entity_id?: string, entity_username?: string, endpoint: string, data?: object, ip_address?: string }} entry
 */
async function createAuditLog(entry) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(entry)
      .select()
      .single();
    if (error) throw error;
    return data;
  }, initAuditLogsSQL);
}

module.exports = { createAuditLog };
