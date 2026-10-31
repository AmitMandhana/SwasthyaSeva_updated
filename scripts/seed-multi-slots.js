require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { Pool } = require('../backend/node_modules/pg');
const bcrypt = require('../backend/node_modules/bcrypt');
const { encrypt } = require('../backend/utils/pii');
const hashForSearch = require('../backend/utils/hashForSearch');
const supabase = require('../backend/db');
const insertUser = require('../backend/queries/create/createUser');
const { createAppointment } = require('../backend/queries/create/createAppointment');
const { upsertPrescription } = require('../backend/queries/create/upsertPrescription');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }

const DOCTOR_ID = 9;

async function main() {
    // 1. Add new slots for DrRahul — more clinics on same days
    console.log('Adding new slots...');
    const newSlots = [
        // MON morning at MedCare (already has MON at City Health)
        { clinic_id: 9, slot_day: 'MON', slot_start: 12, slot_end: 18, slot_fee: 400, booking_fee: 50 },
        // WED evening at LifeLine (already has WED at City Health)
        { clinic_id: 10, slot_day: 'WED', slot_start: 36, slot_end: 42, slot_fee: 350, booking_fee: 0 },
        // SAT morning at CarePlus (already has SAT at City Health)
        { clinic_id: 11, slot_day: 'SAT', slot_start: 14, slot_end: 20, slot_fee: 500, booking_fee: 100 },
        // FRI morning at MedCare (already has FRI at LifeLine)
        { clinic_id: 9, slot_day: 'FRI', slot_start: 12, slot_end: 18, slot_fee: 400, booking_fee: 50 },
    ];

    const slotIds = [];
    for (const s of newSlots) {
        const { rows } = await pool.query(
            `INSERT INTO slots (clinic_id, doctor_id, slot_fee, slot_day, slot_start, slot_end, booking_fee)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING slot_id, slot_day, clinic_id`,
            [s.clinic_id, DOCTOR_ID, s.slot_fee, s.slot_day, s.slot_start, s.slot_end, s.booking_fee]
        );
        slotIds.push(rows[0]);
        console.log(`  [OK] slot_id=${rows[0].slot_id} ${s.slot_day} clinic=${s.clinic_id}`);
    }

    // 2. Create more patients
    console.log('\nCreating more patients...');
    const newPatients = [
        { first_name: 'Amit', last_name: 'Roy', phone: '+919800000020', email: 'amit.roy@test.com', gender: 'male', dob: '1980-04-10' },
        { first_name: 'Sunita', last_name: 'Devi', phone: '+919800000021', email: 'sunita.devi@test.com', gender: 'female', dob: '1975-08-22' },
        { first_name: 'Rahul', last_name: 'Verma', phone: '+919800000022', email: 'rahul.verma@test.com', gender: 'male', dob: '1995-01-15' },
        { first_name: 'Deepa', last_name: 'Nair', phone: '+919800000023', email: 'deepa.nair@test.com', gender: 'female', dob: '1990-11-30' },
        { first_name: 'Suresh', last_name: 'Iyer', phone: '+919800000024', email: 'suresh.iyer@test.com', gender: 'male', dob: '1968-06-18' },
    ];

    const patientIds = [];
    for (const p of newPatients) {
        const phoneHash = hashForSearch(p.phone);
        const nameHash = hashForSearch(`${p.first_name.toLowerCase()}${p.last_name.toLowerCase()}`);
        const passwordHash = await bcrypt.hash('TestPatient@123', 12);

        const result = await insertUser(supabase, {
            first_name: encrypt(p.first_name), last_name: encrypt(p.last_name),
            phone: encrypt(p.phone), email: encrypt(p.email), gender: p.gender, dob: p.dob,
            street_address: encrypt('456 Test Road'), city: 'Kolkata', state: 'West Bengal', country: 'India',
            location_x: 88.36, location_y: 22.57, hash: passwordHash, phone_hash: phoneHash, name_hash: nameHash,
        });

        if (result.success) {
            patientIds.push(result.user.user_id);
            console.log(`  [OK] ${p.first_name} ${p.last_name} (id=${result.user.user_id})`);
        } else {
            console.log(`  [SKIP] ${p.first_name} ${p.last_name}: ${result.error?.message}`);
        }
    }

    // Also use existing patients
    const { rows: existingPatients } = await pool.query(`SELECT user_id FROM users ORDER BY user_id LIMIT 10`);
    const allPatientIds = [...patientIds, ...existingPatients.map(r => r.user_id)];

    // 3. Get all slots (old + new)
    const { rows: allSlots } = await pool.query(
        `SELECT s.slot_id, s.slot_day, s.slot_fee, c.clinic_name FROM slots s JOIN clinics c ON c.clinic_id = s.clinic_id WHERE s.doctor_id = $1 AND s.is_deleted = false`,
        [DOCTOR_ID]
    );

    const DAY_MAP = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0 };
    const SYMPTOMS = [
        { code: 'FEVER', text: 'Fever and chills' },
        { code: 'COUGH', text: 'Persistent cough' },
        { code: 'HEADACHE', text: 'Headache and dizziness' },
        { code: 'BODY_PAIN', text: 'Body aches and fatigue' },
        { code: 'STOMACH', text: 'Abdominal discomfort' },
    ];
    const COMPLAINTS = [
        'Worsening symptoms for 3 days', 'Follow-up visit', 'New symptoms developed',
        'Routine checkup', 'Medication review needed', 'Persistent condition',
    ];
    const DIAGNOSES = [
        { p: 'Acute viral fever', f: 'Viral pyrexia' },
        { p: 'Upper RTI', f: 'Acute bronchitis' },
        { p: 'Tension headache', f: 'Migraine' },
        { p: 'Acute gastritis', f: 'GERD' },
        { p: 'Allergic rhinitis', f: 'Seasonal allergies' },
    ];
    const HISTORY = [
        'Known hypertension', 'Type 2 DM on metformin', 'History of asthma',
        'No significant history', 'Known hypothyroidism',
    ];

    // 4. Create appointments across the last 3 months on ALL slots
    console.log('\nCreating appointments across multiple slots...');
    let created = 0;

    for (let weeksAgo = 1; weeksAgo <= 12; weeksAgo++) {
        const baseDate = new Date(Date.now() - weeksAgo * 7 * 86400000);

        for (const slot of allSlots) {
            const slotDayNum = DAY_MAP[slot.slot_day];
            // Find the date in this week matching the slot day
            const d = new Date(baseDate);
            const diff = (d.getDay() - slotDayNum + 7) % 7;
            d.setDate(d.getDate() - diff);
            const apptDate = d.toISOString().split('T')[0];

            // Skip future dates
            if (new Date(apptDate) > new Date()) continue;

            const numPatients = rand(1, 3);
            for (let p = 0; p < numPatients; p++) {
                const userId = pick(allPatientIds);
                const sym = pick(SYMPTOMS);
                const status = pick(['completed', 'completed', 'completed', 'accepted', 'resolved']);

                try {
                    const appt = await createAppointment({
                        userId, doctorId: DOCTOR_ID, slotId: slot.slot_id,
                        symptomCode: sym.code, symptomText: sym.text,
                        complaints: pick(COMPLAINTS),
                        appointmentDate: apptDate,
                        appointmentStatus: status,
                        bookingFeePaid: slot.slot_fee || 0,
                    });

                    // Add prescription for completed ones
                    if (status === 'completed') {
                        const diag = pick(DIAGNOSES);
                        await upsertPrescription({
                            appointmentId: appt.appointment_id, userId,
                            chiefComplain: sym.text, significantMedicalHistory: pick(HISTORY),
                            provisionalDiagnosis: diag.p, finalDiagnosis: diag.f,
                            duration: rand(3, 14), refills: rand(0, 2),
                        });
                    }

                    created++;
                } catch (err) {
                    if (!err.message?.includes('duplicate')) {
                        console.error(`  [FAIL] ${apptDate} slot=${slot.slot_id}: ${err.message}`);
                    }
                }
            }
        }
    }

    console.log(`\nCreated ${created} appointments across multiple slots.`);
    console.log('Done.');
    await pool.end();
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
