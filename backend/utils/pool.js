const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000,
      allowExitOnIdle: false,
    });
    pool.on('error', (err) => {
      console.error('[Pool] Unexpected idle client error:', err.message);
      pool = null;
    });
  }
  return pool;
}

async function connectWithRetry() {
  try {
    return await getPool().connect();
  } catch (err) {
    console.warn('[Pool] Connection failed, recreating pool and retrying:', err.message);
    pool = null;
    return await getPool().connect();
  }
}

module.exports = { getPool, connectWithRetry };
