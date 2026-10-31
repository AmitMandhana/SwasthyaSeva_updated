require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { Pool } = require('../backend/node_modules/pg');
const { createAppointment } = require('../backend/queries/create/createAppointment');
const { upsertExamination } = require('../backend/queries/create/upsertExamination');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randF(min, max) { return parseFloat((Math.random() * (max - min) + min).toFixed(1)); }

function pastDate(daysAgo) {
    const d = new Date(Date.now() - daysAgo * 86400000);
    return d.toISOString().split('T')[0];
}

const SYMPTOMS = ['FEVER', 'COUGH', 'HEADACHE', 'BODY_PAIN', 'STOMACH'];
const SYMPTOM_TEXT = {
    FEVER: 'Fever and chills',
    COUGH: 'Persistent cough',
    HEADACHE: 'Headache',
    BODY_PAIN: 'Body aches',
    STOMACH: 'Stomach pain',
};

async function main() {
    const { rows: doctors } = await pool.query(`SELECT doctor_id FROM doctors WHERE username = 'DrRahul'`);
    const doctorId = doctors[0]?.doctor_id;
    if (!doctorId) { console.error('DrRahul not found'); process.exit(1); }

    const { rows: slots } = await pool.query(`SELECT slot_id, slot_day, slot_fee FROM slots WHERE doctor_id = $1 AND is_deleted = false LIMIT 1`, [doctorId]);
    const slot = slots[0];
    if (!slot) { console.error('No slot found'); process.exit(1); }

    const { rows: patients } = await pool.query(
        `SELECT DISTINCT a.user_id FROM appointments a WHERE a.doctor_id = $1`, [doctorId]
    );
    console.log(`Found ${patients.length} patients. Creating past visits with vitals...\n`);

    const DAY_MAP = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0 };
    const slotDayNum = DAY_MAP[slot.slot_day];

    for (const { user_id } of patients) {
        const numPastVisits = rand(3, 6);
        for (let i = 0; i < numPastVisits; i++) {
            const daysAgo = rand(30 + i * 45, 60 + i * 60);
            const d = new Date(Date.now() - daysAgo * 86400000);
            // Adjust to matching slot day
            const dayDiff = (d.getDay() - slotDayNum + 7) % 7;
            d.setDate(d.getDate() - dayDiff);
            const apptDate = d.toISOString().split('T')[0];

            const sym = SYMPTOMS[rand(0, SYMPTOMS.length - 1)];
            try {
                const appt = await createAppointment({
                    userId: user_id,
                    doctorId,
                    slotId: slot.slot_id,
                    symptomCode: sym,
                    symptomText: SYMPTOM_TEXT[sym],
                    complaints: null,
                    appointmentDate: apptDate,
                    appointmentStatus: 'completed',
                    bookingFeePaid: slot.slot_fee || 0,
                });

                await upsertExamination({
                    appointmentId: appt.appointment_id,
                    userId: user_id,
                    height: rand(155, 180),
                    weight: rand(50, 90),
                    spSystolic: rand(110, 140),
                    bpDiastolic: rand(65, 90),
                    heartRate: rand(60, 100),
                    respiratoryRate: rand(12, 22),
                    oxygenSaturation: rand(94, 100),
                    bloodSugar: null,
                });

                console.log(`  [OK] user=${user_id} date=${apptDate} appt=${appt.appointment_id}`);
            } catch (err) {
                if (err.message?.includes('duplicate')) continue;
                console.error(`  [FAIL] user=${user_id} date=${apptDate}:`, err.message);
            }
        }
        console.log(`[DONE] user_id=${user_id}`);
    }

    console.log('\nDone.');
    await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
