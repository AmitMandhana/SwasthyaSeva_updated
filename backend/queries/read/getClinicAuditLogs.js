const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initClinicAuditLogsSQL = require('../init/initClinicAuditLogs');

/**
 * Fetch clinic audit logs with filters.
 * Clinic entity sees all logs for their clinic.
 * Clinic admin sees only their own logs.
 */
async function getClinicAuditLogs({ clinicId, actorRole, actorId, action, excludeAction, limit = 50, offset = 0 }) {
  return withTableGuard(async () => {
    let query = supabase
      .from('clinic_audit_logs')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId);

    // Scope to specific actor (for clinic_admin role-based filtering)
    if (actorRole) query = query.eq('actor_role', actorRole);
    if (actorId) query = query.eq('actor_id', actorId);
    if (action) query = query.eq('action', action);
    if (excludeAction) query = query.not('action', 'in', `(${excludeAction})`);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { logs: data || [], total: count || 0 };
  }, initClinicAuditLogsSQL);
}

module.exports = { getClinicAuditLogs };
