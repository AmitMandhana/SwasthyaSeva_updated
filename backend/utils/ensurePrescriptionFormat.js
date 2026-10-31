const { getPool } = require('./pool');

async function ensurePrescriptionFormatColumns() {
  const client = await getPool().connect();
  try {
    await client.query(`
      ALTER TABLE doctors ADD COLUMN IF NOT EXISTS prescription_format TEXT DEFAULT 'GEN_MED';
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescription_format TEXT DEFAULT 'GEN_MED';
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS surgical_intervention_suggested TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS investigations_suggested TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS format_data JSONB DEFAULT '{}';
      ALTER TABLE examination_records ADD COLUMN IF NOT EXISTS temperature DECIMAL;
      ALTER TABLE examination_records ADD COLUMN IF NOT EXISTS waist_circumference DECIMAL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation TEXT NOT NULL DEFAULT '';
      UPDATE users SET occupation = '' WHERE occupation IS NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS attendant_name TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS attendant_relationship TEXT;
      ALTER TABLE slots ADD COLUMN IF NOT EXISTS watermark_url VARCHAR(200);
      ALTER TABLE softboard_cards ADD COLUMN IF NOT EXISTS link_text VARCHAR(200);
      ALTER TABLE softboard_cards ADD COLUMN IF NOT EXISTS link_url VARCHAR(500);

      UPDATE doctors SET prescription_format = 'GEN_MED' WHERE prescription_format IS NULL OR prescription_format = 'STANDARD';
      UPDATE prescriptions SET prescription_format = 'GEN_MED' WHERE prescription_format IS NULL OR prescription_format = 'STANDARD';

      ALTER TABLE doctors ALTER COLUMN prescription_format SET DEFAULT 'GEN_MED';
      ALTER TABLE prescriptions ALTER COLUMN prescription_format SET DEFAULT 'GEN_MED';
    `);
  } finally {
    client.release();
  }
}

module.exports = { ensurePrescriptionFormatColumns };
