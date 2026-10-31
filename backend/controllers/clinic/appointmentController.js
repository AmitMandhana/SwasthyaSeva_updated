const { getAppointmentsByClinic, getAppointmentStats } = require('../../queries/read/getAppointments');

async function listAppointments(req, res) {
  try {
    const { status, dateFrom, dateTo, doctorId, limit, offset } = req.query;

    // Validate status if provided
    const validStatuses = ['pending', 'in_progress', 'completed', 'missed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Bad Request', message: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await getAppointmentsByClinic({
      clinicId: req.clinicId,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      doctorId: doctorId || undefined,
      limit: limit ? Math.min(Number(limit), 100) : 50,
      offset: offset ? Number(offset) : 0,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[ClinicAppointments] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function appointmentStats(req, res) {
  try {
    const stats = await getAppointmentStats(req.clinicId);
    return res.status(200).json({ stats });
  } catch (err) {
    console.error('[ClinicAppointmentStats] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { listAppointments, appointmentStats };
