const { createTestRequest } = require('../../queries/create/createTestRequest');
const { deleteTestRequest } = require('../../queries/delete/deleteTestRequest');
const { getTestResults } = require('../../queries/read/getTestResults');
const supabase = require('../../db');

/**
 * POST /api/doctor/test-requests
 * Order a lab test for an appointment.
 */
async function addTestRequest(req, res) {
  const { appointmentId, testName } = req.body || {};

  if (!appointmentId || !testName || !testName.trim()) {
    return res.status(400).json({ error: 'Bad Request', message: 'appointmentId and testName are required' });
  }

  try {
    // Verify ownership
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('appointment_id, user_id, slot_id')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    if (!appointment) {
      return res.status(404).json({ error: 'Not Found', message: 'Appointment not found' });
    }

    const { data: slot } = await supabase
      .from('slots')
      .select('doctor_id')
      .eq('slot_id', appointment.slot_id)
      .maybeSingle();

    if (!slot || slot.doctor_id !== req.doctorId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Not your appointment' });
    }

    const testRequest = await createTestRequest({
      userId: appointment.user_id,
      appointmentId,
      testName: testName.trim(),
    });

    console.log(`[Doctor:TestRequest] ADDED request_id=${testRequest.request_id} appointment_id=${appointmentId}`);
    return res.status(201).json({ testRequest });
  } catch (err) {
    console.error('[Doctor:TestRequest:Add] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * DELETE /api/doctor/test-requests/:id
 * Remove a lab test request.
 */
async function removeTestRequest(req, res) {
  const requestId = Number(req.params.id);
  if (!requestId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid request ID' });
  }

  try {
    // Get test request to find appointment
    const { data: testReq, error: trError } = await supabase
      .from('test_requests')
      .select('request_id, appointment_id')
      .eq('request_id', requestId)
      .maybeSingle();

    if (trError) throw trError;
    if (!testReq) {
      return res.status(404).json({ error: 'Not Found', message: 'Test request not found' });
    }

    // Verify ownership chain
    const { data: appointment } = await supabase
      .from('appointments')
      .select('slot_id')
      .eq('appointment_id', testReq.appointment_id)
      .maybeSingle();

    const { data: slot } = await supabase
      .from('slots')
      .select('doctor_id')
      .eq('slot_id', appointment?.slot_id)
      .maybeSingle();

    if (!slot || slot.doctor_id !== req.doctorId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Not your test request' });
    }

    await deleteTestRequest({ requestId });
    return res.status(200).json({ deleted: true });
  } catch (err) {
    console.error('[Doctor:TestRequest:Remove] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/doctor/patients/:userId/test-results
 * Get all test results for a patient.
 */
async function getPatientTestResults(req, res) {
  const userId = Number(req.params.userId);
  if (!userId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid userId' });
  }

  try {
    // Verify doctor-patient relationship
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('appointment_id, slot_id')
      .eq('user_id', userId)
      .limit(1);

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      return res.status(403).json({ error: 'Forbidden', message: 'No doctor-patient relationship' });
    }

    const { data: slot } = await supabase
      .from('slots')
      .select('doctor_id')
      .eq('slot_id', appointments[0].slot_id)
      .maybeSingle();

    if (!slot || slot.doctor_id !== req.doctorId) {
      return res.status(403).json({ error: 'Forbidden', message: 'No doctor-patient relationship' });
    }

    const results = await getTestResults({ userId });
    return res.status(200).json({ results });
  } catch (err) {
    console.error('[Doctor:TestResults] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { addTestRequest, removeTestRequest, getPatientTestResults };
