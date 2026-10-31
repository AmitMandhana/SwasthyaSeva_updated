const { getPool } = require('../../utils/pool');


/**
 * UPSERT examination record for an appointment.
 * examination_id = appointment_id (same PK/FK).
 */
async function upsertExamination({ appointmentId, userId, height, weight, spSystolic, bpDiastolic, heartRate, respiratoryRate, oxygenSaturation, bloodSugar, temperature, waistCircumference }) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO examination_records
         (examination_id, user_id, height, weight, sp_systolic, bp_diastolic, heart_rate, respiratory_rate, oxygen_saturation, blood_sugar, temperature, waist_circumference)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (examination_id) DO UPDATE SET
         height = EXCLUDED.height,
         weight = EXCLUDED.weight,
         sp_systolic = EXCLUDED.sp_systolic,
         bp_diastolic = EXCLUDED.bp_diastolic,
         heart_rate = EXCLUDED.heart_rate,
         respiratory_rate = EXCLUDED.respiratory_rate,
         oxygen_saturation = EXCLUDED.oxygen_saturation,
         blood_sugar = EXCLUDED.blood_sugar,
         temperature = EXCLUDED.temperature,
         waist_circumference = EXCLUDED.waist_circumference
       RETURNING *`,
      [appointmentId, userId, height || null, weight || null, spSystolic || null, bpDiastolic || null, heartRate || null, respiratoryRate || null, oxygenSaturation || null, bloodSugar || null, temperature || null, waistCircumference || null]
    );
    return rows[0];
  } finally {
    client.release();
  }
}

module.exports = { upsertExamination };
