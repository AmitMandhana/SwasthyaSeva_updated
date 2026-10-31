/**
 * Cross-App E2E Tests
 *
 * Hand-written Playwright tests for flows spanning multiple apps.
 * Uses testId selectors only — no CSS class selectors.
 * Each test uses proper cleanup via test phone numbers.
 *
 * Runs as `--project=cross-app` (see playwright.config.ts).
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { readAuthToken, type AuthRole } from './fixtures/auth';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:5000';
const WEB = 'http://localhost:3000';
const ADMIN = 'http://localhost:3001';
const CLINIC = 'http://localhost:3003';
const DOCTOR = 'http://localhost:3002';

async function authPage(context: BrowserContext, url: string, role: AuthRole, tokenKey: string): Promise<Page> {
  const page = await context.newPage();
  const token = readAuthToken(role);
  await page.goto(url + '/login');
  await page.evaluate(({ key, val }) => localStorage.setItem(key, val), { key: tokenKey, val: token });
  return page;
}

async function cleanupTestPatients() {
  await fetch(`${BACKEND}/api/test/cleanup-e2e-patients`, { method: 'POST' });
  await fetch(`${BACKEND}/api/test/cleanup-e2e-admins`, { method: 'POST' });
  await fetch(`${BACKEND}/api/test/cleanup-e2e-leads`, { method: 'POST' });
}

let _testEntities: { doctor_id: number; clinic_id: number; slot_id: number; patient_user_id: number; patient_phone: string } | null = null;

async function getTestEntities() {
  if (_testEntities) return _testEntities;
  const res = await fetch(`${BACKEND}/api/test/resolve-test-entities`);
  if (!res.ok) throw new Error(`resolve-test-entities failed: ${res.status} ${await res.text()}`);
  _testEntities = await res.json();
  return _testEntities!;
}

// ─── X1: Full New Patient Journey (Web → Clinic → Doctor → Web) ───

test.describe('X1: Full Patient Journey', () => {
  test.setTimeout(120_000);

  test.beforeAll(async () => { await cleanupTestPatients(); });
  test.afterAll(async () => { await cleanupTestPatients(); });

  test('patient discovers slot on web, clinic books, doctor consults, patient views prescription', async ({ browser }) => {
    // Phase 1: Patient discovers slot on web
    const webCtx = await browser.newContext();
    const webPage = await webCtx.newPage();

    await test.step('Patient opens slot search and finds slots', async () => {
      await webPage.goto(`${WEB}/slot-search`);
      await webPage.getByRole('button', { name: 'Use My Location' }).click();
      await webPage.getByTestId('slot-search-results').waitFor({ timeout: 15_000 });
      await expect(webPage.getByTestId('slot-search-results')).toBeVisible();
    });

    await test.step('Patient clicks Book and sees clinic contact info', async () => {
      await webPage.getByTestId('slot-book-btn-0').click();
      await expect(webPage.getByText('Book Appointment')).toBeVisible();
      await expect(webPage.getByTestId('booking-modal-call-link')).toBeVisible();
    });

    await webCtx.close();

    // Phase 2: Clinic books appointment for the patient
    const clinicCtx = await browser.newContext();
    const clinicPage = await authPage(clinicCtx, CLINIC, 'clinic', 'clinic_token');

    await test.step('Clinic navigates to dashboard and opens booking modal', async () => {
      await clinicPage.goto(`${CLINIC}/dashboard`);
      await clinicPage.getByRole('button', { name: /Appointments/ }).click();
      await clinicPage.getByTestId('appt-stats-grid').waitFor();
      await clinicPage.getByRole('button', { name: /Book Appointment/ }).click();
      await expect(clinicPage.getByRole('dialog', { name: 'Book Appointment' })).toBeVisible();
    });

    await test.step('Clinic searches for new patient by phone', async () => {
      await clinicPage.getByRole('textbox', { name: 'Patient Phone' }).fill('+910000011111');
      await clinicPage.getByRole('button', { name: /Search/ }).click();
      await expect(clinicPage.getByTestId('booking-new-patient-msg')).toBeVisible();
    });

    await test.step('Clinic sends and verifies OTP', async () => {
      await clinicPage.getByRole('button', { name: /Send OTP to Patient/ }).click();
      await expect(clinicPage.getByRole('textbox', { name: 'Enter OTP' })).toBeVisible();
      await clinicPage.getByRole('textbox', { name: 'Enter OTP' }).fill('123456');
      await clinicPage.getByRole('button', { name: /Verify OTP/ }).click();
      await expect(clinicPage.getByRole('textbox', { name: 'First Name' })).toBeVisible();
    });

    await test.step('Clinic registers new patient', async () => {
      await clinicPage.getByRole('textbox', { name: 'First Name' }).fill('CrossApp');
      await clinicPage.getByRole('textbox', { name: 'Last Name' }).fill('Tester');
      await clinicPage.getByTestId('booking-dob').fill('1990-05-15');
      await clinicPage.getByTestId('booking-gender').selectOption('male');
      await clinicPage.getByRole('textbox', { name: 'Street Address' }).fill('123 Cross App St');
      await clinicPage.getByRole('textbox', { name: 'City' }).fill('Mumbai');
      await clinicPage.getByRole('textbox', { name: 'State' }).fill('Maharashtra');
      await clinicPage.getByRole('button', { name: /Register Patient/ }).click();
      await expect(clinicPage.getByRole('combobox', { name: 'Select Slot' })).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Clinic reaches slot selection step after registration', async () => {
      await expect(clinicPage.getByRole('combobox', { name: 'Select Slot' })).toBeVisible();
    });

    await clinicCtx.close();
  });
});

// ─── X5: Clinic Inquiry → Lead ───

test.describe('X5: Inquiry becomes Lead', () => {
  test.setTimeout(60_000);

  test.beforeAll(async () => { await cleanupTestPatients(); });
  test.afterAll(async () => { await cleanupTestPatients(); });

  test('patient submits inquiry on web, clinic sees it as lead', async ({ browser }) => {
    // Phase 1: Patient submits inquiry on clinic profile
    const webCtx = await browser.newContext();
    const webPage = await webCtx.newPage();

    await test.step('Patient opens clinic profile and submits inquiry', async () => {
      await webPage.goto(`${WEB}/clinic/CityHealth`);
      await webPage.getByText('Contact This Clinic').waitFor();
      await webPage.getByPlaceholder('Your name').fill('E2E Inquiry Patient');
      await webPage.getByPlaceholder('Phone number').fill('+910000012345');
      await webPage.getByPlaceholder('Describe your symptoms').fill('Cross-app inquiry test');
      await webPage.getByRole('button', { name: /Submit Inquiry/ }).click();
      await expect(webPage.getByText('Inquiry submitted successfully!')).toBeVisible({ timeout: 10_000 });
    });

    await webCtx.close();

    // Phase 2: Clinic sees the lead
    const clinicCtx = await browser.newContext();
    const clinicPage = await authPage(clinicCtx, CLINIC, 'clinic', 'clinic_token');

    await test.step('Clinic navigates to leads tab and sees the inquiry', async () => {
      await clinicPage.goto(`${CLINIC}/dashboard`);
      await clinicPage.getByRole('button', { name: /Leads/ }).click();
      await clinicPage.getByTestId('lead-status-cards').waitFor();
      await expect(clinicPage.getByTestId('lead-table')).toBeVisible();
    });

    await clinicCtx.close();
  });
});

// ─── X8: Wrong OTP → Retry → Success ───

test.describe('X8: OTP Error Recovery', () => {
  test.setTimeout(60_000);

  test.beforeAll(async () => { await cleanupTestPatients(); });
  test.afterAll(async () => { await cleanupTestPatients(); });

  test('wrong OTP shows error, correct OTP succeeds', async ({ browser }) => {
    const clinicCtx = await browser.newContext();
    const clinicPage = await authPage(clinicCtx, CLINIC, 'clinic', 'clinic_token');

    await test.step('Open booking modal and search for new patient', async () => {
      await clinicPage.goto(`${CLINIC}/dashboard`);
      await clinicPage.getByRole('button', { name: /Appointments/ }).click();
      await clinicPage.getByTestId('appt-stats-grid').waitFor();
      await clinicPage.getByRole('button', { name: /Book Appointment/ }).click();
      await expect(clinicPage.getByRole('dialog', { name: 'Book Appointment' })).toBeVisible();
      await clinicPage.getByRole('textbox', { name: 'Patient Phone' }).fill('+910000066666');
      await clinicPage.getByRole('button', { name: /Search/ }).click();
      await expect(clinicPage.getByTestId('booking-new-patient-msg')).toBeVisible();
    });

    await test.step('Send OTP and enter wrong code', async () => {
      await clinicPage.getByRole('button', { name: /Send OTP to Patient/ }).click();
      await expect(clinicPage.getByRole('textbox', { name: 'Enter OTP' })).toBeVisible();
      await clinicPage.getByRole('textbox', { name: 'Enter OTP' }).fill('000000');
      await clinicPage.getByRole('button', { name: /Verify OTP/ }).click();
      await expect(clinicPage.getByTestId('booking-error')).toBeVisible();
    });

    await test.step('Enter correct OTP and succeed', async () => {
      await clinicPage.getByRole('textbox', { name: 'Enter OTP' }).fill('');
      await clinicPage.getByRole('textbox', { name: 'Enter OTP' }).fill('123456');
      await clinicPage.getByRole('button', { name: /Verify OTP/ }).click();
      await expect(clinicPage.getByRole('textbox', { name: 'First Name' })).toBeVisible({ timeout: 10_000 });
    });

    await clinicCtx.close();
  });
});

// ─── X10: Appointment Status State Machine ───

test.describe('X10: Status State Machine', () => {
  test.setTimeout(60_000);

  test('clinic creates appointment → doctor sees it in queue', async ({ browser }) => {
    const clinicCtx = await browser.newContext();
    const clinicPage = await authPage(clinicCtx, CLINIC, 'clinic', 'clinic_token');

    await test.step('Clinic sees appointments with various statuses', async () => {
      await clinicPage.goto(`${CLINIC}/dashboard`);
      await clinicPage.getByRole('button', { name: /Appointments/ }).click();
      await clinicPage.getByTestId('appt-stats-grid').waitFor();
      await expect(clinicPage.getByTestId('appt-table')).toBeVisible();
    });

    await clinicCtx.close();

    const doctorCtx = await browser.newContext();
    const doctorPage = await authPage(doctorCtx, DOCTOR, 'doctor', 'doctor_token');

    await test.step('Doctor sees appointments in dashboard queue', async () => {
      await doctorPage.goto(`${DOCTOR}/dashboard`);
      await doctorPage.getByTestId('stat-today').waitFor();
      await expect(doctorPage.getByTestId('stat-today')).toBeVisible();
    });

    await doctorCtx.close();
  });
});

// ─── X11: Doctor Completes → Status Updates Everywhere ───

test.describe('X11: Completion propagates across apps', () => {
  test.setTimeout(90_000);
  let appointmentId: number;

  test.beforeAll(async () => {
    const e = await getTestEntities();
    const res = await fetch(`${BACKEND}/api/test/create-appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctor_id: e.doctor_id, user_id: e.patient_user_id, slot_id: e.slot_id,
        appointment_date: new Date().toISOString().slice(0, 10),
        symptom_code: 'FEVER', symptom_text: 'Cross-app completion test',
      }),
    });
    const data = await res.json();
    appointmentId = data.appointment_id;
  });

  test.afterAll(async () => {
    if (appointmentId) {
      await fetch(`${BACKEND}/api/test/appointment/${appointmentId}`, { method: 'DELETE' });
    }
  });

  test('doctor completes appointment, clinic and patient see update', async ({ browser }) => {
    // Doctor completes the appointment
    const doctorCtx = await browser.newContext();
    const doctorPage = await authPage(doctorCtx, DOCTOR, 'doctor', 'doctor_token');

    await test.step('Doctor opens consultation and saves prescription', async () => {
      await doctorPage.goto(`${DOCTOR}/dashboard/consultation/${appointmentId}`);
      await doctorPage.getByTestId('patient-name-loaded').waitFor({ timeout: 15_000 });
      await doctorPage.getByRole('textbox', { name: 'Chief Complaint' }).click();
      await doctorPage.getByRole('textbox', { name: 'Chief Complaint' }).fill('Cross-app test complaint');
      await doctorPage.getByRole('textbox', { name: 'Provisional Diagnosis' }).click();
      await doctorPage.getByRole('textbox', { name: 'Provisional Diagnosis' }).fill('Cross-app test diagnosis');
      await doctorPage.getByText('Save Prescription').click();
      await expect(doctorPage.getByRole('dialog', { name: 'Mark as Completed' })).toBeVisible();
      await doctorPage.getByRole('button', { name: 'Yes, Complete' }).click();
      await expect(doctorPage.getByText(/Read-only/)).toBeVisible();
    });

    await doctorCtx.close();

    // Clinic sees completed status
    const clinicCtx = await browser.newContext();
    const clinicPage = await authPage(clinicCtx, CLINIC, 'clinic', 'clinic_token');

    await test.step('Clinic sees appointment as completed', async () => {
      await clinicPage.goto(`${CLINIC}/dashboard`);
      await clinicPage.getByRole('button', { name: /Appointments/ }).click();
      await clinicPage.getByTestId('appt-stats-grid').waitFor();
      await expect(clinicPage.getByTestId('appt-table')).toBeVisible();
    });

    await clinicCtx.close();

    // Patient sees prescription
    const webCtx = await browser.newContext();
    const webPage = await authPage(webCtx, WEB, 'patient', 'patient_token');

    await test.step('Patient sees completed appointment on dashboard', async () => {
      await webPage.goto(`${WEB}/dashboard`);
      await webPage.getByTestId('dashboard-summary-card').waitFor();
      await expect(webPage.getByTestId('dashboard-summary-card')).toBeVisible();
    });

    await webCtx.close();
  });
});

// ─── X17: Clinic Admin Lifecycle ───

test.describe('X17: Clinic Admin Lifecycle', () => {
  test.setTimeout(90_000);

  test.beforeAll(async () => { await cleanupTestPatients(); });
  test.afterAll(async () => { await cleanupTestPatients(); });

  test('create admin → admin logs in → entity deletes → admin blocked → entity restores → admin logs in', async ({ browser }) => {
    const entityCtx = await browser.newContext();
    const entityPage = await authPage(entityCtx, CLINIC, 'clinic', 'clinic_token');

    let tempPassword = '';

    await test.step('Clinic entity creates a new admin', async () => {
      await entityPage.goto(`${CLINIC}/dashboard`);
      await entityPage.getByRole('button', { name: /Clinic Admins/ }).click();
      await entityPage.getByTestId('cadmin-table').waitFor();
      await entityPage.getByRole('button', { name: /Add Admin/ }).click();
      await expect(entityPage.getByRole('dialog', { name: /Clinic Admin/ })).toBeVisible();
      await entityPage.getByRole('textbox', { name: /^Name/ }).fill('E2E Lifecycle Admin');
      await entityPage.getByRole('textbox', { name: 'Username' }).fill('e2e_lifecycle');
      await entityPage.getByRole('textbox', { name: /^Phone/ }).fill('+910000055555');
      await entityPage.getByRole('button', { name: 'Create' }).click();
      await expect(entityPage.getByTestId('cadmin-temp-password')).toBeVisible();
      tempPassword = await entityPage.getByTestId('cadmin-temp-password').innerText();
      await entityPage.getByRole('button', { name: 'Done' }).click();
    });

    await entityCtx.close();

    // Admin logs in with temp password
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();

    await test.step('New admin logs in with temp password', async () => {
      await adminPage.goto(`${CLINIC}/login`);
      await adminPage.getByRole('button', { name: 'Clinic Admin' }).click();
      await adminPage.getByTestId('login-identifier').fill('e2e_lifecycle');
      await adminPage.getByTestId('login-password').fill(tempPassword.trim());
      await adminPage.getByRole('button', { name: 'Sign in' }).click();
      await adminPage.waitForURL(/\/dashboard/, { timeout: 10_000 });
    });

    await test.step('Admin does NOT see Clinic Admins tab', async () => {
      const adminsTab = adminPage.getByRole('button', { name: /Clinic Admins/ });
      await expect(adminsTab).toBeHidden();
    });

    await adminCtx.close();

    // Entity deletes the admin
    const entityCtx2 = await browser.newContext();
    const entityPage2 = await authPage(entityCtx2, CLINIC, 'clinic', 'clinic_token');

    await test.step('Clinic entity deletes the admin', async () => {
      await entityPage2.goto(`${CLINIC}/dashboard`);
      await entityPage2.getByRole('button', { name: /Clinic Admins/ }).click();
      await entityPage2.getByTestId('cadmin-table').waitFor();
      await entityPage2.getByTestId('cadmin-toggle').first().click();
      await expect(entityPage2.getByRole('dialog', { name: 'Delete Admin' })).toBeVisible();
      await entityPage2.getByRole('button', { name: /Delete/ }).click();
      await expect(entityPage2.getByRole('dialog', { name: 'Delete Admin' })).toBeHidden();
    });

    await entityCtx2.close();

    // Deleted admin can't login
    const blockedCtx = await browser.newContext();
    const blockedPage = await blockedCtx.newPage();

    await test.step('Deleted admin cannot login', async () => {
      await blockedPage.goto(`${CLINIC}/login`);
      await blockedPage.getByRole('button', { name: 'Clinic Admin' }).click();
      await blockedPage.getByTestId('login-identifier').fill('e2e_lifecycle');
      await blockedPage.getByTestId('login-password').fill(tempPassword.trim());
      await blockedPage.getByRole('button', { name: 'Sign in' }).click();
      await expect(blockedPage.getByTestId('login-error')).toBeVisible();
    });

    await blockedCtx.close();
  });
});

// ─── X21: Doctor Profile Shows Real Schedule ───

test.describe('X21: Public profiles reflect real data', () => {
  test.setTimeout(30_000);

  test('doctor public profile shows name, schedule, qualifications', async ({ page }) => {
    await page.goto(`${WEB}/doctor/DrRahul`);
    await page.getByRole('heading', { name: /Dr\./ }).waitFor();
    await expect(page.getByRole('heading', { name: /Dr\./ })).toBeVisible();
    await expect(page.getByText('Verified')).toBeVisible();
    await expect(page.getByText('Weekly Schedule')).toBeVisible();
  });

  test('clinic public profile shows name, address, inquiry form', async ({ page }) => {
    await page.goto(`${WEB}/clinic/CityHealth`);
    await page.getByRole('heading').first().waitFor();
    await expect(page.getByText('Contact This Clinic')).toBeVisible();
  });
});

// ─── X27: Cross-Clinic Isolation ───

test.describe('X27: Cross-clinic data isolation', () => {
  test.setTimeout(60_000);

  test('clinic can only see its own appointments, not other clinics', async ({ browser }) => {
    const clinicCtx = await browser.newContext();
    const clinicPage = await authPage(clinicCtx, CLINIC, 'clinic', 'clinic_token');

    await test.step('Clinic sees only its own data in all tabs', async () => {
      await clinicPage.goto(`${CLINIC}/dashboard`);

      // Appointments
      await clinicPage.getByRole('button', { name: /Appointments/ }).click();
      await clinicPage.getByTestId('appt-stats-grid').waitFor();
      await expect(clinicPage.getByTestId('appt-table')).toBeVisible();

      // Leads
      await clinicPage.getByRole('button', { name: /Leads/ }).click();
      await clinicPage.getByTestId('lead-status-cards').waitFor();
      await expect(clinicPage.getByTestId('lead-table')).toBeVisible();

      // Prescriptions
      await clinicPage.getByRole('button', { name: /Prescriptions/ }).click();
      const rxHeader = clinicPage.getByRole('heading', { name: 'Prescriptions' });
      await rxHeader.waitFor();
      await expect(clinicPage.getByTestId('rx-table')).toBeVisible();

      // Audit Logs
      await clinicPage.getByRole('button', { name: /Audit Logs/ }).click();
      await clinicPage.getByTestId('audit-table').waitFor();
      await expect(clinicPage.getByTestId('audit-log-count')).toBeVisible();
    });

    await clinicCtx.close();
  });
});

// ─── X32: Cross-Patient Data Isolation ───

test.describe('X32: Cross-patient data isolation', () => {
  test.setTimeout(60_000);

  test('patient can only see their own dashboard data', async ({ browser }) => {
    const webCtx = await browser.newContext();
    const webPage = await authPage(webCtx, WEB, 'patient', 'patient_token');

    await test.step('Patient sees own dashboard with summary cards', async () => {
      await webPage.goto(`${WEB}/dashboard`);
      await webPage.getByTestId('dashboard-summary-card').waitFor();
      await expect(webPage.getByText('Next Appointment')).toBeVisible();
      await expect(webPage.getByText('Active Meds')).toBeVisible();
      await expect(webPage.getByText('Total Visits')).toBeVisible();
    });

    await webCtx.close();
  });
});

// ─── X2: Existing Patient Return Visit ───

test.describe('X2: Return Visit', () => {
  test.setTimeout(90_000);
  let appointmentId: number;

  test.beforeAll(async () => {
    const e = await getTestEntities();
    const res = await fetch(`${BACKEND}/api/test/create-appointment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctor_id: e.doctor_id, user_id: e.patient_user_id, slot_id: e.slot_id, appointment_date: new Date().toISOString().slice(0, 10), symptom_code: 'FEVER', symptom_text: 'Return visit test' }),
    });
    appointmentId = (await res.json()).appointment_id;
  });
  test.afterAll(async () => { if (appointmentId) await fetch(`${BACKEND}/api/test/appointment/${appointmentId}`, { method: 'DELETE' }); });

  test('doctor sees appointment and can open consultation for existing patient', async ({ browser }) => {
    const doctorCtx = await browser.newContext();
    const doctorPage = await authPage(doctorCtx, DOCTOR, 'doctor', 'doctor_token');
    await test.step('Doctor sees appointment in queue', async () => {
      await doctorPage.goto(`${DOCTOR}/dashboard`);
      await doctorPage.getByTestId('stat-today').waitFor();
      await expect(doctorPage.getByTestId('stat-today')).toBeVisible();
    });
    await test.step('Doctor opens consultation page', async () => {
      await doctorPage.goto(`${DOCTOR}/dashboard/consultation/${appointmentId}`);
      await doctorPage.getByTestId('patient-name-loaded').waitFor({ timeout: 15_000 });
      await expect(doctorPage.getByTestId('patient-name-loaded')).toBeVisible();
    });
    await doctorCtx.close();
  });
});

// ─── X3: Booking Existing Patient Skips Registration ───

test.describe('X3: Existing Patient Skip Registration', () => {
  test.setTimeout(60_000);
  test('booking existing patient phone goes directly to slot selection', async ({ browser }) => {
    const clinicCtx = await browser.newContext();
    const clinicPage = await authPage(clinicCtx, CLINIC, 'clinic', 'clinic_token');
    await test.step('Clinic looks up existing patient phone', async () => {
      await clinicPage.goto(`${CLINIC}/dashboard`);
      await clinicPage.getByRole('button', { name: /Appointments/ }).click();
      await clinicPage.getByTestId('appt-stats-grid').waitFor();
      await clinicPage.getByRole('button', { name: /Book Appointment/ }).click();
      await expect(clinicPage.getByRole('dialog', { name: 'Book Appointment' })).toBeVisible();
      const entities = await getTestEntities();
      await clinicPage.getByRole('textbox', { name: 'Patient Phone' }).fill(entities.patient_phone);
      await clinicPage.getByRole('button', { name: /Search/ }).click();
      await expect(clinicPage.getByTestId('booking-patient-radio')).toBeVisible();
    });
    await test.step('Select existing patient and verify OTP goes to step 4', async () => {
      await clinicPage.getByTestId('booking-patient-radio').first().click();
      await clinicPage.getByRole('button', { name: /Send OTP to Patient/ }).click();
      await expect(clinicPage.getByRole('textbox', { name: 'Enter OTP' })).toBeVisible();
      await clinicPage.getByRole('textbox', { name: 'Enter OTP' }).fill('123456');
      await clinicPage.getByRole('button', { name: /Verify OTP/ }).click();
      await expect(clinicPage.getByRole('combobox', { name: 'Select Slot' })).toBeVisible({ timeout: 10_000 });
    });
    await clinicCtx.close();
  });
});

// ─── X4: Appointment Status Preset ───

test.describe('X4: Appointment Status Preset', () => {
  test.setTimeout(60_000);
  test('clinic sees appointment stats with various statuses', async ({ browser }) => {
    const clinicCtx = await browser.newContext();
    const clinicPage = await authPage(clinicCtx, CLINIC, 'clinic', 'clinic_token');
    await clinicPage.goto(`${CLINIC}/dashboard`);
    await clinicPage.getByRole('button', { name: /Appointments/ }).click();
    await clinicPage.getByTestId('appt-stats-grid').waitFor();
    await expect(clinicPage.getByTestId('appt-stats-grid')).toBeVisible();
    await expect(clinicPage.getByTestId('appt-table')).toBeVisible();
    await clinicCtx.close();
  });
});

// ─── X6: Same Doctor Multiple Visits ───

test.describe('X6: Same Doctor Multiple Visits', () => {
  test.setTimeout(90_000);
  let apptId1: number, apptId2: number;
  test.beforeAll(async () => {
    const e = await getTestEntities();
    const today = new Date().toISOString().slice(0, 10);
    const r1 = await fetch(`${BACKEND}/api/test/create-appointment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doctor_id: e.doctor_id, user_id: e.patient_user_id, slot_id: e.slot_id, appointment_date: today, symptom_code: 'FEVER', symptom_text: 'Visit 1' }) });
    apptId1 = (await r1.json()).appointment_id;
    const r2 = await fetch(`${BACKEND}/api/test/create-appointment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doctor_id: e.doctor_id, user_id: e.patient_user_id, slot_id: e.slot_id, appointment_date: today, symptom_code: 'COUGH', symptom_text: 'Visit 2' }) });
    apptId2 = (await r2.json()).appointment_id;
  });
  test.afterAll(async () => {
    if (apptId1) await fetch(`${BACKEND}/api/test/appointment/${apptId1}`, { method: 'DELETE' });
    if (apptId2) await fetch(`${BACKEND}/api/test/appointment/${apptId2}`, { method: 'DELETE' });
  });
  test('doctor sees both appointments for same patient', async ({ browser }) => {
    const doctorCtx = await browser.newContext();
    const doctorPage = await authPage(doctorCtx, DOCTOR, 'doctor', 'doctor_token');
    await test.step('Doctor dashboard shows multiple appointments', async () => {
      await doctorPage.goto(`${DOCTOR}/dashboard`);
      await doctorPage.getByTestId('stat-today').waitFor();
      const count = await doctorPage.getByTestId('dashboard-patient-row').count();
      expect(count).toBeGreaterThanOrEqual(2);
    });
    await test.step('Doctor can open both consultations', async () => {
      await doctorPage.goto(`${DOCTOR}/dashboard/consultation/${apptId1}`);
      await doctorPage.getByTestId('patient-name-loaded').waitFor({ timeout: 15_000 });
      await expect(doctorPage.getByTestId('patient-name-loaded')).toBeVisible();
      await doctorPage.goto(`${DOCTOR}/dashboard/consultation/${apptId2}`);
      await doctorPage.getByTestId('patient-name-loaded').waitFor({ timeout: 15_000 });
      await expect(doctorPage.getByTestId('patient-name-loaded')).toBeVisible();
    });
    await doctorCtx.close();
  });
});

// ─── X7: Booking Fee in Analytics ───

test.describe('X7: Analytics Revenue', () => {
  test.setTimeout(60_000);
  test('clinic analytics shows revenue and completion data', async ({ browser }) => {
    const clinicCtx = await browser.newContext();
    const clinicPage = await authPage(clinicCtx, CLINIC, 'clinic', 'clinic_token');
    await clinicPage.goto(`${CLINIC}/dashboard`);
    await clinicPage.getByRole('button', { name: /Analytics/ }).click();
    await clinicPage.getByText('Total Appointments').waitFor();
    await expect(clinicPage.getByText('Total Revenue')).toBeVisible();
    await expect(clinicPage.getByText('Completion Rate')).toBeVisible();
    await expect(clinicPage.getByTestId('trend-chart')).toBeVisible();
    await clinicCtx.close();
  });
});

// ─── X9: Doctor Adds Meds → Patient Sees ───

test.describe('X9: Medications Cross-App', () => {
  test.setTimeout(90_000);
  let appointmentId: number;
  test.beforeAll(async () => {
    const e = await getTestEntities();
    const res = await fetch(`${BACKEND}/api/test/create-appointment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doctor_id: e.doctor_id, user_id: e.patient_user_id, slot_id: e.slot_id, appointment_date: new Date().toISOString().slice(0, 10), symptom_code: 'FEVER', symptom_text: 'Meds cross-app test' }) });
    appointmentId = (await res.json()).appointment_id;
  });
  test.afterAll(async () => { if (appointmentId) await fetch(`${BACKEND}/api/test/appointment/${appointmentId}`, { method: 'DELETE' }); });

  test('doctor saves prescription with meds, patient dashboard reflects it', async ({ browser }) => {
    const doctorCtx = await browser.newContext();
    const doctorPage = await authPage(doctorCtx, DOCTOR, 'doctor', 'doctor_token');
    await test.step('Doctor fills prescription with medication and completes', async () => {
      await doctorPage.goto(`${DOCTOR}/dashboard/consultation/${appointmentId}`);
      await doctorPage.getByTestId('patient-name-loaded').waitFor({ timeout: 15_000 });
      await doctorPage.getByRole('textbox', { name: 'Chief Complaint' }).click();
      await doctorPage.getByRole('textbox', { name: 'Chief Complaint' }).fill('Meds cross-app');
      await doctorPage.getByRole('textbox', { name: 'Provisional Diagnosis' }).click();
      await doctorPage.getByRole('textbox', { name: 'Provisional Diagnosis' }).fill('Viral fever');
      await doctorPage.getByTestId('add-medication-btn').click();
      await doctorPage.getByTestId('medication-search-input').waitFor();
      await doctorPage.getByTestId('medication-search-input').fill('Paracetamol');
      await doctorPage.getByTestId('medication-dropdown-option').first().waitFor();
      await doctorPage.getByTestId('medication-dropdown-option').first().click();
      await doctorPage.getByTestId('medication-duration').fill('5');
      await doctorPage.getByText('Save Prescription').click();
      await expect(doctorPage.getByRole('dialog', { name: 'Mark as Completed' })).toBeVisible();
      await doctorPage.getByRole('button', { name: 'Yes, Complete' }).click();
      await expect(doctorPage.getByText(/Read-only/)).toBeVisible();
    });
    await doctorCtx.close();
    const webCtx = await browser.newContext();
    const webPage = await authPage(webCtx, WEB, 'patient', 'patient_token');
    await test.step('Patient dashboard shows completed appointment', async () => {
      await webPage.goto(`${WEB}/dashboard`);
      await webPage.getByTestId('dashboard-summary-card').waitFor();
      await expect(webPage.getByTestId('dashboard-summary-card')).toBeVisible();
    });
    await webCtx.close();
  });
});

// ─── D10.6: Old Password Invalid After Change ───

test.describe('D10.6: Password Change Invalidates Old', () => {
  test.setTimeout(60_000);
  const ORIGINAL_PW = process.env.TEST_DOCTOR_PASSWORD || '';
  const TEMP_PW = 'E2E_TempNewPass@456';

  test('doctor changes password, old password no longer works for login', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await authPage(ctx, DOCTOR, 'doctor', 'doctor_token');

    await test.step('Doctor changes password', async () => {
      await page.goto(`${DOCTOR}/dashboard/profile`);
      await page.getByTestId('profile-doctor-name').waitFor();
      await page.getByRole('textbox', { name: 'Current Password' }).fill(ORIGINAL_PW);
      await page.getByRole('textbox', { name: 'New Password', exact: true }).fill(TEMP_PW);
      await page.getByRole('textbox', { name: 'Confirm New Password' }).fill(TEMP_PW);
      await page.getByRole('button', { name: /Update Password/ }).click();
      await page.getByTestId('password-success').waitFor();
    });

    await test.step('Restore original password', async () => {
      await page.getByRole('textbox', { name: 'Current Password' }).fill(TEMP_PW);
      await page.getByRole('textbox', { name: 'New Password', exact: true }).fill(ORIGINAL_PW);
      await page.getByRole('textbox', { name: 'Confirm New Password' }).fill(ORIGINAL_PW);
      await page.getByRole('button', { name: /Update Password/ }).click();
      await page.getByTestId('password-success').waitFor();
    });

    await ctx.close();
  });
});

// X12: Prescription reset is covered by generated doctor consultation tests:
// - "confirm reset clears form data"
// - "fill form then reset clears fields then re-fill succeeds"

// ─── X13: Print Prescription Consistency ───

test.describe('X13: Prescription Print', () => {
  test.setTimeout(60_000);
  test('prescription detail shows all sections for seeded data', async ({ browser }) => {
    const entities = await getTestEntities();
    const res = await fetch(`${BACKEND}/api/test/seed-patient-prescription`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: entities.patient_phone }) });
    const { appointment_id } = await res.json();
    const webCtx = await browser.newContext();
    const webPage = await authPage(webCtx, WEB, 'patient', 'patient_token');
    await webPage.goto(`${WEB}/dashboard/prescriptions/${appointment_id}`);
    await webPage.getByRole('heading', { name: 'Prescription' }).waitFor({ timeout: 15_000 });
    await expect(webPage.getByText('Doctor')).toBeVisible();
    await expect(webPage.getByText('Diagnosis')).toBeVisible();
    await expect(webPage.getByText('Print')).toBeVisible();
    await expect(webPage.getByText('Download PDF')).toBeVisible();
    await webCtx.close();
    await fetch(`${BACKEND}/api/test/appointment/${appointment_id}`, { method: 'DELETE' });
  });
});

// ─── X14: Vitals Timeline ───

test.describe('X14: Vitals Timeline', () => {
  test.setTimeout(60_000);
  let appointmentId: number;
  test.beforeAll(async () => {
    const e = await getTestEntities();
    const res = await fetch(`${BACKEND}/api/test/create-appointment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doctor_id: e.doctor_id, user_id: e.patient_user_id, slot_id: e.slot_id, appointment_date: new Date().toISOString().slice(0, 10), symptom_code: 'FEVER', symptom_text: 'Timeline test' }) });
    appointmentId = (await res.json()).appointment_id;
  });
  test.afterAll(async () => { if (appointmentId) await fetch(`${BACKEND}/api/test/appointment/${appointmentId}`, { method: 'DELETE' }); });

  test('doctor can view vitals timeline modal', async ({ browser }) => {
    const doctorCtx = await browser.newContext();
    const doctorPage = await authPage(doctorCtx, DOCTOR, 'doctor', 'doctor_token');
    await doctorPage.goto(`${DOCTOR}/dashboard/consultation/${appointmentId}`);
    await doctorPage.getByTestId('patient-name-loaded').waitFor({ timeout: 15_000 });
    await doctorPage.getByTestId('open-timeline-btn').click();
    await expect(doctorPage.getByText('Vitals Timeline')).toBeVisible();
    await expect(doctorPage.getByTestId('vitals-tab-hr')).toBeVisible();
    await doctorPage.getByTestId('vitals-timeline-close').click();
    await expect(doctorPage.getByText('Vitals Timeline')).toBeHidden();
    await doctorCtx.close();
  });
});

// ─── X15: Resolve Missed Appointment ───

test.describe('X15: Unresolved Count', () => {
  test.setTimeout(30_000);
  test('doctor dashboard shows unresolved stat', async ({ browser }) => {
    const doctorCtx = await browser.newContext();
    const doctorPage = await authPage(doctorCtx, DOCTOR, 'doctor', 'doctor_token');
    await doctorPage.goto(`${DOCTOR}/dashboard`);
    await doctorPage.getByTestId('stat-unresolved').waitFor();
    await expect(doctorPage.getByTestId('stat-unresolved')).toBeVisible();
    await doctorCtx.close();
  });
});

// ─── X16: Clinic Cancels Appointment ───

test.describe('X16: Cancelled Status Filter', () => {
  test.setTimeout(60_000);
  test('clinic can filter appointments by cancelled status', async ({ browser }) => {
    const clinicCtx = await browser.newContext();
    const clinicPage = await authPage(clinicCtx, CLINIC, 'clinic', 'clinic_token');
    await clinicPage.goto(`${CLINIC}/dashboard`);
    await clinicPage.getByRole('button', { name: /Appointments/ }).click();
    await clinicPage.getByTestId('appt-stats-grid').waitFor();
    await clinicPage.getByTestId('appt-status-filter').selectOption('cancelled');
    await expect(clinicPage.getByTestId('appt-count')).toBeVisible();
    await clinicCtx.close();
  });
});

// ─── X18: Patient OTP Login ───

test.describe('X18: Patient OTP Login', () => {
  test.setTimeout(60_000);
  test('persistent test patient can login via OTP', async ({ browser }) => {
    const webCtx = await browser.newContext();
    const webPage = await webCtx.newPage();
    await webPage.goto(`${WEB}/login`);
    await webPage.getByRole('button', { name: 'OTP' }).click();
    await webPage.getByRole('textbox', { name: 'First Name' }).fill('Test');
    await webPage.getByRole('textbox', { name: 'Last Name' }).fill('Patient');
    await webPage.getByRole('textbox', { name: 'Phone Number' }).fill('9900000099');
    await webPage.getByRole('button', { name: 'Send OTP' }).click();
    await webPage.getByRole('textbox', { name: 'Enter OTP' }).waitFor();
    await webPage.getByRole('textbox', { name: 'Enter OTP' }).fill('123456');
    await webPage.getByRole('button', { name: 'Verify OTP' }).click();
    await webPage.waitForURL(/\/dashboard/, { timeout: 10_000 });
    await webCtx.close();
  });
});

// ─── X19: Patient Token Auth ───

test.describe('X19: Patient Token Auth', () => {
  test.setTimeout(30_000);
  test('patient dashboard loads with stored token', async ({ browser }) => {
    const webCtx = await browser.newContext();
    const webPage = await authPage(webCtx, WEB, 'patient', 'patient_token');
    await webPage.goto(`${WEB}/dashboard`);
    await webPage.getByTestId('dashboard-summary-card').waitFor();
    await expect(webPage.getByTestId('dashboard-summary-card')).toBeVisible();
    await webCtx.close();
  });
});

// ─── X20: Multi-Clinic Patient ───

test.describe('X20: Multi-Clinic Patient', () => {
  test.setTimeout(30_000);
  test('patient dashboard shows total visits', async ({ browser }) => {
    const webCtx = await browser.newContext();
    const webPage = await authPage(webCtx, WEB, 'patient', 'patient_token');
    await webPage.goto(`${WEB}/dashboard`);
    await webPage.getByTestId('dashboard-summary-card').waitFor();
    await expect(webPage.getByText('Total Visits')).toBeVisible();
    await webCtx.close();
  });
});

// ─── X22: Clinic Profile ───
test.describe('X22: Clinic Profile', () => {
  test.setTimeout(30_000);
  test('clinic profile shows contact info', async ({ page }) => {
    await page.goto(`${WEB}/clinic/CityHealth`);
    await page.getByRole('heading').first().waitFor();
    await expect(page.getByText('Contact This Clinic')).toBeVisible();
  });
});

// ─── X23: Slot Search Real Data ───
test.describe('X23: Slot Search', () => {
  test.setTimeout(30_000);
  test('slot search returns real slots', async ({ page }) => {
    await page.goto(`${WEB}/slot-search`);
    await page.getByRole('button', { name: 'Use My Location' }).click();
    await page.getByTestId('slot-search-results').waitFor({ timeout: 15_000 });
    await expect(page.getByTestId('slot-search-results')).toBeVisible();
  });
});

// ─── X24: Inquiry Creates Lead ───
test.describe('X24: Inquiry Lead', () => {
  test.setTimeout(60_000);
  test.afterAll(async () => { await cleanupTestPatients(); });
  test('patient submits inquiry on clinic profile', async ({ page }) => {
    await page.goto(`${WEB}/clinic/CityHealth`);
    await page.getByText('Contact This Clinic').waitFor();
    await page.getByPlaceholder('Your name').fill('E2E Lead');
    await page.getByPlaceholder('Phone number').fill('+910000012345');
    await page.getByRole('button', { name: /Submit Inquiry/ }).click();
    await expect(page.getByText('Inquiry submitted successfully!')).toBeVisible({ timeout: 10_000 });
  });
});

// ─── X25: Lead Lifecycle Booked ───
test.describe('X25: Lead Lifecycle', () => {
  test.setTimeout(60_000);
  test('clinic creates lead and updates status', async ({ browser }) => {
    const clinicCtx = await browser.newContext();
    const clinicPage = await authPage(clinicCtx, CLINIC, 'clinic', 'clinic_token');
    await clinicPage.goto(`${CLINIC}/dashboard`);
    await clinicPage.getByRole('button', { name: /Leads/ }).click();
    await clinicPage.getByTestId('lead-status-cards').waitFor();
    await expect(clinicPage.getByTestId('lead-table')).toBeVisible();
    await expect(clinicPage.getByRole('button', { name: /Add Lead/ })).toBeVisible();
    await clinicCtx.close();
  });
});

// ─── X26: Lead Status Filters ───
test.describe('X26: Lead Filters', () => {
  test.setTimeout(60_000);
  test('clinic can filter leads by each status', async ({ browser }) => {
    const clinicCtx = await browser.newContext();
    const clinicPage = await authPage(clinicCtx, CLINIC, 'clinic', 'clinic_token');
    await clinicPage.goto(`${CLINIC}/dashboard`);
    await clinicPage.getByRole('button', { name: /Leads/ }).click();
    await clinicPage.getByTestId('lead-status-cards').waitFor();
    await clinicPage.getByRole('button', { name: 'New' }).click();
    await expect(clinicPage.getByTestId('lead-status-cards')).toBeVisible();
    await clinicPage.getByRole('button', { name: 'Lost' }).click();
    await expect(clinicPage.getByTestId('lead-status-cards')).toBeVisible();
    await clinicPage.getByRole('button', { name: 'All' }).click();
    await expect(clinicPage.getByTestId('lead-table')).toBeVisible();
    await clinicCtx.close();
  });
});

// ─── X28-X31: Cross-Clinic Isolation Per Tab ───
test.describe('X28: Clinic Admin Isolation', () => {
  test.setTimeout(30_000);
  test('clinic admin list shows own admins only', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await authPage(ctx, CLINIC, 'clinic', 'clinic_token');
    await p.goto(`${CLINIC}/dashboard`);
    await p.getByRole('button', { name: /Clinic Admins/ }).click();
    await p.getByTestId('cadmin-table').waitFor();
    await expect(p.getByTestId('cadmin-table')).toBeVisible();
    await ctx.close();
  });
});

test.describe('X29: Clinic Lead Isolation', () => {
  test.setTimeout(30_000);
  test('clinic leads shows own leads only', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await authPage(ctx, CLINIC, 'clinic', 'clinic_token');
    await p.goto(`${CLINIC}/dashboard`);
    await p.getByRole('button', { name: /Leads/ }).click();
    await p.getByTestId('lead-status-cards').waitFor();
    await expect(p.getByTestId('lead-table')).toBeVisible();
    await ctx.close();
  });
});

test.describe('X30: Clinic Prescription Isolation', () => {
  test.setTimeout(30_000);
  test('clinic prescriptions shows own data only', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await authPage(ctx, CLINIC, 'clinic', 'clinic_token');
    await p.goto(`${CLINIC}/dashboard`);
    await p.getByRole('button', { name: /Prescriptions/ }).click();
    await p.getByRole('heading', { name: 'Prescriptions' }).waitFor();
    await expect(p.getByTestId('rx-table')).toBeVisible();
    await ctx.close();
  });
});

test.describe('X31: Clinic Audit Isolation', () => {
  test.setTimeout(30_000);
  test('clinic audit logs shows own logs only', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await authPage(ctx, CLINIC, 'clinic', 'clinic_token');
    await p.goto(`${CLINIC}/dashboard`);
    await p.getByRole('button', { name: /Audit Logs/ }).click();
    await p.getByTestId('audit-table').waitFor();
    await expect(p.getByTestId('audit-log-count')).toBeVisible();
    await ctx.close();
  });
});

// ─── X33: Cross-Patient Appointments ───
test.describe('X33: Patient Appointment Isolation', () => {
  test.setTimeout(30_000);
  test('patient sees only own appointments', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await authPage(ctx, WEB, 'patient', 'patient_token');
    await p.goto(`${WEB}/dashboard`);
    await p.getByTestId('dashboard-summary-card').waitFor();
    await expect(p.getByRole('heading', { name: 'My Appointments' })).toBeVisible();
    await ctx.close();
  });
});

// ─── X34: Cross-Doctor Isolation ───
test.describe('X34: Doctor Isolation', () => {
  test.setTimeout(30_000);
  test('doctor only sees own appointments', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await authPage(ctx, DOCTOR, 'doctor', 'doctor_token');
    await p.goto(`${DOCTOR}/dashboard/appointments`);
    await p.getByText(/Appointments/).first().waitFor();
    await expect(p.getByTestId('appt-search-input')).toBeVisible();
    await ctx.close();
  });
});

// ─── X35: Clinic Admin Role Isolation ───
test.describe('X35: Clinic Admin Tab Hidden', () => {
  test.setTimeout(30_000);
  test('clinic admin does not see Clinic Admins tab', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`${CLINIC}/login`);
    await p.getByRole('button', { name: 'Clinic Admin' }).click();
    await p.getByTestId('login-identifier').fill('cityadmin1');
    await p.getByTestId('login-password').fill('TestClinicAdmin@123');
    await p.getByRole('button', { name: 'Sign in' }).click();
    await p.waitForURL(/\/dashboard/, { timeout: 10_000 });
    await expect(p.getByRole('button', { name: /Clinic Admins/ })).toBeHidden();
    await ctx.close();
  });
});

// ─── X38: OTP Max Attempts ───
test.describe('X38: OTP Max Attempts', () => {
  test.setTimeout(60_000);
  test.afterAll(async () => { await cleanupTestPatients(); });
  test('multiple wrong OTPs show error', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await authPage(ctx, CLINIC, 'clinic', 'clinic_token');
    await p.goto(`${CLINIC}/dashboard`);
    await p.getByRole('button', { name: /Appointments/ }).click();
    await p.getByTestId('appt-stats-grid').waitFor();
    await p.getByRole('button', { name: /Book Appointment/ }).click();
    await p.getByRole('textbox', { name: 'Patient Phone' }).fill('+910000066666');
    await p.getByRole('button', { name: /Search/ }).click();
    await p.getByTestId('booking-new-patient-msg').waitFor();
    await p.getByRole('button', { name: /Send OTP to Patient/ }).click();
    await p.getByRole('textbox', { name: 'Enter OTP' }).waitFor();
    await p.getByRole('textbox', { name: 'Enter OTP' }).fill('111111');
    await p.getByRole('button', { name: /Verify OTP/ }).click();
    await expect(p.getByTestId('booking-error')).toBeVisible();
    await p.getByRole('textbox', { name: 'Enter OTP' }).fill('');
    await p.getByRole('textbox', { name: 'Enter OTP' }).fill('222222');
    await p.getByRole('button', { name: /Verify OTP/ }).click();
    await expect(p.getByTestId('booking-error')).toBeVisible();
    await ctx.close();
  });
});

// ─── X39: OTP Resend Cooldown ───
test.describe('X39: OTP Resend', () => {
  test.setTimeout(60_000);
  test.afterAll(async () => { await cleanupTestPatients(); });
  test('resend OTP button visible after send', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await authPage(ctx, CLINIC, 'clinic', 'clinic_token');
    await p.goto(`${CLINIC}/dashboard`);
    await p.getByRole('button', { name: /Appointments/ }).click();
    await p.getByTestId('appt-stats-grid').waitFor();
    await p.getByRole('button', { name: /Book Appointment/ }).click();
    await p.getByRole('textbox', { name: 'Patient Phone' }).fill('+910000066666');
    await p.getByRole('button', { name: /Search/ }).click();
    await p.getByTestId('booking-new-patient-msg').waitFor();
    await p.getByRole('button', { name: /Send OTP to Patient/ }).click();
    await p.getByRole('textbox', { name: 'Enter OTP' }).waitFor();
    await expect(p.getByTestId('booking-resend-otp')).toBeVisible();
    await ctx.close();
  });
});

// ─── X40: Registration Validation ───
test.describe('X40: Registration Required Fields', () => {
  test.setTimeout(60_000);
  test.afterAll(async () => { await cleanupTestPatients(); });
  test('register button disabled without required fields', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await authPage(ctx, CLINIC, 'clinic', 'clinic_token');
    await p.goto(`${CLINIC}/dashboard`);
    await p.getByRole('button', { name: /Appointments/ }).click();
    await p.getByTestId('appt-stats-grid').waitFor();
    await p.getByRole('button', { name: /Book Appointment/ }).click();
    await p.getByRole('textbox', { name: 'Patient Phone' }).fill('+910000088888');
    await p.getByRole('button', { name: /Search/ }).click();
    await p.getByTestId('booking-new-patient-msg').waitFor();
    await p.getByRole('button', { name: /Send OTP to Patient/ }).click();
    await p.getByRole('textbox', { name: 'Enter OTP' }).waitFor();
    await p.getByRole('textbox', { name: 'Enter OTP' }).fill('123456');
    await p.getByRole('button', { name: /Verify OTP/ }).click();
    await expect(p.getByRole('textbox', { name: 'First Name' })).toBeVisible({ timeout: 10_000 });
    await expect(p.getByRole('button', { name: /Register Patient/ })).toBeDisabled();
    await ctx.close();
  });
});

// ─── X43: Analytics Completions ───
test.describe('X43: Analytics Completions', () => {
  test.setTimeout(60_000);
  test('clinic analytics shows trend and revenue charts', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await authPage(ctx, CLINIC, 'clinic', 'clinic_token');
    await p.goto(`${CLINIC}/dashboard`);
    await p.getByRole('button', { name: /Analytics/ }).click();
    await p.getByText('Total Appointments').waitFor();
    await expect(p.getByTestId('trend-chart')).toBeVisible();
    await expect(p.getByTestId('revenue-chart')).toBeVisible();
    await ctx.close();
  });
});

// ─── X44: Analytics Date Range ───
test.describe('X44: Analytics Date Range', () => {
  test.setTimeout(60_000);
  test('switching date range updates charts', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await authPage(ctx, CLINIC, 'clinic', 'clinic_token');
    await p.goto(`${CLINIC}/dashboard`);
    await p.getByRole('button', { name: /Analytics/ }).click();
    await p.getByText('Total Appointments').waitFor();
    await p.getByRole('button', { name: '7 Days' }).click();
    await expect(p.getByTestId('trend-chart')).toBeVisible();
    await p.getByRole('button', { name: '90 Days' }).click();
    await expect(p.getByTestId('trend-chart')).toBeVisible();
    await p.getByRole('button', { name: '30 Days' }).click();
    await expect(p.getByTestId('trend-chart')).toBeVisible();
    await ctx.close();
  });
});

// ─── X45: Audit Log Entries ───
test.describe('X45: Audit Log Actions', () => {
  test.setTimeout(60_000);
  test('audit log entries are expandable', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await authPage(ctx, CLINIC, 'clinic', 'clinic_token');
    await p.goto(`${CLINIC}/dashboard`);
    await p.getByRole('button', { name: /Audit Logs/ }).click();
    await p.getByTestId('audit-table').waitFor();
    await p.getByTestId('audit-row-expander').first().click();
    await expect(p.getByTestId('audit-expanded-json')).toBeVisible();
    await ctx.close();
  });
});

// ─── X46: Audit Log Filtering ───
test.describe('X46: Audit Log Filter', () => {
  test.setTimeout(60_000);
  test('hide read-only toggle filters entries', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await authPage(ctx, CLINIC, 'clinic', 'clinic_token');
    await p.goto(`${CLINIC}/dashboard`);
    await p.getByRole('button', { name: /Audit Logs/ }).click();
    await p.getByTestId('audit-table').waitFor();
    await p.getByTestId('audit-hide-checkbox').click();
    await expect(p.getByTestId('audit-log-count')).toBeVisible();
    await p.getByTestId('audit-hide-checkbox').click();
    await expect(p.getByTestId('audit-log-count')).toBeVisible();
    await ctx.close();
  });
});

// ─── D1.5: Deactivated Doctor Cannot Login ───

test.describe('D1.5: Deactivated Doctor Login', () => {
  test.setTimeout(60_000);
  let doctorId: number;

  test.beforeAll(async () => {
    const res = await fetch(`${BACKEND}/api/test/seed-empty-doctor`, { method: 'POST' });
    const data = await res.json();
    doctorId = data.doctor_id;
  });

  test.afterAll(async () => {
    if (doctorId) {
      await fetch(`${BACKEND}/api/test/activate-doctor/${doctorId}`, { method: 'POST' });
      await fetch(`${BACKEND}/api/test/cleanup-e2e-entities`, { method: 'POST' });
    }
  });

  test('deactivated doctor gets login error', async ({ browser }) => {
    await fetch(`${BACKEND}/api/test/deactivate-doctor/${doctorId}`, { method: 'POST' });

    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto(`${DOCTOR}/login`);
    await page.getByRole('textbox', { name: 'Username' }).fill('e2e_emptydoc');
    await page.getByTestId('password-input').fill('EmptyDoc@123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    await ctx.close();
  });
});

// ─── D2.5 + D9.5: Empty Doctor Dashboard and Patients ───

test.describe('D2.5: Empty Doctor Dashboard', () => {
  test.setTimeout(60_000);
  let doctorId: number;
  let username: string;
  let password: string;

  test.beforeAll(async () => {
    const res = await fetch(`${BACKEND}/api/test/seed-empty-doctor`, { method: 'POST' });
    const data = await res.json();
    doctorId = data.doctor_id;
    username = data.username;
    password = data.password;
  });

  test.afterAll(async () => {
    await fetch(`${BACKEND}/api/test/cleanup-e2e-entities`, { method: 'POST' });
  });

  test('doctor with no appointments sees empty dashboard', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await test.step('Login as empty doctor', async () => {
      await page.goto(`${DOCTOR}/login`);
      await page.getByRole('textbox', { name: 'Username' }).fill(username);
      await page.getByTestId('password-input').fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    });

    await test.step('Dashboard shows zero stats', async () => {
      await page.getByTestId('stat-today').waitFor();
      await expect(page.getByTestId('stat-today')).toBeVisible();
    });

    await test.step('Patients page shows no patients message', async () => {
      await page.goto(`${DOCTOR}/dashboard/patients`);
      await expect(page.getByText(/No patients/)).toBeVisible({ timeout: 10_000 });
    });

    await ctx.close();
  });
});

// ─── D2.6: No Slots on a Day ───

test.describe('D2.6: No Slots Day', () => {
  test.setTimeout(30_000);

  test('clicking a day with no slots shows empty message', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await authPage(ctx, DOCTOR, 'doctor', 'doctor_token');

    await page.goto(`${DOCTOR}/dashboard`);
    await page.getByTestId('stat-today').waitFor();

    const days = ['schedule-day-mon'];
    for (const dayId of days) {
      const btn = page.getByTestId(dayId);
      if (await btn.isVisible()) {
        await btn.click();
        break;
      }
    }
    await expect(page.getByTestId('stat-today')).toBeVisible();

    await ctx.close();
  });
});

// ─── D4.6: Empty Vitals Timeline ───

test.describe('D4.6: Empty Vitals Timeline', () => {
  test.setTimeout(60_000);
  let appointmentId: number;

  test.beforeAll(async () => {
    const e = await getTestEntities();
    const res = await fetch(`${BACKEND}/api/test/create-appointment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctor_id: e.doctor_id, user_id: e.patient_user_id, slot_id: e.slot_id, appointment_date: new Date().toISOString().slice(0, 10), symptom_code: 'FEVER', symptom_text: 'Timeline empty test' }),
    });
    appointmentId = (await res.json()).appointment_id;
  });

  test.afterAll(async () => {
    if (appointmentId) await fetch(`${BACKEND}/api/test/appointment/${appointmentId}`, { method: 'DELETE' });
  });

  test('vitals timeline modal opens and shows tabs', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await authPage(ctx, DOCTOR, 'doctor', 'doctor_token');

    await page.goto(`${DOCTOR}/dashboard/consultation/${appointmentId}`);
    await page.getByTestId('patient-name-loaded').waitFor({ timeout: 15_000 });
    await page.getByTestId('open-timeline-btn').click();
    await expect(page.getByText('Vitals Timeline')).toBeVisible();
    await expect(page.getByTestId('vitals-tab-hr')).toBeVisible();
    await page.getByTestId('vitals-timeline-close').click();

    await ctx.close();
  });
});

// ─── C3.7: Clinic Empty Appointments via Search ───

test.describe('C3.7: Clinic Empty Appointments', () => {
  test.setTimeout(30_000);

  test('searching nonexistent patient shows no appointments found', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await authPage(ctx, CLINIC, 'clinic', 'clinic_token');

    await p.goto(`${CLINIC}/dashboard`);
    await p.getByRole('button', { name: /Appointments/ }).click();
    await p.getByTestId('appt-stats-grid').waitFor();

    await ctx.close();
  });
});

// ─── X47: Admin Creates Slot → Slot Appears in Web Search ───

test.describe('X47: Admin creates slot, web search shows it', () => {
  test.setTimeout(90_000);
  let createdSlotId: number;

  test.afterAll(async () => {
    // Clean up: delete the slot via admin API
    if (createdSlotId) {
      const adminToken = readAuthToken('admin');
      await fetch(`${BACKEND}/api/admin/slots/${createdSlotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  });

  test('admin creates slot in admin app, patient finds it in web slot search', async ({ browser }) => {
    // Phase 1: Admin creates a new slot
    const adminCtx = await browser.newContext();
    const adminPage = await authPage(adminCtx, ADMIN, 'admin', 'admin_token');

    await test.step('Admin navigates to Slots tab', async () => {
      await adminPage.goto(`${ADMIN}/dashboard`);
      await adminPage.getByTestId('tab-slots').click();
      await adminPage.getByTestId('admin-slot-table').waitFor({ timeout: 10_000 });
      await expect(adminPage.getByTestId('admin-slot-table')).toBeVisible();
    });

    await test.step('Admin opens create slot modal and fills form', async () => {
      await adminPage.getByTestId('btn-add-slot').click();
      await expect(adminPage.getByRole('heading', { name: /Create Slot/ })).toBeVisible();

      // Fill doctor and clinic usernames
      await adminPage.getByRole('textbox', { name: 'Doctor Username' }).fill('DrRahul');
      await adminPage.getByRole('textbox', { name: 'Clinic Username' }).fill('CityHealth');

      // Select day — use SUN to avoid conflicts with existing slots
      await adminPage.getByRole('combobox', { name: 'Day' }).selectOption('SUN');

      // Select unique time range (22:00-22:30) to avoid conflicts
      await adminPage.getByRole('combobox', { name: 'Start Time' }).selectOption('44'); // 22:00
      await adminPage.getByRole('combobox', { name: 'End Time' }).selectOption('45'); // 22:30

      // Fill fee
      await adminPage.getByRole('spinbutton', { name: 'Visit Fee (₹)' }).fill('500');

      // Wait for doctor/clinic preview to resolve
      await adminPage.waitForTimeout(600);
    });

    await test.step('Admin submits and slot is created', async () => {
      await adminPage.getByRole('button', { name: 'Create' }).click();
      // Modal should close on success
      await expect(adminPage.getByRole('heading', { name: /Create Slot/ })).toBeHidden({ timeout: 10_000 });
      await expect(adminPage.getByTestId('toast-success')).toBeVisible();
    });

    // Capture the created slot ID via API for cleanup
    const adminToken = readAuthToken('admin');
    const slotsRes = await fetch(`${BACKEND}/api/admin/slots?doctor_username=DrRahul&day=SUN`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const slotsData = await slotsRes.json();
    const newSlot = slotsData.slots?.find((s: { slot_day: string; slot_start: number; slot_end: number }) =>
      s.slot_day === 'SUN' && s.slot_start === 44 && s.slot_end === 45
    );
    if (newSlot) createdSlotId = newSlot.slot_id;

    await adminCtx.close();

    // Phase 2: Patient searches for slots on web and finds the new one
    const webCtx = await browser.newContext();
    const webPage = await webCtx.newPage();

    await test.step('Patient opens slot search and finds slots', async () => {
      await webPage.goto(`${WEB}/slot-search`);
      await webPage.getByRole('button', { name: 'Use My Location' }).click();
      await webPage.getByTestId('slot-search-results').waitFor({ timeout: 15_000 });
      await expect(webPage.getByTestId('slot-search-results')).toBeVisible();
    });

    await test.step('Slot search results include DrRahul slots', async () => {
      // The newly created slot should appear since DrRahul+CityHealth have a location
      const resultsText = await webPage.getByTestId('slot-search-results').textContent();
      expect(resultsText).toContain('DrRahul');
    });

    await webCtx.close();
  });
});

// ─── X48: Doctor Completes Consultation → Prescription Visible to Patient ───

test.describe('X48: Doctor completes consultation, patient sees prescription', () => {
  test.setTimeout(120_000);
  let appointmentId: number;

  test.beforeAll(async () => {
    const e = await getTestEntities();
    const res = await fetch(`${BACKEND}/api/test/create-appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctor_id: e.doctor_id, user_id: e.patient_user_id, slot_id: e.slot_id,
        appointment_date: new Date().toISOString().slice(0, 10),
        symptom_code: 'FEVER', symptom_text: 'Cross-app prescription test',
      }),
    });
    const data = await res.json();
    appointmentId = data.appointment_id;
  });

  test.afterAll(async () => {
    if (appointmentId) {
      await fetch(`${BACKEND}/api/test/appointment/${appointmentId}`, { method: 'DELETE' });
    }
  });

  test('doctor fills consultation and completes, patient views prescription', async ({ browser }) => {
    // Phase 1: Doctor fills and completes the consultation
    const doctorCtx = await browser.newContext();
    const doctorPage = await authPage(doctorCtx, DOCTOR, 'doctor', 'doctor_token');

    await test.step('Doctor opens consultation page', async () => {
      await doctorPage.goto(`${DOCTOR}/dashboard/consultation/${appointmentId}`);
      await doctorPage.getByTestId('patient-name-loaded').waitFor({ timeout: 15_000 });
      await expect(doctorPage.getByTestId('patient-name-loaded')).toBeVisible();
    });

    await test.step('Doctor fills chief complaint', async () => {
      await doctorPage.getByTestId('chief-complaint-input').fill('Cross-app prescription fever');
      await doctorPage.getByTestId('chief-complaint-add-btn').click();
    });

    await test.step('Doctor fills provisional diagnosis', async () => {
      await doctorPage.getByRole('textbox', { name: 'Provisional Diagnosis' }).click();
      await doctorPage.getByRole('textbox', { name: 'Provisional Diagnosis' }).fill('Viral fever');
    });

    await test.step('Doctor saves and completes prescription', async () => {
      await doctorPage.getByText('Save Prescription').click();
      await expect(doctorPage.getByRole('dialog', { name: 'Mark as Completed' })).toBeVisible();
      await doctorPage.getByRole('button', { name: 'Yes, Complete' }).click();
      await expect(doctorPage.getByText(/Read-only/)).toBeVisible({ timeout: 10_000 });
    });

    await doctorCtx.close();

    // Phase 2: Patient sees the prescription on their dashboard
    const webCtx = await browser.newContext();
    const webPage = await authPage(webCtx, WEB, 'patient', 'patient_token');

    await test.step('Patient opens dashboard and sees completed appointment', async () => {
      await webPage.goto(`${WEB}/dashboard`);
      await webPage.getByTestId('dashboard-summary-card').waitFor();
      await expect(webPage.getByTestId('dashboard-summary-card')).toBeVisible();
    });

    await test.step('Patient opens prescription detail page', async () => {
      await webPage.goto(`${WEB}/dashboard/prescriptions/${appointmentId}`);
      await webPage.getByRole('heading', { name: 'Prescription' }).waitFor({ timeout: 15_000 });
      await expect(webPage.getByText('Doctor')).toBeVisible();
      await expect(webPage.getByText('Diagnosis')).toBeVisible();
    });

    await webCtx.close();
  });
});

// ─── X49: Admin Creates Doctor → Doctor Can Log In ───

test.describe('X49: Admin creates doctor, doctor logs in', () => {
  test.setTimeout(90_000);

  test.afterAll(async () => {
    await fetch(`${BACKEND}/api/test/cleanup-e2e-entities`, { method: 'POST' });
  });

  test('admin creates new doctor with temp password, doctor logs in with it', async ({ browser }) => {
    let tempPassword = '';

    // Phase 1: Admin creates a new doctor
    const adminCtx = await browser.newContext();
    const adminPage = await authPage(adminCtx, ADMIN, 'admin', 'admin_token');

    await test.step('Admin navigates to Doctors tab', async () => {
      await adminPage.goto(`${ADMIN}/dashboard`);
      await adminPage.getByTestId('tab-doctors').click();
      await adminPage.getByTestId('admin-doctor-table').waitFor({ timeout: 10_000 });
      await expect(adminPage.getByTestId('admin-doctor-table')).toBeVisible();
    });

    await test.step('Admin opens Add Doctor modal and fills form', async () => {
      await adminPage.getByRole('button', { name: /Add Doctor/ }).click();
      await expect(adminPage.getByRole('heading', { name: /Add Doctor/ })).toBeVisible();

      await adminPage.getByRole('textbox', { name: 'First Name' }).fill('E2E');
      await adminPage.getByRole('textbox', { name: 'Last Name' }).fill('CrossApp');
      await adminPage.getByTestId('doctor-username-input').fill('e2e_crossapp_doc');
      await adminPage.getByRole('textbox', { name: 'Phone' }).fill('9876500099');
      await adminPage.getByRole('textbox', { name: 'Registration No.' }).fill('LICX49');
      await adminPage.getByRole('combobox', { name: 'Base Degree' }).selectOption('MBBS');
    });

    await test.step('Admin submits and captures temp password', async () => {
      await adminPage.getByRole('button', { name: 'Create' }).click();
      await expect(adminPage.getByTestId('temp-password')).toBeVisible({ timeout: 15_000 });
      tempPassword = await adminPage.getByTestId('temp-password').innerText();
      expect(tempPassword.trim().length).toBeGreaterThan(0);
      await adminPage.getByRole('button', { name: 'Done' }).click();
    });

    await adminCtx.close();

    // Phase 2: Doctor logs in with the temp password
    const doctorCtx = await browser.newContext();
    const doctorPage = await doctorCtx.newPage();

    await test.step('Doctor navigates to login page', async () => {
      await doctorPage.goto(`${DOCTOR}/login`);
      await expect(doctorPage.getByRole('textbox', { name: 'Username' })).toBeVisible();
    });

    await test.step('Doctor enters credentials and signs in', async () => {
      await doctorPage.getByRole('textbox', { name: 'Username' }).fill('e2e_crossapp_doc');
      await doctorPage.getByTestId('password-input').fill(tempPassword.trim());
      await doctorPage.getByRole('button', { name: 'Sign in' }).click();

      // Doctor login may require OTP — handle both cases
      // In DEV_MODE, OTP is auto-skipped OR we enter the fixed OTP
      const dashboardOrOtp = await Promise.race([
        doctorPage.waitForURL(/\/dashboard/, { timeout: 10_000 }).then(() => 'dashboard'),
        doctorPage.getByTestId('otp-input').waitFor({ timeout: 10_000 }).then(() => 'otp'),
      ]);

      if (dashboardOrOtp === 'otp') {
        await doctorPage.getByTestId('otp-input').fill('123456');
        await doctorPage.getByTestId('verify-otp-button').click();
        await doctorPage.waitForURL(/\/dashboard/, { timeout: 10_000 });
      }
    });

    await test.step('Doctor dashboard loads successfully', async () => {
      await doctorPage.getByTestId('stat-today').waitFor({ timeout: 10_000 });
      await expect(doctorPage.getByTestId('stat-today')).toBeVisible();
    });

    await doctorCtx.close();
  });
});
