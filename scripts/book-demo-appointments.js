require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { Pool } = require('../backend/node_modules/pg');
const { createAppointment } = require('../backend/queries/create/createAppointment');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    // 1. Find DrRahul's doctor_id and slots
    const doctorRes = await pool.query(`SELECT doctor_id, first_name, last_name FROM doctors WHERE username = 'DrRahul'`);
    if (!doctorRes.rows.length) { console.error('DrRahul not found'); process.exit(1); }
    const doctor = doctorRes.rows[0];
    console.log(`Doctor: ${doctor.first_name} ${doctor.last_name} (id=${doctor.doctor_id})\n`);

    const slotsRes = await pool.query(
        `SELECT slot_id, slot_day, slot_start, slot_end, slot_fee, clinic_id FROM slots WHERE doctor_id = $1 AND is_deleted = false`,
        [doctor.doctor_id]
    );
    console.log('Slots:', slotsRes.rows.map(s => `id=${s.slot_id} ${s.slot_day} clinic=${s.clinic_id}`).join(', '), '\n');

    // 2. Find existing patients
    const patientsRes = await pool.query(`SELECT user_id, first_name, last_name FROM users ORDER BY user_id LIMIT 10`);
    console.log('Patients:', patientsRes.rows.map(p => `${p.first_name} ${p.last_name} (id=${p.user_id})`).join(', '), '\n');

    // 3. Find a slot that matches today or a nearby date
    const dayMap = { 0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT' };
    const today = new Date();
    const todayDay = dayMap[today.getDay()];
    console.log(`Today: ${today.toISOString().split('T')[0]} (${todayDay})\n`);

    // Find slots for today's day or the next few days
    let targetSlot = slotsRes.rows.find(s => s.slot_day === todayDay);
    let targetDate = today.toISOString().split('T')[0];

    if (!targetSlot) {
        // Find the next matching day
        for (let i = 1; i <= 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            const day = dayMap[d.getDay()];
            targetSlot = slotsRes.rows.find(s => s.slot_day === day);
            if (targetSlot) {
                targetDate = d.toISOString().split('T')[0];
                console.log(`No slot for today, using ${day} ${targetDate}`);
                break;
            }
        }
    }

    if (!targetSlot) { console.error('No slots found for DrRahul'); process.exit(1); }
    console.log(`Using slot_id=${targetSlot.slot_id} (${targetSlot.slot_day}) date=${targetDate}\n`);

    // 4. Book appointments
    const appointments = [
        { patientIdx: 0, symptomCode: 'FEVER', symptomText: 'High fever for 3 days with chills', complaints: 'Intermittent fever, loss of appetite' },
        { patientIdx: 1, symptomCode: 'COUGH', symptomText: 'Persistent dry cough for a week', complaints: 'Cough worse at night, mild sore throat' },
        { patientIdx: 2, symptomCode: 'HEADACHE', symptomText: 'Severe headache with nausea', complaints: 'Migraine-like headache, photophobia' },
        { patientIdx: 3, symptomCode: 'BODY_PAIN', symptomText: 'Joint pain and body aches', complaints: 'Generalized body pain, fatigue' },
        { patientIdx: 4, symptomCode: 'STOMACH', symptomText: 'Abdominal pain with loose stools', complaints: 'Stomach cramps since yesterday' },
    ];

    for (const appt of appointments) {
        const patient = patientsRes.rows[appt.patientIdx];
        if (!patient) { console.log(`Skipping — not enough patients`); continue; }

        try {
            const result = await createAppointment({
                userId: patient.user_id,
                doctorId: doctor.doctor_id,
                slotId: targetSlot.slot_id,
                symptomCode: appt.symptomCode,
                symptomText: appt.symptomText,
                complaints: appt.complaints,
                appointmentDate: targetDate,
                appointmentStatus: 'accepted',
                bookingFeePaid: targetSlot.slot_fee || 0,
            });
            console.log(`[OK] ${patient.first_name} ${patient.last_name} — ${appt.symptomText} (appt_id=${result.appointment_id})`);
        } catch (err) {
            console.error(`[FAIL] ${patient.first_name} ${patient.last_name}:`, err.message);
        }
    }

    console.log('\nDone.');
    await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
