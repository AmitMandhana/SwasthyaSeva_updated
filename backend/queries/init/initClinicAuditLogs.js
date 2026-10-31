const initClinicAuditLogsSQL = `
CREATE TABLE IF NOT EXISTS clinic_audit_logs (
    log_id SERIAL PRIMARY KEY,
    clinic_id INT NOT NULL,
    actor_role TEXT NOT NULL,
    actor_id INT NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    endpoint TEXT NOT NULL,
    data JSONB,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_clinic_audit_clinic ON clinic_audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_audit_created ON clinic_audit_logs(created_at DESC);
`;

module.exports = initClinicAuditLogsSQL;
