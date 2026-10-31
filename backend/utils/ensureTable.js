const { Pool } = require('pg');
require('dotenv').config();

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

/**
 * Runs raw DDL (CREATE TABLE IF NOT EXISTS + seed inserts) using pg.
 * Called when Supabase returns a "table does not exist" error (code 42P01).
 * @param {string} sql - Full SQL block: CREATE TABLE + any INSERT seed data.
 */
async function ensureTable(sql) {
  const client = await getPool().connect();
  try {
    await client.query(sql);
    // Notify PostgREST to reload schema cache so Supabase sees the new table
    await client.query("NOTIFY pgrst, 'reload schema'");
  } finally {
    client.release();
  }
}

/**
 * Wraps a Supabase query function. If it fails with a table-missing error,
 * runs the provided initSQL and retries once.
 *
 * @param {Function} queryFn - async () => { data, error } supabase query
 * @param {string} initSQL   - SQL to create the missing table (+ seed data)
 * @returns {Promise<{data, error}>}
 */
async function withTableGuard(queryFn, initSQL) {
  try {
    return await queryFn();
  } catch (err) {
    const code = err.code || err?.details?.code;
    const msg = err.message || '';
    const isTableMissing =
      code === '42P01' ||
      code === 'PGRST205' ||
      msg.includes('does not exist') ||
      msg.includes('Could not find the table') ||
      msg.includes('relation') && msg.includes('does not exist');

    if (isTableMissing) {
      await ensureTable(initSQL);
      return await queryFn();
    }
    throw err;
  }
}

module.exports = { ensureTable, withTableGuard };
