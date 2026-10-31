#!/usr/bin/env node
/**
 * CLI script to create a new admin account.
 * Usage: node scripts/addAdmin.js <username> <password>
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const { createAdmin } = require('../queries/create/createAdmin');

const BCRYPT_ROUNDS = 12;

async function main() {
  const [, , username, password] = process.argv;

  if (!username || !password) {
    console.error('Usage: node scripts/addAdmin.js <username> <password>');
    process.exit(1);
  }

  if (username.length < 3 || username.length > 50) {
    console.error('Username must be between 3 and 50 characters.');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('Password must be at least 12 characters.');
    process.exit(1);
  }

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const admin = await createAdmin(username, passwordHash);
    console.log(`Admin created successfully:`);
    console.log(`  admin_id:   ${admin.admin_id}`);
    console.log(`  username:   ${admin.username}`);
    console.log(`  created_at: ${admin.created_at}`);
  } catch (err) {
    if (err.code === '23505') {
      console.error(`Error: Username "${username}" is already taken.`);
    } else {
      console.error('Failed to create admin:', err.message);
    }
    process.exit(1);
  }
}

main();
