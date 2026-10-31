const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initClinicAuditLogsSQL = require('../init/initClinicAuditLogs');

/**
 * Insert a clinic audit log entry.
 */
async function createClinicAuditLog(entry) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('clinic_audit_logs')
      .insert(entry)
      .select()
      .single();
    if (error) throw error;
    return data;
  }, initClinicAuditLogsSQL);
}

module.exports = { createClinicAuditLog };
