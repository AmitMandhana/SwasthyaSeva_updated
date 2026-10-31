const { getAppointmentTrends, getRevenueSummary, getSlotUtilization, getTopDoctors } = require('../../queries/read/getClinicAnalytics');

async function appointmentTrends(req, res) {
  try {
    const { dateFrom, dateTo } = req.query;
    const data = await getAppointmentTrends({
      clinicId: req.clinicId,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    return res.status(200).json({ trends: data });
  } catch (err) {
    console.error('[ClinicAnalytics:Trends] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function revenueSummary(req, res) {
  try {
    const { dateFrom, dateTo } = req.query;
    const data = await getRevenueSummary({
      clinicId: req.clinicId,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    return res.status(200).json({ revenue: data });
  } catch (err) {
    console.error('[ClinicAnalytics:Revenue] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function slotUtilization(req, res) {
  try {
    const data = await getSlotUtilization({ clinicId: req.clinicId });
    return res.status(200).json({ utilization: data });
  } catch (err) {
    console.error('[ClinicAnalytics:Utilization] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function topDoctors(req, res) {
  try {
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 50) : 10;
    const data = await getTopDoctors({ clinicId: req.clinicId, limit });
    return res.status(200).json({ doctors: data });
  } catch (err) {
    console.error('[ClinicAnalytics:TopDoctors] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { appointmentTrends, revenueSummary, slotUtilization, topDoctors };
