require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { Pool } = require('../backend/node_modules/pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    console.log('Adding "resolved" to appointment_status constraint...');
    await pool.query(`ALTER TABLE appointments DROP CONSTRAINT appointments_appointment_status_check`);
    await pool.query(`ALTER TABLE appointments ADD CONSTRAINT appointments_appointment_status_check CHECK (appointment_status = ANY (ARRAY['pending','in_progress','completed','missed','cancelled','accepted','waiting','resolved']))`);
    console.log('Done.');
    await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
