require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const bcrypt = require('../backend/node_modules/bcrypt');
const { encrypt } = require('../backend/utils/pii');
const hashForSearch = require('../backend/utils/hashForSearch');
const supabase = require('../backend/db');
const insertUser = require('../backend/queries/create/createUser');
const { createAppointment } = require('../backend/queries/create/createAppointment');

const PATIENTS = [
    { first_name: 'Priya', last_name: 'Sharma', phone: '+910000100010', email: 'priya.sharma@test.com', gender: 'female', dob: '1992-03-15', city: 'Kolkata', state: 'West Bengal', country: 'India' },
    { first_name: 'Vikram', last_name: 'Singh', phone: '+910000100011', email: 'vikram.singh@test.com', gender: 'male', dob: '1985-07-22', city: 'Kolkata', state: 'West Bengal', country: 'India' },
    { first_name: 'Ananya', last_name: 'Das', phone: '+910000100012', email: 'ananya.das@test.com', gender: 'female', dob: '1998-11-08', city: 'Kolkata', state: 'West Bengal', country: 'India' },
    { first_name: 'Rohan', last_name: 'Patel', phone: '+910000100013', email: 'rohan.patel@test.com', gender: 'male', dob: '1978-01-30', city: 'Kolkata', state: 'West Bengal', country: 'India' },
    { first_name: 'Meera', last_name: 'Gupta', phone: '+910000100014', email: 'meera.gupta@test.com', gender: 'female', dob: '2001-06-12', city: 'Kolkata', state: 'West Bengal', country: 'India' },
    { first_name: 'Sanjay', last_name: 'Kumar', phone: '+910000100015', email: 'sanjay.kumar@test.com', gender: 'male', dob: '1970-09-05', city: 'Kolkata', state: 'West Bengal', country: 'India' },
    { first_name: 'Kavita', last_name: 'Reddy', phone: '+910000100016', email: 'kavita.reddy@test.com', gender: 'female', dob: '1988-12-20', city: 'Kolkata', state: 'West Bengal', country: 'India' },
];

const APPOINTMENTS = [
    { symptomCode: 'FEVER', symptomText: 'High fever for 3 days with chills', complaints: 'Intermittent fever, loss of appetite' },
    { symptomCode: 'COUGH', symptomText: 'Persistent dry cough for a week', complaints: 'Cough worse at night, mild sore throat' },
    { symptomCode: 'HEADACHE', symptomText: 'Severe headache with nausea', complaints: 'Migraine-like headache, photophobia' },
    { symptomCode: 'BODY_PAIN', symptomText: 'Joint pain and body aches', complaints: 'Generalized body pain, fatigue' },
    { symptomCode: 'STOMACH', symptomText: 'Abdominal pain with loose stools', complaints: 'Stomach cramps since yesterday' },
    { symptomCode: 'SKIN', symptomText: 'Skin rash on arms and back', complaints: 'Itchy rash spreading for 2 days' },
    { symptomCode: 'BREATHING', symptomText: 'Shortness of breath on exertion', complaints: 'Wheezing, chest tightness' },
];

async function getOrCreatePatient(p) {
    const phoneHash = hashForSearch(p.phone);
    const nameHash = hashForSearch(`${p.first_name.trim().toLowerCase()}${p.last_name.trim().toLowerCase()}`);

    // Check if exists
    const { data: existing } = await supabase.from('users').select('user_id').eq('phone_hash', phoneHash).eq('name_hash', nameHash).single();
    if (existing) return { user_id: existing.user_id, name: `${p.first_name} ${p.last_name}` };

    const passwordHash = await bcrypt.hash('TestPatient@123', 12);

    const result = await insertUser(supabase, {
        first_name: encrypt(p.first_name),
        last_name: encrypt(p.last_name),
        phone: encrypt(p.phone),
        email: encrypt(p.email),
        gender: p.gender,
        dob: p.dob,
        street_address: encrypt('123 Test Street'),
        city: p.city,
        state: p.state,
        country: p.country,
        location_x: 88.36,
        location_y: 22.57,
        hash: passwordHash,
        phone_hash: phoneHash,
        name_hash: nameHash,
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
    return { user_id: result.user.user_id, name: `${p.first_name} ${p.last_name}` };
}

async function main() {
    const { data: doc } = await supabase.from('doctors').select('doctor_id').eq('username', 'DrRahul').single();
    if (!doc) { console.error('DrRahul not found'); process.exit(1); }

    const { data: slots } = await supabase.from('slots').select('slot_id, slot_day, slot_fee').eq('doctor_id', doc.doctor_id).eq('is_deleted', false);
    console.log('Slots:', slots.map(s => `id=${s.slot_id} ${s.slot_day}`).join(', '));

    const dayMap = { 0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT' };
    const today = new Date();
    const todayDay = dayMap[today.getDay()];
    let targetSlot = slots.find(s => s.slot_day === todayDay);
    let targetDate = today.toISOString().split('T')[0];

    if (!targetSlot) {
        for (let i = 1; i <= 7; i++) {
            const d = new Date(today); d.setDate(d.getDate() + i);
            targetSlot = slots.find(s => s.slot_day === dayMap[d.getDay()]);
            if (targetSlot) { targetDate = d.toISOString().split('T')[0]; break; }
        }
    }
    if (!targetSlot) { console.error('No matching slot'); process.exit(1); }
    console.log(`Using slot=${targetSlot.slot_id} (${targetSlot.slot_day}) date=${targetDate}\n`);

    for (let i = 0; i < PATIENTS.length; i++) {
        try {
            const patient = await getOrCreatePatient(PATIENTS[i]);
            const appt = await createAppointment({
                userId: patient.user_id,
                doctorId: doc.doctor_id,
                slotId: targetSlot.slot_id,
                symptomCode: APPOINTMENTS[i].symptomCode,
                symptomText: APPOINTMENTS[i].symptomText,
                complaints: APPOINTMENTS[i].complaints,
                appointmentDate: targetDate,
                appointmentStatus: 'accepted',
                bookingFeePaid: targetSlot.slot_fee || 0,
            });
            console.log(`[OK] ${PATIENTS[i].first_name} ${PATIENTS[i].last_name} — ${APPOINTMENTS[i].symptomText} (appt_id=${appt.appointment_id})`);
        } catch (err) {
            console.error(`[FAIL] ${PATIENTS[i].first_name} ${PATIENTS[i].last_name}:`, err.message);
        }
    }

    console.log('\nDone.');
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
