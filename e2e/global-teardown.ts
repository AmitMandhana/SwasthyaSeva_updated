const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function globalTeardown() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/test/cleanup-all`, { method: 'POST' });
    const data = await res.json();
    console.log('[TEARDOWN] Cleaned ephemeral e2e data:', JSON.stringify(data));
  } catch (err) {
    console.warn('[TEARDOWN] cleanup-all failed (server may be stopped):', (err as Error).message);
  }
}

export default globalTeardown;
