require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { Pool } = require('../backend/node_modules/pg');
const { upsertPrescription } = require('../backend/queries/create/upsertPrescription');
const { createMedication } = require('../backend/queries/create/createMedication');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }

const COMPLAINTS = [
  'Fever and body aches for 3 days',
  'Persistent cough with mucus production',
  'Severe headache radiating to neck',
  'Abdominal cramps and loose stools',
  'Skin rash with itching',
  'Shortness of breath on exertion',
  'Joint pain and morning stiffness',
  'Chest tightness and wheezing',
  'Nausea and vomiting since 2 days',
  'Burning urination and lower abdominal pain',
];

const DIAGNOSES = [
  { provisional: 'Acute viral fever', final: 'Viral pyrexia' },
  { provisional: 'Upper respiratory tract infection', final: 'Acute bronchitis' },
  { provisional: 'Tension headache', final: 'Migraine without aura' },
  { provisional: 'Acute gastroenteritis', final: 'Infectious gastroenteritis' },
  { provisional: 'Allergic dermatitis', final: 'Contact dermatitis' },
  { provisional: 'Bronchial asthma exacerbation', final: 'Moderate persistent asthma' },
  { provisional: 'Osteoarthritis', final: 'Degenerative joint disease' },
  { provisional: 'Acute gastritis', final: 'GERD with gastritis' },
  { provisional: 'Urinary tract infection', final: 'Lower UTI - cystitis' },
];

const HISTORY = [
  'Known case of hypertension on regular medication',
  'Type 2 diabetes mellitus, on metformin since 2020',
  'History of asthma, uses inhaler as needed',
  'No significant past medical history',
  'Previous surgery: appendectomy (2018)',
  'Known hypothyroidism, on levothyroxine',
  'History of seasonal allergies',
  'Known case of GERD, on PPI therapy',
];

const MEDS = [
  { name: 'Paracetamol 500mg tablet', type: 'tablet', amount: 500, dosage: 1, freq: 3, route: 'oral', days: 5 },
  { name: 'Amoxicillin 500mg capsule', type: 'capsule', amount: 500, dosage: 1, freq: 3, route: 'oral', days: 7 },
  { name: 'Cetirizine 10mg tablet', type: 'tablet', amount: 10, dosage: 1, freq: 1, route: 'oral', days: 5 },
  { name: 'Omeprazole 20mg capsule', type: 'capsule', amount: 20, dosage: 1, freq: 1, route: 'oral', days: 14 },
  { name: 'Azithromycin 500mg tablet', type: 'tablet', amount: 500, dosage: 1, freq: 1, route: 'oral', days: 3 },
  { name: 'Ibuprofen 400mg tablet', type: 'tablet', amount: 400, dosage: 1, freq: 2, route: 'oral', days: 5 },
  { name: 'Montelukast 10mg tablet', type: 'tablet', amount: 10, dosage: 1, freq: 1, route: 'oral', days: 30 },
  { name: 'Pantoprazole 40mg tablet', type: 'tablet', amount: 40, dosage: 1, freq: 1, route: 'oral', days: 14 },
  { name: 'ORS Powder', type: 'powder', amount: 1, dosage: 1, freq: 3, route: 'oral', days: 3 },
  { name: 'Betamethasone cream', type: 'ointment', amount: 1, dosage: 1, freq: 2, route: 'skin', days: 7 },
  { name: 'Salbutamol inhaler', type: 'suspension', amount: 2, dosage: 2, freq: 3, route: 'inhalation', days: 30 },
  { name: 'Metformin 500mg tablet', type: 'tablet', amount: 500, dosage: 1, freq: 2, route: 'oral', days: 30 },
];

async function main() {
  const { rows: pastAppts } = await pool.query(
    `SELECT a.appointment_id, a.user_id, a.symptom_code, a.appointment_status
     FROM appointments a
     WHERE a.appointment_status = 'completed'
     ORDER BY a.appointment_id`
  );

  console.log(`Found ${pastAppts.length} completed appointments to populate\n`);

  for (const appt of pastAppts) {
    const diag = pick(DIAGNOSES);
    const complaint = pick(COMPLAINTS);
    const history = pick(HISTORY);

    try {
      // Prescriptions already exist from previous run — upsert is safe
      await upsertPrescription({
        appointmentId: appt.appointment_id,
        userId: appt.user_id,
        chiefComplain: complaint,
        significantMedicalHistory: history,
        otherFindings: rand(0, 1) ? 'Mild tenderness noted on palpation' : null,
        provisionalDiagnosis: diag.provisional,
        finalDiagnosis: diag.final,
        prognosis: pick(['Good', 'Fair', 'Guarded']),
        duration: rand(3, 14),
        refills: rand(0, 2),
      });

      const numMeds = rand(1, 3);
      const usedMeds = new Set();
      for (let i = 0; i < numMeds; i++) {
        let med;
        do { med = pick(MEDS); } while (usedMeds.has(med.name));
        usedMeds.add(med.name);

        await createMedication({
          medicationType: med.type,
          medicineName: med.name,
          userId: appt.user_id,
          appointmentId: appt.appointment_id,
          amount: med.amount,
          dosage: med.dosage,
          frequency: med.freq,
          route: med.route,
          durationDays: med.days,
          specialInstructions: rand(0, 1) ? 'Take after meals' : null,
        });
      }

      console.log(`[OK] appt=${appt.appointment_id} user=${appt.user_id} — ${diag.provisional} (${numMeds} meds)`);
    } catch (err) {
      console.error(`[FAIL] appt=${appt.appointment_id}:`, err.message);
    }
  }

  console.log('\nDone.');
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
