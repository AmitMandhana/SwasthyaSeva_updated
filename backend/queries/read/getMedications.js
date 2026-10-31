const { getPool } = require('../../utils/pool');
const supabase = require('../../db');


/**
 * Get all medications for an appointment.
 */
async function getMedications({ appointmentId }) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      'SELECT * FROM medications WHERE appointment_id = $1 ORDER BY medication_id',
      [appointmentId]
    );
    return rows;
  } finally {
    client.release();
  }
}

/**
 * Get the medicines master table.
 */
async function getMedicinesList() {
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .order('medicine_name');

  if (error) throw error;
  return data;
}

module.exports = { getMedications, getMedicinesList };
