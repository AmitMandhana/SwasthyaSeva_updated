import { test as setup } from '@playwright/test';
import { setupAuth, getTokenFilePath, type AuthRole } from './fixtures/auth';
import { withLock } from './fixtures/lock';
import { shouldSkipPhase } from './fixtures/phase-cache';
import * as fs from 'fs';
import * as path from 'path';

const roles: AuthRole[] = ['admin', 'doctor', 'clinic', 'clinic_admin', 'patient'];
const AUTH_LOG = path.join(process.cwd(), '.auth', 'auth-setup.log');
const AUTH_TTL = 60 * 60 * 1000; // 1 hour
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

function logAuth(message: string) {
  const line = `${new Date().toISOString()} ${message}\n`;
  fs.mkdirSync(path.dirname(AUTH_LOG), { recursive: true });
  fs.appendFileSync(AUTH_LOG, line);
}

setup('authenticate all roles', async () => {
  await withLock('auth-setup', async () => {
    if (shouldSkipPhase(AUTH_LOG, AUTH_TTL)) {
      console.log('[AUTH] All tokens still valid, skipping');
      logAuth('COMPLETED auth-setup (cached)');
      return;
    }

    logAuth('STARTED auth-setup');

    // Ensure e2e accounts exist before authenticating
    try {
      const ensureRes = await fetch(`${BACKEND_URL}/api/test/ensure-e2e-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPassword: process.env.TEST_ADMIN_PASSWORD,
          doctorPassword: process.env.TEST_DOCTOR_PASSWORD,
          clinicPassword: process.env.TEST_CLINIC_PASSWORD,
          clinicAdminPassword: process.env.TEST_CLINIC_ADMIN_PASSWORD,
          patientPassword: process.env.TEST_PATIENT_PASSWORD,
        }),
      });
      const ensureData = await ensureRes.json();
      console.log(`[AUTH] E2E accounts: created=[${ensureData.created}] existing=[${ensureData.existing}]`);
    } catch {
      console.warn('[AUTH] Failed to ensure e2e accounts, continuing');
    }

    // Clear stale tokens (> 1 hour old)
    const TOKEN_DIR = getTokenFilePath('admin').replace(/[/\\][^/\\]+$/, '');
    if (fs.existsSync(TOKEN_DIR)) {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      for (const file of fs.readdirSync(TOKEN_DIR)) {
        if (file.endsWith('.token')) {
          const filePath = `${TOKEN_DIR}/${file}`;
          const stat = fs.statSync(filePath);
          if (stat.mtimeMs < oneHourAgo) {
            fs.unlinkSync(filePath);
          }
        }
      }
    }

    // Authenticate each role
    for (const role of roles) {
      try {
        await setupAuth(role);
        console.log(`[AUTH] Authenticated: ${role}`);
      } catch (err: any) {
        if (err.message?.includes('Too many')) {
          const tokenPath = getTokenFilePath(role);
          if (fs.existsSync(tokenPath) && fs.readFileSync(tokenPath, 'utf8').trim().length > 0) {
            console.warn(`[AUTH] ${role} rate-limited, reusing existing token`);
            continue;
          }
          console.warn(`[AUTH] ${role} rate-limited and no cached token — tests needing this role will fail`);
          continue;
        }
        throw err;
      }
    }

    logAuth('COMPLETED auth-setup');
  });
});
