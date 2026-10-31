#!/usr/bin/env node
/**
 * Build a fresh database from DBSetup.sql and create the first admin.
 *
 * Usage:
 *   node scripts/initFreshDb.js <admin-username> <admin-password>
 *
 * Existing tables are refused unless FORCE=true, which runs DBNuke.sql first.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 12;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const username = process.argv[2] || process.env.ADMIN_USERNAME;
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;
  const force = process.env.FORCE === 'true';

  if (!connectionString) throw new Error('DATABASE_URL is required');
  if (!username || !password) {
    throw new Error('Usage: node scripts/initFreshDb.js <admin-username> <admin-password>');
  }
  if (password.length < 12) throw new Error('Admin password must be at least 12 characters');

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const { rows } = await client.query("SELECT to_regclass('public.users') AS table");
    if (rows[0].table && !force) {
      throw new Error('Database already has tables. Set FORCE=true to drop and recreate.');
    }

    await client.query('BEGIN');
    if (force) {
      await client.query(fs.readFileSync(path.join(__dirname, '..', 'DBNuke.sql'), 'utf8'));
    }
    await client.query(fs.readFileSync(path.join(__dirname, '..', 'DBSetup.sql'), 'utf8'));

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await client.query(
      'INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash',
      [username, passwordHash]
    );
    await client.query('COMMIT');

    console.log(`Fresh database ready. Admin "${username}" created.`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
