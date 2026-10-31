const { getClinicAuditLogs } = require('../../queries/read/getClinicAuditLogs');

async function listClinicAuditLogs(req, res) {
  try {
    const { action, exclude_action, limit, offset } = req.query;

    const opts = {
      clinicId: req.clinicId,
      limit: limit ? Math.min(Number(limit), 100) : 50,
      offset: offset ? Number(offset) : 0,
    };

    if (action) opts.action = action;
    if (exclude_action) opts.excludeAction = exclude_action;

    // Clinic admin can only see their own logs
    if (req.role === 'clinic_admin') {
      opts.actorRole = 'clinic_admin';
      opts.actorId = req.clinicAdminId;
    }

    const result = await getClinicAuditLogs(opts);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[ClinicAuditLogs] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { listClinicAuditLogs };
