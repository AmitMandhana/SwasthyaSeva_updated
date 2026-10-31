const { createClinicAuditLog } = require('../queries/create/createClinicAuditLog');

const SENSITIVE_KEYS = ['password', 'password_hash', 'token'];

const ENTITY_MAP = {
  'profile': 'profile',
  'appointments': 'appointment',
  'clinic-admins': 'clinic_admin',
  'analytics': 'analytics',
  'leads': 'lead',
  'audit-logs': 'audit_log',
};

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = { ...obj };
  for (const key of SENSITIVE_KEYS) {
    if (key in copy) copy[key] = '[REDACTED]';
  }
  return copy;
}

function parseRoute(method, url) {
  const path = url.split('?')[0];
  const match = path.match(/\/api\/clinic\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?/);
  if (!match) return null;

  const resource = match[1];
  const seg2 = match[2] || null;
  const seg3 = match[3] || null;

  const entity_type = ENTITY_MAP[resource] || resource;
  const entity_id = seg2 && /^\d+$/.test(seg2) ? seg2 : null;

  let action;
  if (seg3 === 'restore' || seg2 === 'restore') action = 'restore';
  else if (method === 'POST') action = 'create';
  else if (method === 'PATCH') action = 'update';
  else if (method === 'DELETE') action = 'delete';
  else if (method === 'GET' && entity_id) action = 'view';
  else if (method === 'GET') action = 'list';

  return { action, entity_type, entity_id };
}

/**
 * Middleware that logs clinic/clinic-admin actions to clinic_audit_logs.
 * Must run AFTER requireClinicAuth.
 */
function clinicAuditLog(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    if (req.clinicId && res.statusCode >= 200 && res.statusCode < 300) {
      const parsed = parseRoute(req.method, req.originalUrl);
      if (parsed) {
        const endpoint = `${req.method} ${req.originalUrl.split('?')[0]}`;

        let data = null;
        if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
          data = req.body && Object.keys(req.body).length > 0 ? sanitize(req.body) : null;
        } else {
          data = req.query && Object.keys(req.query).length > 0 ? req.query : null;
        }

        let entityId = parsed.entity_id;
        if (parsed.action === 'create' && body && !entityId) {
          if (body.manager) entityId = String(body.manager.clinic_admin_id);
        }

        (async () => {
          try {
            await createClinicAuditLog({
              clinic_id: req.clinicId,
              actor_role: req.role,
              actor_id: req.role === 'clinic' ? req.clinicId : req.clinicAdminId,
              actor_name: req.actorName || 'unknown',
              action: parsed.action,
              entity_type: parsed.entity_type,
              entity_id: entityId,
              endpoint,
              data,
              ip_address: req.ip,
            });
          } catch (err) {
            console.error('[ClinicAuditLog] Failed to write:', err.message);
          }
        })();
      }
    }

    return originalJson(body);
  };

  next();
}

module.exports = { clinicAuditLog };
