const { getPool } = require('../../utils/pool');


const VALID_MEDICATION_TYPES = ['tablet', 'capsule', 'pill', 'powder', 'logens', 'aquaous_sol', 'suspension', 'drops', 'syrup', 'linctus', 'elixir', 'injection', 'paste', 'gel', 'ointment'];
const VALID_ROUTES = ['skin', 'eye', 'ear', 'nail', 'topical_rectal', 'deeper_tissue', 'arterial_supply', 'oral', 'sublingual', 'rectal', 'cutaneous', 'inhalation', 'nasal', 'subcutaneous', 'intramuscular', 'intraveinous', 'intradermal'];

/**
 * Insert a medication for an appointment.
 */
async function createMedication({ medicationType, medicineName, userId, appointmentId, medicineId, amount, dosage, frequency, route, durationDays, specialInstructions }) {
  if (!VALID_MEDICATION_TYPES.includes(medicationType)) {
    throw new Error(`Invalid medication_type: ${medicationType}`);
  }
  if (!VALID_ROUTES.includes(route)) {
    throw new Error(`Invalid route: ${route}`);
  }

  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO medications
         (medication_type, medicine_name, user_id, appointment_id, medicine_id, amount, dosage, frequency, route, duration_days, special_instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [medicationType, medicineName, userId, appointmentId, medicineId || null, amount, dosage, frequency, route, durationDays, specialInstructions || null]
    );
    return rows[0];
  } finally {
    client.release();
  }
}

module.exports = { createMedication, VALID_MEDICATION_TYPES, VALID_ROUTES };
