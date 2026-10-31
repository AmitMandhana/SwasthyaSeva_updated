import { test, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { readAuthToken } from './fixtures/auth';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:5000';
const WEB_URL = 'http://localhost:3000';
const DOCTOR_URL = 'http://localhost:3002';
const OUTPUT_DIR = path.resolve(__dirname, '../docs/prescription-pdfs');
const PATIENT_PHONE = '+919900000099';
const FORMATS = ['GEN_MED', 'GEN_SURG', 'ENT'] as const;

test.describe('Prescription PDF Golden Capture', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  });

  for (const format of FORMATS) {
    test(`capture ${format} prescription PDF`, async () => {
      const slug = format.toLowerCase().replace(/_/g, '-');

      const seedRes = await fetch(`${BACKEND}/api/test/seed-prescription-format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: PATIENT_PHONE, format }),
      });
      const seedData = await seedRes.json();
      if (!seedRes.ok) throw new Error(`Seed failed: ${JSON.stringify(seedData)}`);
      const appointmentId = seedData.appointment_id;

      const browser = await chromium.launch({ headless: true });
      try {
        const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });

        // Patient app capture
        const patientPage = await context.newPage();
        const patientToken = readAuthToken('patient');
        await patientPage.goto(WEB_URL);
        await patientPage.evaluate(({ key, val }) => localStorage.setItem(key, val), { key: 'patient_token', val: patientToken });
        await patientPage.goto(`${WEB_URL}/dashboard/prescriptions/${appointmentId}`);
        await patientPage.waitForSelector('#prescription-content', { timeout: 15000 });
        await patientPage.waitForTimeout(2000);
        const el = patientPage.locator('#prescription-content');
        await el.screenshot({ path: path.join(OUTPUT_DIR, `${slug}.png`) });

        // Doctor app capture (same seed data)
        const doctorPage = await context.newPage();
        const doctorToken = readAuthToken('doctor');
        await doctorPage.goto(DOCTOR_URL);
        await doctorPage.evaluate(({ key, val }) => localStorage.setItem(key, val), { key: 'doctor_token', val: doctorToken });
        await doctorPage.goto(`${DOCTOR_URL}/print/${appointmentId}`);
        await doctorPage.waitForSelector('[data-testid="prescription-duration-info"]', { timeout: 15000 });
        await doctorPage.waitForTimeout(1000);
        await doctorPage.screenshot({ path: path.join(OUTPUT_DIR, `${slug}-doctor.png`), fullPage: true });

        console.log(`[PDF] Captured ${slug}.pdf, ${slug}.png, ${slug}-doctor.png`);
      } finally {
        await browser.close();
        await fetch(`${BACKEND}/api/test/appointment/${appointmentId}`, { method: 'DELETE' });
      }
    });
  }
});
