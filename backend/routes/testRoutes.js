const { Router } = require('express');
const { getPool } = require('../utils/pool');
const bcrypt = require('bcrypt');
const hashForSearch = require('../utils/hashForSearch');
const encrypt = require('../utils/pii/encrypt');

const router = Router();

const BCRYPT_ROUNDS = 12;

// ── E2E Account Definitions ──
const E2E_ACCOUNTS = {
  doctor: {
    username: 'e2e_doc_primary',
    first_name: 'E2E',
    last_name: 'Doctor',
    phone: '+910001000020',
    base_degree_code: 'MBBS',
    license_no: 'E2E-DOC-001',
    prescription_format: 'GEN_MED',
    pfp_link: 'https://placehold.co/200x200?text=E2E+Doc',
    banner_link: 'https://placehold.co/800x200?text=E2E+Banner',
    signature_link: 'https://placehold.co/400x100?text=E2E+Sig',
  },
  clinic: {
    username: 'e2e_clinic_primary',
    clinic_name: 'E2E Clinic',
    phone: '+910001000010',
    license_no: 'E2E-CLINIC-001',
    street_address: '1 Test Street',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700001',
    country: 'India',
    location_x: 88.36,
    location_y: 22.57,
    pfp_link: 'https://placehold.co/200x200?text=E2E+Clinic',
    banner_link: 'https://placehold.co/800x200?text=E2E+Banner',
  },
  clinicAdmin: {
    username: 'e2e_cadmin_primary',
    name: 'E2E Clinic Admin',
    phone: '+910001000011',
  },
  patient: {
    first_name: 'E2E',
    last_name: 'TestPatient',
    phone: '+910001000001',
    email: 'e2e@test.local',
    dob: '1990-01-01',
    gender: 'male',
    street_address: '1 Test Street',
    city: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
    location_x: 88.36,
    location_y: 22.57,
  },
  slot: {
    slot_fee: 500,
    booking_fee: 0,
    slot_day: 'MON',
    slot_start: 18,
    slot_end: 30,
  },
};

/**
 * POST /api/test/create-appointment
 * DEV_MODE only — creates a test appointment directly in the database.
 * Body: { doctor_id, user_id, slot_id, appointment_date, symptom_code, symptom_text }
 */
router.post('/create-appointment', async (req, res) => {
  const { doctor_id, user_id, slot_id, appointment_date, symptom_code, symptom_text, complaints } = req.body;

  if (!doctor_id || !user_id || !slot_id || !appointment_date || !symptom_code || !symptom_text) {
    return res.status(400).json({ error: 'Bad Request', message: 'doctor_id, user_id, slot_id, appointment_date, symptom_code, symptom_text required' });
  }

  const client = await getPool().connect();
  try {
    // Validate that doctor belongs to e2e accounts
    const { rows: [doc] } = await client.query(
      `SELECT username FROM doctors WHERE doctor_id = $1`, [doctor_id]
    );
    if (doc && !doc.username.toLowerCase().startsWith('e2e')) {
      client.release();
      return res.status(403).json({ error: `E2E safety: doctor '${doc.username}' is not an e2e account. Only e2e-prefixed doctors can be used in test appointments.` });
    }

    // Validate that user has a test-range phone
    const { rows: [user] } = await client.query(
      `SELECT phone_hash FROM users WHERE user_id = $1`, [user_id]
    );
    if (user) {
      const testPhones = [
        E2E_ACCOUNTS.patient.phone,
        '+910000000000', '+910000011111', '+910000022222', '+910000033333',
        '+910000044444', '+910000055555', '+910000066666', '+910000077777',
        '+910000088888', '+910000099999', '+910000012345', '+910000054321',
      ];
      const validHashes = new Set(testPhones.map(p => hashForSearch(p)));
      if (!validHashes.has(user.phone_hash)) {
        client.release();
        return res.status(403).json({ error: `E2E safety: user_id ${user_id} is not a test account. Only users with test-range phone numbers can be used in test appointments.` });
      }
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const { rows } = await client.query(
          `INSERT INTO appointments (user_id, slot_id, appointment_date, symptom_code, symptom_text, complaints, appointment_status, recommended_index, visit_no)
           VALUES ($1, $2, $3, $4, $5, $6, 'accepted',
             COALESCE((SELECT MAX(recommended_index) + 1 FROM appointments WHERE slot_id = $2 AND appointment_date = $3), 0),
             1)
           RETURNING appointment_id`,
          [user_id, slot_id, appointment_date, symptom_code, symptom_text, complaints || '']
        );
        console.log(`[Test] Created appointment ${rows[0].appointment_id} for doctor_id=${doctor_id}`);
        return res.status(201).json({ appointment_id: rows[0].appointment_id });
      } catch (e) {
        if (e.code === '23505' && attempt < 4) continue;
        throw e;
      }
    }
  } catch (err) {
    console.error('[Test] Create appointment error:', err.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/test/appointment/:id
 * DEV_MODE only — deletes a test appointment and its related data.
 */
router.delete('/appointment/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid ID' });

  try {
    const client = await getPool().connect();
    try {
      await client.query('DELETE FROM medications WHERE appointment_id = $1', [id]);
      await client.query('DELETE FROM prescriptions WHERE prescription_id = $1', [id]);
      await client.query('DELETE FROM appointments WHERE appointment_id = $1', [id]);
      console.log(`[Test] Deleted appointment ${id}`);
      return res.status(200).json({ deleted: id });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Test] Delete appointment error:', err.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/test/seed-baseline
 * Creates a comprehensive test dataset: appointments across statuses/dates, prescriptions, medications.
 * Returns all created IDs for cleanup.
 */
router.post('/seed-baseline', async (req, res) => {
  const client = await getPool().connect();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    // Find e2e doctor and slot
    const { rows: [doc] } = await client.query(
      `SELECT doctor_id FROM doctors WHERE username = $1 AND is_deleted = false`,
      [E2E_ACCOUNTS.doctor.username]
    );
    if (!doc) return res.status(500).json({ error: `E2E doctor '${E2E_ACCOUNTS.doctor.username}' not found. Run ensure-e2e-accounts first.` });
    const doctorId = doc.doctor_id;

    const { rows: slots } = await client.query(
      'SELECT slot_id, slot_day, clinic_id FROM slots WHERE doctor_id = $1 AND is_deleted = false LIMIT 3',
      [doctorId]
    );
    if (!slots.length) return res.status(500).json({ error: 'No slots found for e2e doctor' });

    // Find e2e test patient
    const patientPhoneHash = hashForSearch(E2E_ACCOUNTS.patient.phone);
    const patientNameHash = hashForSearch(
      E2E_ACCOUNTS.patient.first_name.toLowerCase() + E2E_ACCOUNTS.patient.last_name.toLowerCase()
    );
    const { rows: patientRows } = await client.query(
      `SELECT user_id FROM users WHERE phone_hash = $1 AND name_hash = $2`,
      [patientPhoneHash, patientNameHash]
    );
    if (!patientRows.length) return res.status(500).json({ error: 'E2E patient not found. Run ensure-e2e-accounts first.' });
    const users = patientRows;

    const appointmentIds = [];
    const prescriptionIds = [];
    const medicationIds = [];

    async function insertAppt(userId, slotId, date, status, symptomCode, symptomText, complaints) {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const { rows } = await client.query(
            `INSERT INTO appointments (user_id, slot_id, appointment_date, symptom_code, symptom_text, complaints, appointment_status, recommended_index, visit_no)
             VALUES ($1, $2, $3, $4, $5, $6, $7,
               COALESCE((SELECT MAX(recommended_index) + 1 FROM appointments WHERE slot_id = $2 AND appointment_date = $3), 0), 1)
             RETURNING appointment_id`,
            [userId, slotId, date, symptomCode, symptomText, complaints, status]
          );
          appointmentIds.push(rows[0].appointment_id);
          return rows[0].appointment_id;
        } catch (e) {
          if (e.code === '23505' && attempt < 4) continue;
          throw e;
        }
      }
    }

    const slot = slots[0];
    const uid = users[0].user_id;

    // Today's appointments (various statuses)
    await insertAppt(uid, slot.slot_id, today, 'accepted', 'FEVER', 'Recurring fever for 2 days', 'General checkup');
    await insertAppt(uid, slot.slot_id, today, 'accepted', 'COUGH', 'Chest congestion and cough', 'Follow-up visit');
    const completedId = await insertAppt(uid, slot.slot_id, today, 'completed', 'HEADACHE', 'Persistent migraine', 'Routine assessment');
    await insertAppt(uid, slot.slot_id, today, 'accepted', 'BODY_PAIN', 'Lower back pain', 'Medication review');

    // Yesterday's appointments (past)
    await insertAppt(uid, slot.slot_id, yesterday, 'completed', 'STOMACH', 'Gastric issues', 'Follow-up');
    await insertAppt(uid, slot.slot_id, yesterday, 'accepted', 'FEVER', 'Mild fever', 'Checkup');

    // Two days ago
    await insertAppt(uid, slot.slot_id, twoDaysAgo, 'completed', 'SKIN', 'Skin rash on arms', 'New symptoms');

    // Tomorrow (upcoming)
    await insertAppt(uid, slot.slot_id, tomorrow, 'accepted', 'BREATHING', 'Shortness of breath', 'Urgent consultation');

    // Additional completed appointments for prescription pagination (need 21+ prescriptions)
    const symptoms = ['FEVER', 'COUGH', 'HEADACHE', 'BODY_PAIN', 'STOMACH', 'SKIN', 'BREATHING'];
    const dates = [today, yesterday, twoDaysAgo, tomorrow];
    for (let i = 0; i < 20; i++) {
      const sym = symptoms[i % symptoms.length];
      const date = dates[i % dates.length];
      await insertAppt(uid, slot.slot_id, date, 'completed', sym, `Pagination test ${i + 1}`, 'Routine');
    }

    // Add prescriptions to completed appointments (need 21+ for pagination)
    const completedAppts = await client.query(
      `SELECT appointment_id FROM appointments WHERE slot_id = $1 AND appointment_status = 'completed' ORDER BY appointment_id`,
      [slot.slot_id]
    );
    const complaints = ['Persistent migraine', 'Stomach pain', 'Skin rash', 'Back pain', 'Chest pain', 'Joint pain', 'Fatigue'];
    for (let i = 0; i < completedAppts.rows.length; i++) {
      const apptId = completedAppts.rows[i].appointment_id;
      const complaint = complaints[i % complaints.length];
      const { rows: [rx] } = await client.query(
        `INSERT INTO prescriptions (prescription_id, user_id, chief_complain, significant_medical_history, provisional_diagnosis, final_diagnosis, duration, refills)
         VALUES ($1, $2, $3, 'No significant history', 'Under evaluation', 'TBD', 5, 0)
         RETURNING prescription_id`,
        [apptId, uid, complaint]
      );
      prescriptionIds.push(rx.prescription_id);
    }

    // Add medications to the first completed appointment
    const meds = [
      ['tablet', 'Paracetamol 500mg', 10, 1, 3, 'oral', 5, 'After food'],
      ['tablet', 'Cetirizine 10mg', 5, 1, 1, 'oral', 5, 'At bedtime'],
    ];
    for (const [type, name, amt, dos, freq, route, dur, instr] of meds) {
      const { rows: [med] } = await client.query(
        `INSERT INTO medications (medication_type, medicine_name, user_id, appointment_id, amount, dosage, frequency, route, duration_days, special_instructions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING medication_id`,
        [type, name, uid, completedId, amt, dos, freq, route, dur, instr]
      );
      medicationIds.push(med.medication_id);
    }

    console.log(`[Test] Seeded baseline: ${appointmentIds.length} appointments, ${prescriptionIds.length} prescriptions, ${medicationIds.length} medications`);
    return res.status(201).json({ appointmentIds, prescriptionIds, medicationIds, doctorId, slotId: slot.slot_id, clinicId: slot.clinic_id });
  } catch (err) {
    console.error('[Test] Seed baseline error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/test/cleanup-baseline
 * Deletes all data created by seed-baseline.
 * Body: { appointmentIds, prescriptionIds, medicationIds }
 */
router.post('/cleanup-baseline', async (req, res) => {
  const { appointmentIds = [], prescriptionIds = [], medicationIds = [] } = req.body;
  const client = await getPool().connect();
  try {
    if (medicationIds.length) await client.query(`DELETE FROM medications WHERE medication_id = ANY($1::int[])`, [medicationIds]);
    if (prescriptionIds.length) await client.query(`DELETE FROM prescriptions WHERE prescription_id = ANY($1::int[])`, [prescriptionIds]);
    if (appointmentIds.length) await client.query(`DELETE FROM appointments WHERE appointment_id = ANY($1::int[])`, [appointmentIds]);
    console.log(`[Test] Cleaned baseline: ${appointmentIds.length} appointments, ${prescriptionIds.length} prescriptions, ${medicationIds.length} medications`);
    return res.status(200).json({ cleaned: true });
  } catch (err) {
    console.error('[Test] Cleanup baseline error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/test/cleanup-e2e-admins
 * DEV_MODE only — deletes all clinic_admins with username LIKE 'e2e_%'.
 * Called before every test run regardless of cache freshness.
 */
router.post('/cleanup-e2e-admins', async (req, res) => {
  const client = await getPool().connect();
  try {
    const { rowCount } = await client.query(`DELETE FROM clinic_admins WHERE username LIKE 'e2e_%'`);
    console.log(`[Test] Cleaned up ${rowCount} e2e_% clinic admins`);
    return res.status(200).json({ deleted: rowCount });
  } catch (err) {
    console.error('[Test] Cleanup e2e admins error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/test/cleanup-e2e-entities
 * DEV_MODE only — deletes doctors, clinics, managers, and slots created by admin E2E tests.
 */
router.post('/cleanup-e2e-entities', async (req, res) => {
  const client = await getPool().connect();
  try {
    await client.query(`DELETE FROM slots WHERE doctor_id IN (SELECT doctor_id FROM doctors WHERE LOWER(username) LIKE 'e2e%') OR clinic_id IN (SELECT clinic_id FROM clinics WHERE LOWER(username) LIKE 'e2e%')`);
    await client.query(`DELETE FROM clinic_admins WHERE LOWER(username) LIKE 'e2e%'`);
    const { rowCount: docCount } = await client.query(`DELETE FROM doctors WHERE LOWER(username) LIKE 'e2e%'`);
    const { rowCount: clinicCount } = await client.query(`DELETE FROM clinics WHERE LOWER(username) LIKE 'e2e%'`);
    console.log(`[Test] Cleaned up e2e entities: ${docCount} doctors, ${clinicCount} clinics`);
    return res.status(200).json({ deleted: { doctors: docCount, clinics: clinicCount } });
  } catch (err) {
    console.error('[Test] Cleanup e2e entities error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/test/cleanup-e2e-patients
 * DEV_MODE only — deletes users created by booking tests (phone starts with +910000).
 */
router.post('/cleanup-e2e-patients', async (req, res) => {
  const hashForSearch = require('../utils/hashForSearch');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const testPhones = [
      '+910000000000', '+910000011111', '+910000022222', '+910000033333',
      '+910000044444', '+910000055555', '+910000066666', '+910000077777',
      '+910000088888', '+910000099999', '+910000012345', '+910000054321',
    ];
    let totalDeleted = 0;
    for (const phone of testPhones) {
      const hash = hashForSearch(phone);
      const { rows } = await client.query(`SELECT user_id FROM users WHERE phone_hash = $1`, [hash]);
      console.log(`[Test:Cleanup] Phone ${phone} hash=${hash} found ${rows.length} users`);
      for (const { user_id } of rows) {
        await client.query(`DELETE FROM examination_records WHERE examination_id IN (SELECT appointment_id FROM appointments WHERE user_id = $1)`, [user_id]);
        await client.query(`DELETE FROM medications WHERE user_id = $1`, [user_id]);
        await client.query(`DELETE FROM prescriptions WHERE user_id = $1`, [user_id]);
        await client.query(`DELETE FROM test_requests WHERE user_id = $1`, [user_id]);
        await client.query(`DELETE FROM appointments WHERE user_id = $1`, [user_id]);
        await client.query(`DELETE FROM users WHERE user_id = $1`, [user_id]);
        totalDeleted++;
        console.log(`[Test:Cleanup] Deleted user_id=${user_id} for phone ${phone}`);
      }
    }
    await client.query('COMMIT');
    console.log(`[Test] Cleaned up ${totalDeleted} e2e test patients (cascade)`);
    return res.status(200).json({ deleted: totalDeleted });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Test] Cleanup e2e patients error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/test/seed-patient-prescription
 * DEV_MODE only — creates a completed appointment with prescription for the test patient.
 * Body: { phone } — the test patient's phone number.
 * Returns { appointment_id } for use as route param and cleanup.
 */
router.post('/seed-patient-prescription', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  const hashForSearch = require('../utils/hashForSearch');
  const client = await getPool().connect();
  try {
    const phoneHash = hashForSearch(phone);
    const { rows: [user] } = await client.query('SELECT user_id FROM users WHERE phone_hash = $1', [phoneHash]);
    if (!user) return res.status(404).json({ error: 'Patient not found' });

    const { rows: [doc] } = await client.query("SELECT doctor_id FROM doctors WHERE username = 'DrRahul'");
    if (!doc) return res.status(500).json({ error: 'DrRahul not found' });

    const { rows: slots } = await client.query(
      'SELECT slot_id, clinic_id FROM slots WHERE doctor_id = $1 AND is_deleted = false LIMIT 1',
      [doc.doctor_id]
    );
    if (!slots.length) return res.status(500).json({ error: 'No slots found' });

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Create completed appointment for the patient
    let appointmentId;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const { rows } = await client.query(
          `INSERT INTO appointments (user_id, slot_id, appointment_date, symptom_code, symptom_text, complaints, appointment_status, recommended_index, visit_no)
           VALUES ($1, $2, $3, 'HEADACHE', 'E2E test prescription', 'E2E test', 'completed',
             COALESCE((SELECT MAX(recommended_index) + 1 FROM appointments WHERE slot_id = $2 AND appointment_date = $3), 0), 1)
           RETURNING appointment_id`,
          [user.user_id, slots[0].slot_id, yesterday]
        );
        appointmentId = rows[0].appointment_id;
        break;
      } catch (e) {
        if (e.code === '23505' && attempt < 4) continue;
        throw e;
      }
    }

    // Create prescription
    await client.query(
      `INSERT INTO prescriptions (prescription_id, user_id, chief_complain, significant_medical_history, provisional_diagnosis, final_diagnosis, duration, refills)
       VALUES ($1, $2, 'Persistent headache for 3 days', 'No significant history', 'Tension headache', 'Migraine without aura', 5, 0)`,
      [appointmentId, user.user_id]
    );

    // Create medications
    await client.query(
      `INSERT INTO medications (medication_type, medicine_name, user_id, appointment_id, amount, dosage, frequency, route, duration_days, special_instructions)
       VALUES ('tablet', 'Paracetamol 500mg', $1, $2, 10, 1, 3, 'oral', 5, 'After food')`,
      [user.user_id, appointmentId]
    );

    console.log(`[Test] Seeded patient prescription: appointment_id=${appointmentId}`);
    return res.status(201).json({ appointment_id: appointmentId });
  } catch (err) {
    console.error('[Test] Seed patient prescription error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/test/seed-empty-doctor
 * DEV_MODE only — creates a doctor with credentials but NO slots, NO appointments.
 * Returns { doctor_id, username, password } for login testing.
 */
router.post('/seed-empty-doctor', async (req, res) => {
  const bcrypt = require('bcrypt');
  const client = await getPool().connect();
  try {
    const username = 'e2e_emptydoc';
    const password = 'EmptyDoc@123';
    const hash = await bcrypt.hash(password, 10);
    await client.query(`DELETE FROM doctors WHERE username = $1`, [username]);
    const { rows: [doc] } = await client.query(
      `INSERT INTO doctors (first_name, last_name, username, password_hash, phone, is_active, is_deleted)
       VALUES ('E2E', 'EmptyDoctor', $1, $2, '+910000099900', true, false)
       RETURNING doctor_id`,
      [username, hash]
    );
    console.log(`[Test] Seeded empty doctor: ${doc.doctor_id} (${username})`);
    return res.status(201).json({ doctor_id: doc.doctor_id, username, password });
  } catch (err) {
    console.error('[Test] Seed empty doctor error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/test/deactivate-doctor/:id
 * DEV_MODE only — soft-deletes a doctor (is_deleted = true).
 */
router.post('/deactivate-doctor/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid ID' });
  try {
    await getPool().query(`UPDATE doctors SET is_deleted = true WHERE doctor_id = $1`, [id]);
    console.log(`[Test] Deactivated doctor ${id}`);
    return res.status(200).json({ deactivated: id });
  } catch (err) {
    console.error('[Test] Deactivate doctor error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/test/activate-doctor/:id
 * DEV_MODE only — restores a doctor (is_deleted = false).
 */
router.post('/activate-doctor/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid ID' });
  try {
    await getPool().query(`UPDATE doctors SET is_deleted = false WHERE doctor_id = $1`, [id]);
    console.log(`[Test] Activated doctor ${id}`);
    return res.status(200).json({ activated: id });
  } catch (err) {
    console.error('[Test] Activate doctor error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/test/cleanup-e2e-softboard
 * DEV_MODE only — deletes softboard columns/cards with 'E2E' or 'Test' in the title.
 */
router.post('/cleanup-e2e-softboard', async (req, res) => {
  const client = await getPool().connect();
  try {
    await client.query(`DELETE FROM softboard_cards WHERE column_id IN (SELECT column_id FROM softboard_columns WHERE title LIKE '[E2E]%')`);
    const { rowCount } = await client.query(`DELETE FROM softboard_columns WHERE title LIKE '[E2E]%'`);
    console.log(`[Test] Cleaned up ${rowCount} e2e softboard columns`);
    return res.status(200).json({ deleted: rowCount });
  } catch (err) {
    console.error('[Test] Cleanup e2e softboard error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/test/cleanup-e2e-leads
 * DEV_MODE only — deletes patient_inquiries created by E2E tests.
 */
router.post('/cleanup-e2e-leads', async (req, res) => {
  const client = await getPool().connect();
  try {
    const { rows: clinics } = await client.query(`SELECT clinic_id FROM clinics WHERE LOWER(username) LIKE 'e2e%'`);
    let total = 0;
    for (const { clinic_id } of clinics) {
      const { rowCount } = await client.query(`DELETE FROM patient_inquiries WHERE clinic_id = $1`, [clinic_id]);
      total += rowCount ?? 0;
    }
    console.log(`[Test] Cleaned up ${total} e2e leads/inquiries`);
    return res.status(200).json({ deleted: total });
  } catch (err) {
    console.error('[Test] Cleanup e2e leads error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/test/seed-prescription-format
 * DEV_MODE only — creates a completed appointment with a rich, format-specific prescription.
 * Body: { phone, format: 'GEN_MED' | 'GEN_SURG' | 'ENT' }
 * Returns { appointment_id, format }
 */
router.post('/seed-prescription-format', async (req, res) => {
  const { phone, format } = req.body;
  if (!phone || !format) return res.status(400).json({ error: 'phone and format required' });

  const FORMATS = {
    GEN_MED: {
      symptom: { code: 'FEVER', text: 'Recurring fever with body aches for 5 days', complaints: 'High-grade fever, generalized weakness, loss of appetite' },
      prescription: {
        chief_complain: 'High-grade intermittent fever~~5 days:::Chills and rigors:::Night sweats|||Generalized body aches~~5 days:::Joint pain:::Myalgia|||Loss of appetite~~3 days:::Nausea',
        significant_medical_history: 'Known case of Type 2 Diabetes Mellitus on Metformin 500mg BD since 2019. No known drug allergies.',
        other_findings: 'Tender hepatomegaly|||Petechiae on lower limbs|||Positive tourniquet test',
        provisional_diagnosis: 'Acute viral fever with myalgia',
        final_diagnosis: 'Dengue fever (NS1 positive)',
        prognosis: 'Good with adequate hydration and platelet monitoring. Expected recovery in 7-10 days.',
        investigations_suggested: 'CBC with peripheral smear|||Dengue NS1 antigen|||Liver function test',
        surgical_intervention_suggested: 'Central venous catheter placement if platelet count drops below 20,000|||IV fluid resuscitation with NS/RL|||Blood transfusion if Hb drops below 7g/dL',
        duration: 7,
        refills: 0,
      },
      format_data: {
        anthropometryRatings: { height: 'Normal', weight: 'Normal', bmi: 'Normal (24.9)', waist: 'At risk' },
        vitalsRatings: { bp: 'Prehypertension', hr: 'Normal', temperature: 'Mild fever', spo2: 'Normal' },
        medicalHistory: { otherSignificantHistory: 'T2DM on Metformin 500mg BD since 2019', menstrualHistory: 'N/A' },
        treatment: { advice: 'Adequate oral hydration (3-4 litres/day), soft diet, monitor platelet count daily, avoid NSAIDs, bed rest for 5 days', otherInterventionSuggested: 'Platelet count monitoring every 24 hours|||Daily LFT monitoring|||Strict input-output charting' },
        followUpDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        referralType: 'referred',
        referralTo: 'Hematology, City Hospital',
      },
      medications: [
        { type: 'tablet', name: 'Paracetamol 500mg', amount: 20, dosage: 1, frequency: 3, route: 'oral', duration: 7, instructions: 'Every 8 hours', timings: 'Morning, Afternoon, Night', conditional: 'After food' },
        { type: 'capsule', name: 'Amoxicillin 250mg', amount: 21, dosage: 1, frequency: 3, route: 'oral', duration: 7, instructions: null, timings: 'Morning, Afternoon, Night', conditional: 'Before food' },
        { type: 'tablet', name: 'Cetirizine 10mg', amount: 7, dosage: 1, frequency: 1, route: 'oral', duration: 7, instructions: null, timings: 'Night', conditional: 'After food' },
        { type: 'tablet', name: 'Pantoprazole 40mg', amount: 7, dosage: 1, frequency: 1, route: 'oral', duration: 7, instructions: null, timings: 'Morning', conditional: 'Empty stomach, before breakfast' },
      ],
      tests: ['CBC with Peripheral Smear', 'Dengue NS1 Antigen', 'Urine Routine & Microscopy'],
      exam: { height: 170, weight: 72, systolic: 130, diastolic: 85, hr: 78, temp: 100.4, spo2: 97, rr: 18, waist: 86 },
    },
    GEN_SURG: {
      symptom: { code: 'STOMACHACHE', text: 'Recurrent right lower abdominal pain for 3 weeks', complaints: 'Acute exacerbation since 2 days, nausea, low-grade fever' },
      prescription: {
        chief_complain: 'Recurrent right lower abdominal pain for 3 weeks with acute exacerbation since 2 days, nausea and low-grade fever',
        significant_medical_history: 'No previous surgeries. Allergic to Sulfonamides.',
        provisional_diagnosis: 'Acute appendicitis',
        final_diagnosis: 'Acute appendicitis (confirmed by USG and clinical examination)',
        investigations_suggested: 'CBC|||Ultrasound Abdomen|||Liver Function Test|||Coagulation profile',
        surgical_intervention_suggested: 'Laparoscopic appendectomy under general anesthesia — elective, schedule within 1 week',
        duration: 10,
        refills: 0,
      },
      format_data: {
        anthropometryRatings: { height: 'Normal', weight: 'Overweight', bmi: 'Overweight (27.1)', waist: 'High risk' },
        vitalsRatings: { bp: 'Normal', hr: 'Tachycardia', temperature: 'Low-grade fever', spo2: 'Normal' },
        medicalHistory: { otherSignificantHistory: 'Allergic to Sulfonamides', menstrualHistory: 'N/A' },
        treatment: { advice: 'Nil per oral 6 hours before surgery, soft diet until then, avoid strenuous activity', otherInterventionSuggested: 'Pre-anaesthetic check-up' },
        followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      },
      medications: [
        { type: 'tablet', name: 'Cefixime 200mg', amount: 20, dosage: 1, frequency: 2, route: 'oral', duration: 10, instructions: 'After food' },
        { type: 'tablet', name: 'Metronidazole 400mg', amount: 30, dosage: 1, frequency: 3, route: 'oral', duration: 10, instructions: 'After food' },
        { type: 'tablet', name: 'Diclofenac 50mg', amount: 15, dosage: 1, frequency: 3, route: 'oral', duration: 5, instructions: 'After food, for pain relief' },
        { type: 'tablet', name: 'Ranitidine 150mg', amount: 20, dosage: 1, frequency: 2, route: 'oral', duration: 10, instructions: 'Before food' },
      ],
      tests: ['CBC', 'Liver Function Test', 'Ultrasound Abdomen'],
      exam: { height: 165, weight: 80, systolic: 124, diastolic: 80, hr: 96, temp: 99.8, spo2: 98, rr: 20, waist: 90 },
    },
    ENT: {
      symptom: { code: 'OTHER', text: 'Bilateral nasal congestion and post-nasal drip for 6 weeks', complaints: 'Intermittent headache and reduced smell' },
      prescription: {
        chief_complain: 'Bilateral nasal congestion and post-nasal drip for 6 weeks with intermittent headache and reduced smell',
        significant_medical_history: 'Allergic rhinitis since childhood. Previous septoplasty in 2022.',
        provisional_diagnosis: 'Chronic rhinosinusitis with nasal polyposis',
        final_diagnosis: 'Bilateral chronic rhinosinusitis (Grade II nasal polyps on endoscopy)',
        investigations_suggested: 'CT PNS (coronal and axial cuts)|||Nasal endoscopy|||Pure Tone Audiometry',
        surgical_intervention_suggested: 'Functional Endoscopic Sinus Surgery (FESS) with polypectomy — if medical management fails after 4 weeks',
        duration: 14,
        refills: 1,
      },
      format_data: {
        anthropometryRatings: { height: 'Normal', weight: 'Normal', bmi: 'Normal (22.9)' },
        vitalsRatings: { bp: 'Normal', hr: 'Normal', temperature: 'Normal', spo2: 'Normal' },
        medicalHistory: { otherSignificantHistory: 'Allergic rhinitis since childhood, septoplasty in 2022', menstrualHistory: 'Regular' },
        treatment: { advice: 'Saline nasal irrigation twice daily, avoid allergens and dust, steam inhalation before bed', otherInterventionSuggested: 'Nasal endoscopy follow-up in 4 weeks' },
        followUpDate: new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10),
      },
      medications: [
        { type: 'tablet', name: 'Amoxicillin-Clavulanate 625mg', amount: 28, dosage: 1, frequency: 2, route: 'oral', duration: 14, instructions: 'After food' },
        { type: 'tablet', name: 'Levocetirizine 5mg', amount: 14, dosage: 1, frequency: 1, route: 'oral', duration: 14, instructions: 'At bedtime' },
        { type: 'drops', name: 'Fluticasone Nasal Spray', amount: 1, dosage: 2, frequency: 2, route: 'nasal', duration: 28, instructions: '2 puffs each nostril twice daily' },
        { type: 'tablet', name: 'Paracetamol 500mg', amount: 10, dosage: 1, frequency: 2, route: 'oral', duration: 5, instructions: 'For headache, as needed' },
      ],
      tests: ['CBC', 'X-ray PNS', 'Pure Tone Audiometry'],
      exam: { height: 175, weight: 70, systolic: 118, diastolic: 76, hr: 72, temp: 98.6, spo2: 99, rr: 16, waist: null },
    },
  };

  const fd = FORMATS[format];
  if (!fd) return res.status(400).json({ error: `Invalid format: ${format}. Must be GEN_MED, GEN_SURG, or ENT` });

  const hashForSearch = require('../utils/hashForSearch');
  const client = await getPool().connect();
  try {
    const phoneHash = hashForSearch(phone);
    const { rows: [user] } = await client.query('SELECT user_id FROM users WHERE phone_hash = $1', [phoneHash]);
    if (!user) return res.status(404).json({ error: 'Patient not found' });

    const { rows: [doc] } = await client.query("SELECT doctor_id FROM doctors WHERE username = 'DrRahul'");
    if (!doc) return res.status(500).json({ error: 'DrRahul not found' });

    const { rows: slots } = await client.query(
      'SELECT slot_id, clinic_id FROM slots WHERE doctor_id = $1 AND is_deleted = false LIMIT 1',
      [doc.doctor_id]
    );
    if (!slots.length) return res.status(500).json({ error: 'No slots found' });

    await client.query(
      `UPDATE slots SET watermark_url = $1 WHERE slot_id = $2`,
      ['https://placehold.co/400x400/1a1a2e/ffffff?text=SS', slots[0].slot_id]
    );

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    let appointmentId;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const { rows } = await client.query(
          `INSERT INTO appointments (user_id, slot_id, appointment_date, symptom_code, symptom_text, complaints, appointment_status, recommended_index, visit_no)
           VALUES ($1, $2, $3, $4, $5, $6, 'completed',
             COALESCE((SELECT MAX(recommended_index) + 1 FROM appointments WHERE slot_id = $2 AND appointment_date = $3), 0), 1)
           RETURNING appointment_id`,
          [user.user_id, slots[0].slot_id, yesterday, fd.symptom.code, fd.symptom.text, fd.symptom.complaints]
        );
        appointmentId = rows[0].appointment_id;
        break;
      } catch (e) {
        if (e.code === '23505' && attempt < 4) continue;
        throw e;
      }
    }

    const p = fd.prescription;
    await client.query(
      `INSERT INTO prescriptions (prescription_id, user_id, chief_complain, significant_medical_history, other_findings, provisional_diagnosis, final_diagnosis, prognosis, duration, refills, prescription_format, surgical_intervention_suggested, investigations_suggested, format_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [appointmentId, user.user_id, p.chief_complain, p.significant_medical_history, p.other_findings || null, p.provisional_diagnosis, p.final_diagnosis, p.prognosis || null, p.duration, p.refills, format, p.surgical_intervention_suggested, p.investigations_suggested, JSON.stringify(fd.format_data)]
    );

    const ex = fd.exam;
    await client.query(
      `INSERT INTO examination_records (examination_id, user_id, height, weight, sp_systolic, bp_diastolic, heart_rate, respiratory_rate, oxygen_saturation, temperature, waist_circumference)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [appointmentId, user.user_id, ex.height, ex.weight, ex.systolic, ex.diastolic, ex.hr, ex.rr, ex.spo2, ex.temp, ex.waist]
    );

    for (const m of fd.medications) {
      await client.query(
        `INSERT INTO medications (medication_type, medicine_name, user_id, appointment_id, amount, dosage, frequency, route, duration_days, special_instructions, timings, conditional_instructions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [m.type, m.name, user.user_id, appointmentId, m.amount, m.dosage, m.frequency, m.route, m.duration, m.instructions, m.timings || null, m.conditional || null]
      );
    }

    for (const testName of fd.tests) {
      await client.query(
        `INSERT INTO test_requests (user_id, appointment_id, test_name) VALUES ($1, $2, $3)`,
        [user.user_id, appointmentId, testName]
      );
    }

    console.log(`[Test] Seeded ${format} prescription: appointment_id=${appointmentId}`);
    return res.status(201).json({ appointment_id: appointmentId, format });
  } catch (err) {
    console.error('[Test] Seed prescription format error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ═══ QA Dashboard: Test Report & Trace Endpoints ═══

const fsSync = require('fs');
const pathUtil = require('path');
const traceParser = require('../utils/trace-parser');

const REPORTS_DIR = pathUtil.resolve(__dirname, '../../test-results/logs');
const RESULTS_DIR = pathUtil.resolve(__dirname, '../../test-results');

/**
 * GET /api/test/setup-phases
 * Returns timing data for auth, data-seed, and warmup phases.
 * Parsed from .auth/*.log files.
 */
router.get('/setup-phases', (req, res) => {
  const authDir = pathUtil.resolve(__dirname, '../../.auth');

  function parsePhaseLog(filename) {
    const filePath = pathUtil.join(authDir, filename);
    if (!fsSync.existsSync(filePath)) return null;
    const lines = fsSync.readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean);
    const events = lines.map(line => {
      const spaceIdx = line.indexOf(' ');
      return { timestamp: line.slice(0, spaceIdx), message: line.slice(spaceIdx + 1) };
    });
    return events;
  }

  function extractPhase(events) {
    if (!events || events.length === 0) return null;
    const lastStarted = [...events].reverse().find(e => e.message.startsWith('STARTED'));
    const lastCompleted = [...events].reverse().find(e => e.message.startsWith('COMPLETED'));
    if (!lastStarted) return null;
    const started = lastStarted.timestamp;
    const completed = lastCompleted?.timestamp || null;
    const cached = lastCompleted?.message.includes('(cached)') || false;
    const duration = completed ? new Date(completed).getTime() - new Date(started).getTime() : null;
    return { started, completed, duration, cached };
  }

  function extractWarmupPages(events) {
    if (!events) return [];
    return events
      .filter(e => e.message.startsWith('PAGE '))
      .map(e => {
        const match = e.message.match(/^PAGE (\S+) (\w+) (\d+)ms$/);
        if (!match) return null;
        return { url: match[1], status: match[2], duration: parseInt(match[3]) };
      })
      .filter(Boolean);
  }

  const authEvents = parsePhaseLog('auth-setup.log');
  const dataEvents = parsePhaseLog('data-setup.log');
  const warmupEvents = parsePhaseLog('warmup.log');

  let serverStart = null;
  const startLogPath = pathUtil.resolve(__dirname, '../../start.log');
  if (fsSync.existsSync(startLogPath)) {
    serverStart = fsSync.readFileSync(startLogPath, 'utf8').trim();
  }

  res.json({
    serverStart,
    auth: extractPhase(authEvents),
    dataSeed: extractPhase(dataEvents),
    warmup: {
      ...extractPhase(warmupEvents),
      pages: extractWarmupPages(warmupEvents),
    },
  });
});

/**
 * GET /api/test/reports
 * Lists available test run reports (newest first).
 */
router.get('/reports', (req, res) => {
  if (!fsSync.existsSync(REPORTS_DIR)) return res.json([]);
  const files = fsSync.readdirSync(REPORTS_DIR)
    .filter(f => f.startsWith('test-run-') && f.endsWith('.json'))
    .sort().reverse();
  const summaries = files.slice(0, 20).map(f => {
    try {
      const data = JSON.parse(fsSync.readFileSync(pathUtil.join(REPORTS_DIR, f), 'utf8'));
      return { filename: f, timestamp: data.timestamp, status: data.status, duration: data.duration, total: data.total, passed: data.passed, failed: data.failed, skipped: data.skipped || 0 };
    } catch { return null; }
  }).filter(Boolean);
  res.json(summaries);
});

/**
 * GET /api/test/reports/:filename
 * Returns a specific test run report.
 */
router.get('/reports/:filename', (req, res) => {
  const safe = pathUtil.basename(req.params.filename);
  const filePath = pathUtil.join(REPORTS_DIR, safe);
  if (!fsSync.existsSync(filePath)) return res.status(404).json({ error: 'Report not found' });
  const data = JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
  res.json(data);
});

/**
 * GET /api/test/screenshot/:dir/:file
 * Serves a failure screenshot from test-results.
 */
router.get('/screenshot/:dir/:file', (req, res) => {
  const dir = pathUtil.basename(req.params.dir);
  const file = pathUtil.basename(req.params.file);
  const filePath = pathUtil.join(RESULTS_DIR, dir, file);
  if (!fsSync.existsSync(filePath) || !file.endsWith('.png')) return res.status(404).json({ error: 'Screenshot not found' });
  res.sendFile(filePath);
});

// ═══ Trace Deep-Dive Endpoints ═══

function resolveTracePath(project, testDir) {
  const safe = [project, testDir].map(s => pathUtil.basename(s));
  const tracePath = pathUtil.join(RESULTS_DIR, safe[0], safe[1], 'trace.zip');
  if (!fsSync.existsSync(tracePath)) return null;
  return tracePath;
}

/**
 * GET /api/test/trace/:project/:testDir
 * Parsed actions + screenshot index from trace.zip
 */
router.get('/trace/:project/:testDir', (req, res) => {
  const tracePath = resolveTracePath(req.params.project, req.params.testDir);
  if (!tracePath) return res.status(404).json({ error: 'Trace not found' });
  try {
    res.json(traceParser.parseActions(tracePath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/test/trace/:project/:testDir/meta
 * Quick metadata without full parse
 */
router.get('/trace/:project/:testDir/meta', (req, res) => {
  const tracePath = resolveTracePath(req.params.project, req.params.testDir);
  if (!tracePath) return res.status(404).json({ error: 'Trace not found' });
  try {
    res.json(traceParser.getMeta(tracePath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/test/trace/:project/:testDir/network
 * Full HAR-format network request log
 */
router.get('/trace/:project/:testDir/network', (req, res) => {
  const tracePath = resolveTracePath(req.params.project, req.params.testDir);
  if (!tracePath) return res.status(404).json({ error: 'Trace not found' });
  try {
    res.json(traceParser.parseNetwork(tracePath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/test/trace/:project/:testDir/console
 * Browser console logs from trace resources
 */
router.get('/trace/:project/:testDir/console', (req, res) => {
  const tracePath = resolveTracePath(req.params.project, req.params.testDir);
  if (!tracePath) return res.status(404).json({ error: 'Trace not found' });
  try {
    res.json(traceParser.parseConsole(tracePath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/test/trace/:project/:testDir/stacks
 * Stack trace mappings
 */
router.get('/trace/:project/:testDir/stacks', (req, res) => {
  const tracePath = resolveTracePath(req.params.project, req.params.testDir);
  if (!tracePath) return res.status(404).json({ error: 'Trace not found' });
  try {
    res.json(traceParser.parseStacks(tracePath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/test/trace/:project/:testDir/source
 * Test source code from trace resources
 */
router.get('/trace/:project/:testDir/source', (req, res) => {
  const tracePath = resolveTracePath(req.params.project, req.params.testDir);
  if (!tracePath) return res.status(404).json({ error: 'Trace not found' });
  try {
    res.json(traceParser.parseSources(tracePath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/test/trace/:project/:testDir/entries
 * List all entries in the trace zip
 */
router.get('/trace/:project/:testDir/entries', (req, res) => {
  const tracePath = resolveTracePath(req.params.project, req.params.testDir);
  if (!tracePath) return res.status(404).json({ error: 'Trace not found' });
  try {
    res.json(traceParser.listEntries(tracePath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/test/trace/:project/:testDir/resource/*
 * Serve any resource from the trace zip (screenshots, DOM, CSS, fonts, images)
 */
router.get('/trace/:project/:testDir/resource/{*resourcePath}', (req, res) => {
  const tracePath = resolveTracePath(req.params.project, req.params.testDir);
  if (!tracePath) return res.status(404).json({ error: 'Trace not found' });

  const rawPath = req.params.resourcePath;
  const resourceName = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '');
  if (!resourceName) return res.status(400).json({ error: 'Resource name required' });

  try {
    const buf = traceParser.getResource(tracePath, resourceName);
    if (!buf) return res.status(404).json({ error: 'Resource not found in trace' });

    const ext = pathUtil.extname(resourceName).toLowerCase();
    const mimeTypes = {
      '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png',
      '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
      '.json': 'application/json', '.txt': 'text/plain', '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
    };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── E2E Account Provisioning ──

/**
 * POST /api/test/ensure-e2e-accounts
 * Idempotent — creates dedicated e2e test accounts if they don't exist.
 * Called by data.setup.ts before every test run.
 */
router.post('/ensure-e2e-accounts', async (req, res) => {
  const client = await getPool().connect();
  const created = [];
  const existing = [];

  try {
    await client.query('BEGIN');

    const doctorPassword = req.body.doctorPassword || process.env.TEST_DOCTOR_PASSWORD;
    const clinicPassword = req.body.clinicPassword || process.env.TEST_CLINIC_PASSWORD;
    const clinicAdminPassword = req.body.clinicAdminPassword || process.env.TEST_CLINIC_ADMIN_PASSWORD;
    const patientPassword = req.body.patientPassword || process.env.TEST_PATIENT_PASSWORD;

    if (!doctorPassword || !clinicPassword || !clinicAdminPassword || !patientPassword) {
      return res.status(400).json({
        error: 'Missing test passwords. Pass them in request body (doctorPassword, clinicPassword, clinicAdminPassword, patientPassword) or set TEST_*_PASSWORD env vars.',
      });
    }

    // 1. Doctor
    const { rows: [existingDoc] } = await client.query(
      `SELECT doctor_id, is_deleted FROM doctors WHERE username = $1`,
      [E2E_ACCOUNTS.doctor.username]
    );

    let doctorId;
    if (existingDoc) {
      doctorId = existingDoc.doctor_id;
      const d = E2E_ACCOUNTS.doctor;
      const docHash = await bcrypt.hash(doctorPassword, BCRYPT_ROUNDS);
      await client.query(
        `UPDATE doctors SET first_name = $2, last_name = $3, phone = $4, license_no = $5,
         password_hash = $6, verified_doctor = true, is_deleted = false
         WHERE doctor_id = $1`,
        [doctorId, d.first_name, d.last_name, d.phone, d.license_no, docHash]
      );
      existing.push('doctor');
    } else {
      const docHash = await bcrypt.hash(doctorPassword, BCRYPT_ROUNDS);
      const d = E2E_ACCOUNTS.doctor;
      const { rows: [doc] } = await client.query(
        `INSERT INTO doctors (username, first_name, last_name, phone, base_degree_code, license_no, prescription_format, password_hash, pfp_link, banner_link, signature_link, verified_doctor)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
         RETURNING doctor_id`,
        [d.username, d.first_name, d.last_name, d.phone, d.base_degree_code, d.license_no, d.prescription_format, docHash, d.pfp_link, d.banner_link, d.signature_link]
      );
      doctorId = doc.doctor_id;
      created.push('doctor');
    }

    // 2. Clinic
    const { rows: [existingClinic] } = await client.query(
      `SELECT clinic_id, is_deleted FROM clinics WHERE username = $1`,
      [E2E_ACCOUNTS.clinic.username]
    );

    let clinicId;
    if (existingClinic) {
      clinicId = existingClinic.clinic_id;
      const c = E2E_ACCOUNTS.clinic;
      const clinicHash = await bcrypt.hash(clinicPassword, BCRYPT_ROUNDS);
      await client.query(
        `UPDATE clinics SET clinic_name = $2, phone = $3, license_no = $4, password_hash = $5,
         verified = true, is_deleted = false
         WHERE clinic_id = $1`,
        [clinicId, c.clinic_name, c.phone, c.license_no, clinicHash]
      );
      existing.push('clinic');
    } else {
      const clinicHash = await bcrypt.hash(clinicPassword, BCRYPT_ROUNDS);
      const c = E2E_ACCOUNTS.clinic;
      const { rows: [clinic] } = await client.query(
        `INSERT INTO clinics (username, clinic_name, phone, license_no, street_address, city, state, pincode, country, location_x, location_y, password_hash, pfp_link, banner_link, verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
         RETURNING clinic_id`,
        [c.username, c.clinic_name, c.phone, c.license_no, c.street_address, c.city, c.state, c.pincode, c.country, c.location_x, c.location_y, clinicHash, c.pfp_link, c.banner_link]
      );
      clinicId = clinic.clinic_id;
      created.push('clinic');
    }

    // 3. Clinic Admin (linked to e2e clinic)
    const { rows: [existingCAdmin] } = await client.query(
      `SELECT clinic_admin_id, is_deleted FROM clinic_admins WHERE username = $1 AND clinic_id = $2`,
      [E2E_ACCOUNTS.clinicAdmin.username, clinicId]
    );

    if (existingCAdmin && !existingCAdmin.is_deleted) {
      existing.push('clinic_admin');
    } else if (existingCAdmin && existingCAdmin.is_deleted) {
      await client.query(
        `UPDATE clinic_admins SET is_deleted = false WHERE clinic_admin_id = $1`,
        [existingCAdmin.clinic_admin_id]
      );
      created.push('clinic_admin (restored)');
    } else {
      const caHash = await bcrypt.hash(clinicAdminPassword, BCRYPT_ROUNDS);
      const ca = E2E_ACCOUNTS.clinicAdmin;
      await client.query(
        `INSERT INTO clinic_admins (clinic_id, name, username, phone, password_hash)
         VALUES ($1, $2, $3, $4, $5)`,
        [clinicId, ca.name, ca.username, ca.phone, caHash]
      );
      created.push('clinic_admin');
    }

    // 4. Patient
    const phoneHash = hashForSearch(E2E_ACCOUNTS.patient.phone);
    const nameHash = hashForSearch(
      E2E_ACCOUNTS.patient.first_name.toLowerCase() + E2E_ACCOUNTS.patient.last_name.toLowerCase()
    );

    const { rows: [existingPatient] } = await client.query(
      `SELECT user_id FROM users WHERE phone_hash = $1 AND name_hash = $2`,
      [phoneHash, nameHash]
    );

    if (existingPatient) {
      await client.query(`UPDATE users SET occupation = 'Software Engineer' WHERE user_id = $1`, [existingPatient.user_id]);
      existing.push('patient');
    } else {
      const patientHash = await bcrypt.hash(patientPassword, BCRYPT_ROUNDS);
      const p = E2E_ACCOUNTS.patient;
      await client.query(
        `INSERT INTO users (first_name, last_name, phone, email, dob, password_hash, gender, street_address, city, state, country, location_x, location_y, phone_hash, name_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [encrypt(p.first_name), encrypt(p.last_name), encrypt(p.phone), encrypt(p.email), p.dob, patientHash, p.gender, p.street_address, p.city, p.state, p.country, p.location_x, p.location_y, phoneHash, nameHash]
      );
      created.push('patient');
    }

    // 5. Slot (doctor + clinic must exist)
    const { rows: [existingSlot] } = await client.query(
      `SELECT slot_id FROM slots WHERE doctor_id = $1 AND clinic_id = $2 AND is_deleted = false LIMIT 1`,
      [doctorId, clinicId]
    );

    if (existingSlot) {
      existing.push('slot');
    } else {
      const s = E2E_ACCOUNTS.slot;
      await client.query(
        `INSERT INTO slots (clinic_id, doctor_id, slot_fee, booking_fee, slot_day, slot_start, slot_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [clinicId, doctorId, s.slot_fee, s.booking_fee, s.slot_day, s.slot_start, s.slot_end]
      );
      created.push('slot');
    }

    // Reset admin password to known value (prevents stale password from failed change-password tests)
    const adminPassword = req.body.adminPassword || process.env.TEST_ADMIN_PASSWORD;
    if (adminPassword) {
      const adminHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
      await client.query(
        `UPDATE admins SET password_hash = $1 WHERE username = 'TestAdmin'`,
        [adminHash]
      );
    }

    await client.query('COMMIT');
    console.log(`[Test] ensure-e2e-accounts: created=[${created}] existing=[${existing}]`);
    return res.status(200).json({ created, existing });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Test] ensure-e2e-accounts error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/test/resolve-test-entities
 * Returns IDs of the dedicated e2e test accounts.
 * Tests call this instead of hardcoding doctor_id/user_id/slot_id.
 */
router.get('/resolve-test-entities', async (req, res) => {
  const client = await getPool().connect();
  try {
    const { rows: [doc] } = await client.query(
      `SELECT doctor_id FROM doctors WHERE username = $1 AND is_deleted = false`,
      [E2E_ACCOUNTS.doctor.username]
    );
    if (!doc) return res.status(404).json({ error: `E2E doctor '${E2E_ACCOUNTS.doctor.username}' not found. Run ensure-e2e-accounts first.` });

    const { rows: [clinic] } = await client.query(
      `SELECT clinic_id FROM clinics WHERE username = $1 AND is_deleted = false`,
      [E2E_ACCOUNTS.clinic.username]
    );
    if (!clinic) return res.status(404).json({ error: `E2E clinic '${E2E_ACCOUNTS.clinic.username}' not found.` });

    const { rows: [slot] } = await client.query(
      `SELECT slot_id FROM slots WHERE doctor_id = $1 AND clinic_id = $2 AND is_deleted = false LIMIT 1`,
      [doc.doctor_id, clinic.clinic_id]
    );
    if (!slot) return res.status(404).json({ error: 'E2E slot not found.' });

    const phoneHash = hashForSearch(E2E_ACCOUNTS.patient.phone);
    const nameHash = hashForSearch(
      E2E_ACCOUNTS.patient.first_name.toLowerCase() + E2E_ACCOUNTS.patient.last_name.toLowerCase()
    );
    const { rows: [patient] } = await client.query(
      `SELECT user_id FROM users WHERE phone_hash = $1 AND name_hash = $2`,
      [phoneHash, nameHash]
    );
    if (!patient) return res.status(404).json({ error: 'E2E patient not found.' });

    return res.status(200).json({
      doctor_id: doc.doctor_id,
      doctor_username: E2E_ACCOUNTS.doctor.username,
      clinic_id: clinic.clinic_id,
      clinic_username: E2E_ACCOUNTS.clinic.username,
      slot_id: slot.slot_id,
      patient_user_id: patient.user_id,
      patient_phone: E2E_ACCOUNTS.patient.phone,
    });
  } catch (err) {
    console.error('[Test] resolve-test-entities error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/test/cleanup-all
 * Runs all E2E cleanup operations in correct dependency order.
 */
router.post('/cleanup-all', async (req, res) => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // 1. Clean ephemeral test patients (phones in +91000 range)
    const testPhones = [
      '+910000000000', '+910000011111', '+910000022222', '+910000033333',
      '+910000044444', '+910000055555', '+910000066666', '+910000077777',
      '+910000088888', '+910000099999', '+910000012345', '+910000054321',
    ];
    let patientCount = 0;
    for (const phone of testPhones) {
      const hash = hashForSearch(phone);
      const { rows } = await client.query(`SELECT user_id FROM users WHERE phone_hash = $1`, [hash]);
      for (const { user_id } of rows) {
        await client.query(`DELETE FROM examination_records WHERE examination_id IN (SELECT appointment_id FROM appointments WHERE user_id = $1)`, [user_id]);
        await client.query(`DELETE FROM medications WHERE user_id = $1`, [user_id]);
        await client.query(`DELETE FROM prescriptions WHERE user_id = $1`, [user_id]);
        await client.query(`DELETE FROM test_requests WHERE user_id = $1`, [user_id]);
        await client.query(`DELETE FROM appointments WHERE user_id = $1`, [user_id]);
        await client.query(`DELETE FROM users WHERE user_id = $1`, [user_id]);
        patientCount++;
      }
    }

    // 2. Clean leads (all leads for e2e clinics)
    const { rows: leadClinics } = await client.query(`SELECT clinic_id FROM clinics WHERE LOWER(username) LIKE 'e2e%'`);
    let leadCount = 0;
    for (const { clinic_id } of leadClinics) {
      const { rowCount } = await client.query(`DELETE FROM patient_inquiries WHERE clinic_id = $1`, [clinic_id]);
      leadCount += rowCount ?? 0;
    }

    // 3. Clean softboard
    await client.query(`DELETE FROM softboard_cards WHERE column_id IN (SELECT column_id FROM softboard_columns WHERE title LIKE '[E2E]%')`);
    const { rowCount: softboardCount } = await client.query(`DELETE FROM softboard_columns WHERE title LIKE '[E2E]%'`);

    // 4. Clean transactional data for e2e doctor/clinic (appointments, prescriptions, etc.)
    // but keep the e2e accounts themselves so IDs stay stable
    const { rows: e2eDocs } = await client.query(`SELECT doctor_id FROM doctors WHERE LOWER(username) LIKE 'e2e%'`);
    const { rows: e2eClinics } = await client.query(`SELECT clinic_id FROM clinics WHERE LOWER(username) LIKE 'e2e%'`);
    let apptCount = 0;
    for (const { doctor_id } of e2eDocs) {
      const { rows: slots } = await client.query(`SELECT slot_id FROM slots WHERE doctor_id = $1`, [doctor_id]);
      for (const { slot_id } of slots) {
        const { rows: appts } = await client.query(`SELECT appointment_id FROM appointments WHERE slot_id = $1`, [slot_id]);
        for (const { appointment_id } of appts) {
          await client.query(`DELETE FROM examination_records WHERE examination_id = $1`, [appointment_id]);
          await client.query(`DELETE FROM medications WHERE appointment_id = $1`, [appointment_id]);
          await client.query(`DELETE FROM test_requests WHERE appointment_id = $1`, [appointment_id]);
          await client.query(`DELETE FROM prescriptions WHERE prescription_id = $1`, [appointment_id]);
          await client.query(`DELETE FROM appointments WHERE appointment_id = $1`, [appointment_id]);
          apptCount++;
        }
      }
    }

    // 5. Clean ephemeral e2e clinic admins (preserve only the persistent one)
    const { rowCount: adminCount } = await client.query(
      `DELETE FROM clinic_admins WHERE LOWER(username) LIKE 'e2e%' AND username != $1`,
      [E2E_ACCOUNTS.clinicAdmin.username]
    );

    // 6. Delete ALL e2e slots (ensure-e2e-accounts recreates the persistent one)
    await client.query(
      `DELETE FROM slots WHERE doctor_id IN (SELECT doctor_id FROM doctors WHERE LOWER(username) LIKE 'e2e%')
       OR clinic_id IN (SELECT clinic_id FROM clinics WHERE LOWER(username) LIKE 'e2e%')`
    );
    const { rowCount: docCount } = await client.query(
      `DELETE FROM doctors WHERE LOWER(username) LIKE 'e2e%' AND username != $1`,
      [E2E_ACCOUNTS.doctor.username]
    );
    const { rowCount: clinicCount } = await client.query(
      `DELETE FROM clinics WHERE LOWER(username) LIKE 'e2e%' AND username != $1`,
      [E2E_ACCOUNTS.clinic.username]
    );

    await client.query('COMMIT');
    console.log(`[Test] cleanup-all: patients=${patientCount} leads=${leadCount} softboard=${softboardCount} e2eAppts=${apptCount} admins=${adminCount} docs=${docCount} clinics=${clinicCount}`);
    return res.status(200).json({
      deleted: { patients: patientCount, leads: leadCount, softboard: softboardCount, e2eAppointments: apptCount, clinic_admins: adminCount, doctors: docCount, clinics: clinicCount },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Test] cleanup-all error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
