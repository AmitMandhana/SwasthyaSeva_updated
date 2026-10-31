const { getPool } = require('../../utils/pool');


/**
 * Get test results for a patient across all appointments.
 * Joins test_requests with test_reports.
 */
async function getTestResults({ userId }) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      `SELECT
         tr.request_id, tr.test_name, tr.appointment_id,
         rpt.report_id, rpt.test_report_link, rpt.test_date, rpt.clinic_id
       FROM test_requests tr
       LEFT JOIN test_reports rpt ON rpt.report_id = tr.request_id
       WHERE tr.user_id = $1
       ORDER BY rpt.test_date DESC NULLS LAST, tr.request_id DESC`,
      [userId]
    );
    return rows;
  } finally {
    client.release();
  }
}

module.exports = { getTestResults };
