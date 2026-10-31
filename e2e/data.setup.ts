import { test as setup, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { readAuthToken } from './fixtures/auth';
import { withLock } from './fixtures/lock';
import { shouldSkipPhase } from './fixtures/phase-cache';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const AUTH_DIR = path.join(process.cwd(), '.auth');
const DATA_FILE = path.join(AUTH_DIR, 'baseline-data.json');
const WARMUP_FILE = path.join(AUTH_DIR, 'warmup-done');
const DATA_LOG = path.join(AUTH_DIR, 'data-setup.log');
const WARMUP_LOG = path.join(AUTH_DIR, 'warmup.log');
const DATA_TTL = 30 * 60 * 1000; // 30 min
const WARMUP_TTL = 30 * 60 * 1000; // 30 min

function logPhase(logFile: string, message: string) {
  const line = `${new Date().toISOString()} ${message}\n`;
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFileSync(logFile, line);
}

setup('seed baseline test data', async () => {
  await withLock('data-setup', async () => {
    // Always clean up ephemeral test artifacts (idempotent)
    try {
      await fetch(`${BACKEND_URL}/api/test/cleanup-all`, { method: 'POST' });
      console.log('[DATA] Cleaned up all ephemeral e2e data');
      // Invalidate seed cache since cleanup wiped transactional data
      if (fs.existsSync(DATA_LOG)) fs.unlinkSync(DATA_LOG);
    } catch {
      console.warn('[DATA] Failed to clean e2e data, continuing');
    }

    logPhase(DATA_LOG, 'STARTED data-seed');

    // Ensure dedicated e2e accounts exist (idempotent)
    try {
      const ensureRes = await fetch(`${BACKEND_URL}/api/test/ensure-e2e-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorPassword: process.env.TEST_DOCTOR_PASSWORD,
          clinicPassword: process.env.TEST_CLINIC_PASSWORD,
          clinicAdminPassword: process.env.TEST_CLINIC_ADMIN_PASSWORD,
          patientPassword: process.env.TEST_PATIENT_PASSWORD,
        }),
      });
      const ensureData = await ensureRes.json();
      console.log(`[DATA] E2E accounts: created=[${ensureData.created}] existing=[${ensureData.existing}]`);
    } catch {
      console.warn('[DATA] Failed to ensure e2e accounts, continuing');
    }

    // Skip seeding if data is fresh
    if (shouldSkipPhase(DATA_LOG, DATA_TTL)) {
      console.log('[DATA] Baseline data still fresh, skipping seed');
      logPhase(DATA_LOG, 'COMPLETED data-seed (cached)');
      return;
    }

    // Clean up old data first if it exists
    if (fs.existsSync(DATA_FILE)) {
      try {
        const oldData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        await fetch(`${BACKEND_URL}/api/test/cleanup-baseline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(oldData),
        });
        console.log('[DATA] Cleaned up old baseline data');
      } catch {
        console.warn('[DATA] Failed to clean old data, proceeding with seed');
      }
    }

    const res = await fetch(`${BACKEND_URL}/api/test/seed-baseline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Seed baseline failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`[DATA] Seeded baseline: ${data.appointmentIds.length} appointments, ${data.prescriptionIds.length} prescriptions`);
    logPhase(DATA_LOG, 'COMPLETED data-seed');
  });
});

setup('warm up dev server pages', async () => {
  setup.setTimeout(120000);

  await withLock('warmup', async () => {
    if (shouldSkipPhase(WARMUP_LOG, WARMUP_TTL)) {
      console.log('[WARMUP] Pages already compiled, skipping');
      logPhase(WARMUP_LOG, 'COMPLETED warmup (cached)');
      return;
    }

    logPhase(WARMUP_LOG, 'STARTED warmup');

    let consultationId = 'test-id';
    if (fs.existsSync(DATA_FILE)) {
      try {
        const baseline = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (baseline.appointmentIds?.length) consultationId = String(baseline.appointmentIds[0]);
      } catch {}
    }

    const browser = await chromium.launch();
    const pages = [
      { url: 'http://localhost:3002/login', token: null },
      { url: 'http://localhost:3002/dashboard', token: 'doctor' as const },
      { url: 'http://localhost:3002/dashboard/appointments', token: 'doctor' as const },
      { url: `http://localhost:3002/dashboard/consultation/${consultationId}`, token: 'doctor' as const },
      { url: 'http://localhost:3003/login', token: null },
      { url: 'http://localhost:3003/dashboard', token: 'clinic' as const },
      { url: 'http://localhost:3000/login', token: null },
      { url: 'http://localhost:3000/dashboard', token: 'patient' as const },
      { url: 'http://localhost:3001/login', token: null },
      { url: 'http://localhost:3001/dashboard', token: 'admin' as const },
    ];

    for (const { url, token } of pages) {
      const pageStart = Date.now();
      const context = await browser.newContext();
      const page = await context.newPage();
      if (token) {
        const tokenKey = { doctor: 'doctor_token', clinic: 'clinic_token', patient: 'patient_token', admin: 'admin_token' }[token];
        await page.goto(url.replace(/\/[^/]*$/, '/login'));
        await page.evaluate(({ key, val }) => localStorage.setItem(key, val), { key: tokenKey, val: readAuthToken(token) });
      }
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        const elapsed = Date.now() - pageStart;
        console.log(`[WARMUP] Compiled: ${url} (${elapsed}ms)`);
        logPhase(WARMUP_LOG, `PAGE ${url} compiled ${elapsed}ms`);
      } catch {
        const elapsed = Date.now() - pageStart;
        console.warn(`[WARMUP] Timeout on ${url} (${elapsed}ms)`);
        logPhase(WARMUP_LOG, `PAGE ${url} timeout ${elapsed}ms`);
      }
      await context.close();
    }
    await browser.close();

    const dir = path.dirname(WARMUP_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(WARMUP_FILE, new Date().toISOString());
    console.log('[WARMUP] All pages pre-compiled');
    logPhase(WARMUP_LOG, 'COMPLETED warmup');
  });
});
