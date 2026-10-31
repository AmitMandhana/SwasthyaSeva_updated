const { getPool } = require('../../utils/pool');


/**
 * Appointment trends grouped by date.
 */
async function getAppointmentTrends({ clinicId, dateFrom, dateTo }) {
  const conditions = ['s.clinic_id = $1'];
  const params = [clinicId];
  let idx = 2;

  if (dateFrom) { conditions.push(`a.appointment_date >= $${idx++}`); params.push(dateFrom); }
  if (dateTo) { conditions.push(`a.appointment_date <= $${idx++}`); params.push(dateTo); }

  const sql = `
    SELECT
      a.appointment_date AS date,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE a.appointment_status = 'completed') AS completed,
      COUNT(*) FILTER (WHERE a.appointment_status = 'cancelled') AS cancelled,
      COUNT(*) FILTER (WHERE a.appointment_status = 'missed') AS missed,
      COUNT(*) FILTER (WHERE a.appointment_status = 'pending') AS pending
    FROM appointments a
    JOIN slots s ON a.slot_id = s.slot_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY a.appointment_date
    ORDER BY a.appointment_date ASC
  `;

  const client = await getPool().connect();
  try {
    const { rows } = await client.query(sql, params);
    return rows.map(r => ({
      date: r.date,
      total: parseInt(r.total, 10),
      completed: parseInt(r.completed, 10),
      cancelled: parseInt(r.cancelled, 10),
      missed: parseInt(r.missed, 10),
      pending: parseInt(r.pending, 10),
    }));
  } finally {
    client.release();
  }
}

/**
 * Revenue summary grouped by date.
 */
async function getRevenueSummary({ clinicId, dateFrom, dateTo }) {
  const conditions = ['p.clinic_id = $1'];
  const params = [clinicId];
  let idx = 2;

  if (dateFrom) { conditions.push(`p.advance_date >= $${idx++}`); params.push(dateFrom); }
  if (dateTo) { conditions.push(`p.advance_date <= $${idx++}`); params.push(dateTo); }

  const sql = `
    SELECT
      DATE(p.advance_date) AS date,
      COALESCE(SUM(p.total_amount), 0) AS total_revenue,
      COALESCE(SUM(p.cleared_amount), 0) AS cleared,
      COALESCE(SUM(p.advanced_amount), 0) AS advanced
    FROM payments p
    WHERE ${conditions.join(' AND ')}
    GROUP BY DATE(p.advance_date)
    ORDER BY DATE(p.advance_date) ASC
  `;

  const client = await getPool().connect();
  try {
    const { rows } = await client.query(sql, params);
    return rows.map(r => ({
      date: r.date,
      total_revenue: parseFloat(r.total_revenue),
      cleared: parseFloat(r.cleared),
      advanced: parseFloat(r.advanced),
    }));
  } finally {
    client.release();
  }
}

/**
 * Slot utilization — appointments per doctor for this clinic.
 */
async function getSlotUtilization({ clinicId }) {
  const sql = `
    SELECT
      d.doctor_id,
      d.first_name || ' ' || d.last_name AS doctor_name,
      COUNT(DISTINCT s.slot_id) AS slot_count,
      COUNT(a.appointment_id) AS appointment_count
    FROM slots s
    JOIN doctors d ON s.doctor_id = d.doctor_id
    LEFT JOIN appointments a ON a.slot_id = s.slot_id
    WHERE s.clinic_id = $1 AND s.is_deleted = false
    GROUP BY d.doctor_id, d.first_name, d.last_name
    ORDER BY appointment_count DESC
  `;

  const client = await getPool().connect();
  try {
    const { rows } = await client.query(sql, [clinicId]);
    return rows.map(r => ({
      doctor_id: r.doctor_id,
      doctor_name: r.doctor_name,
      slot_count: parseInt(r.slot_count, 10),
      appointment_count: parseInt(r.appointment_count, 10),
    }));
  } finally {
    client.release();
  }
}

/**
 * Top doctors ranked by appointment count.
 */
async function getTopDoctors({ clinicId, limit = 10 }) {
  const sql = `
    SELECT
      d.doctor_id,
      d.first_name || ' ' || d.last_name AS doctor_name,
      d.pfp_link,
      COUNT(a.appointment_id) AS appointment_count,
      COUNT(*) FILTER (WHERE a.appointment_status = 'completed') AS completed
    FROM appointments a
    JOIN slots s ON a.slot_id = s.slot_id
    JOIN doctors d ON a.doctor_id = d.doctor_id
    WHERE s.clinic_id = $1
    GROUP BY d.doctor_id, d.first_name, d.last_name, d.pfp_link
    ORDER BY appointment_count DESC
    LIMIT $2
  `;

  const client = await getPool().connect();
  try {
    const { rows } = await client.query(sql, [clinicId, limit]);
    return rows.map(r => ({
      doctor_id: r.doctor_id,
      doctor_name: r.doctor_name,
      pfp_link: r.pfp_link,
      appointment_count: parseInt(r.appointment_count, 10),
      completed: parseInt(r.completed, 10),
    }));
  } finally {
    client.release();
  }
}

module.exports = { getAppointmentTrends, getRevenueSummary, getSlotUtilization, getTopDoctors };
