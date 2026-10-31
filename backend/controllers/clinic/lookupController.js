const { getSlots } = require('../../queries/read/getSlots');
const { getSymptoms } = require('../../queries/read/getSymptoms');
const { getComplaints } = require('../../queries/read/getComplaints');

async function listClinicSlots(req, res) {
  try {
    const slots = await getSlots({ clinic_id: req.clinicId });
    return res.status(200).json({ slots });
  } catch (err) {
    console.error('[Clinic:Slots] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function listSymptoms(req, res) {
  try {
    const symptoms = await getSymptoms();
    return res.status(200).json({ symptoms });
  } catch (err) {
    console.error('[Clinic:Symptoms] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function listComplaints(req, res) {
  try {
    const complaints = await getComplaints();
    return res.status(200).json({ complaints });
  } catch (err) {
    console.error('[Clinic:Complaints] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { listClinicSlots, listSymptoms, listComplaints };
