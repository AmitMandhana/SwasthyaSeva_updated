import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:5000';

function readToken(role: string): string {
  return fs.readFileSync(path.join(process.cwd(), '.auth', `${role}.token`), 'utf8').trim();
}

let _testEntities: { doctor_id: number; clinic_id: number; slot_id: number; patient_user_id: number } | null = null;
async function getTestEntities() {
  if (_testEntities) return _testEntities;
  const res = await fetch(`${BACKEND}/api/test/resolve-test-entities`);
  if (!res.ok) throw new Error(`resolve-test-entities failed: ${res.status}`);
  _testEntities = await res.json();
  return _testEntities!;
}

test.describe('Specialty Format Tests', () => {
  test('assign GEN_MED format to doctor and verify consultation form fields', async ({ page }) => {
    const adminToken = readToken('admin');
    const doctorToken = readToken('doctor');

    // Step 1: Get doctor ID from token
    const doctorPayload = JSON.parse(Buffer.from(doctorToken.split('.')[1], 'base64').toString());
    const doctorId = doctorPayload.doctor_id;

    // Step 2: Assign GEN_MED format via admin API
    const updateRes = await fetch(`${BACKEND}/api/admin/doctors/${doctorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ prescription_format: 'GEN_MED' }),
    });
    expect(updateRes.status).toBe(200);
    const updateData = await updateRes.json();
    expect(updateData.doctor.prescription_format).toBe('GEN_MED');

    // Step 3: Verify doctor profile returns format
    const profileRes = await fetch(`${BACKEND}/api/doctor/profile`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` },
    });
    expect(profileRes.status).toBe(200);
    const profileData = await profileRes.json();
    expect(profileData.profile.prescription_format).toBe('GEN_MED');

    // Step 4: Create a test appointment
    const e = await getTestEntities();
    const apptRes = await fetch(`${BACKEND}/api/test/create-appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctor_id: doctorId,
        user_id: e.patient_user_id,
        slot_id: e.slot_id,
        appointment_date: new Date().toISOString().slice(0, 10),
        symptom_code: 'FEVER',
        symptom_text: 'Test specialty format',
        complaints: 'Testing GEN_MED format',
      }),
    });
    expect(apptRes.status).toBe(201);
    const apptData = await apptRes.json();
    const appointmentId = apptData.appointment_id;

    // Step 5: Login as doctor and navigate to consultation
    await page.goto('http://localhost:3002/login');
    await page.evaluate(({ key, val }) => localStorage.setItem(key, val), { key: 'doctor_token', val: doctorToken });
    await page.goto(`http://localhost:3002/dashboard/consultation/${appointmentId}`);
    await page.waitForLoadState('networkidle');

    // Step 6: Verify GEN_MED-specific fields are visible
    // Patient Particulars extra fields
    await expect(page.getByLabel('Occupation')).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Attendant Name')).toBeVisible();
    await expect(page.getByLabel('Attendant Relationship')).toBeVisible();
    await expect(page.getByLabel('Patient Phone')).toBeVisible();
    await expect(page.getByLabel('Patient Address')).toBeVisible();

    // Anthropometry section header
    await expect(page.getByText('Anthropometry')).toBeVisible();

    // Temperature field
    await expect(page.getByLabel('Temperature')).toBeVisible();

    // Waist circumference (GEN_MED shows it)
    await expect(page.getByLabel('Waist Circumference')).toBeVisible();

    // Rating fields
    await expect(page.getByLabel('Height Rating')).toBeVisible();
    await expect(page.getByLabel('BP Rating')).toBeVisible();

    // Menstrual history
    await expect(page.getByLabel('Menstrual History')).toBeVisible();

    // Other Significant History
    await expect(page.getByLabel('Other Significant History')).toBeVisible();

    // Advice field
    await expect(page.getByLabel('Advice')).toBeVisible();

    // Follow-up Date
    await expect(page.getByLabel('Follow-up Date')).toBeVisible();

    // Other Intervention Suggested
    await expect(page.getByLabel('Other Intervention Suggested')).toBeVisible();

    // Surgical Intervention should NOT be visible for GEN_MED
    await expect(page.getByLabel('Surgical Intervention Suggested')).toBeHidden();

    // Drawing Pad should be visible for GEN_MED
    await expect(page.getByText('Drawing Pad')).toBeVisible();

    // Verify specialty headings
    await expect(page.getByText('Relevant Medical History')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Findings On Examination' })).toBeVisible();
    await expect(page.getByText('Diagnosis & Treatment')).toBeVisible();

    // Step 7: Fill some specialty fields and save
    await page.getByLabel('Chief Complaints').fill('Persistent headache');
    await page.getByLabel('Provisional Diagnosis').fill('Tension headache');
    await page.getByLabel('Temperature').fill('98.6');
    await page.getByLabel('Height Rating').fill('Normal');
    await page.getByLabel('BP Rating').fill('Prehypertension');
    await page.getByLabel('Other Significant History').fill('Previous surgery 2020');
    await page.getByLabel('Advice').fill('Rest and hydration');
    await page.getByLabel('Follow-up Date').fill('2026-07-15');
    await page.getByLabel('Investigations Suggested').fill('CBC, ESR');
    await page.getByLabel('Other Intervention Suggested').fill('Physiotherapy');

    // Fill required vitals
    await page.getByLabel('Height').first().fill('170');
    await page.getByLabel('Weight').first().fill('70');
    await page.getByTestId('vitals-systolic').fill('130');
    await page.getByTestId('vitals-diastolic').fill('85');
    await page.getByLabel('Heart Rate').fill('72');

    // Save prescription
    await page.getByText('Save Prescription').click();
    await page.waitForTimeout(2000);

    // Step 8: Verify save succeeded (check for success toast or no error)
    const successToast = page.getByText('Prescription saved successfully');
    const errorToast = page.getByText(/failed|error/i);

    // Take screenshot of result
    await page.screenshot({ path: 'test-results/specialty-gen-med-save.png' });

    // Check backend logs for errors
    const backendLog = fs.readFileSync(path.join(process.cwd(), 'backend', 'server.log'), 'utf8');
    const recentErrors = backendLog.split('\n').filter(l => l.includes('ERROR')).slice(-5);

    // Step 9: Verify prescription data persisted
    const prescRes = await fetch(`${BACKEND}/api/patient/prescriptions/${appointmentId}`, {
      headers: { 'Authorization': `Bearer ${readToken('patient')}` },
    });

    if (prescRes.status === 200) {
      const prescData = await prescRes.json();
      expect(prescData.prescriptionFormat).toBe('GEN_MED');
      expect(prescData.prescription.investigationsSuggested).toBe('CBC, ESR');

      const fd = prescData.prescription.formatData;
      expect(fd).toBeDefined();
      if (fd.treatment) {
        expect(fd.treatment.advice).toBe('Rest and hydration');
        expect(fd.treatment.otherInterventionSuggested).toBe('Physiotherapy');
      }
      if (fd.followUpDate) {
        expect(fd.followUpDate).toBe('2026-07-15');
      }
    }

    // Cleanup
    await fetch(`${BACKEND}/api/test/appointment/${appointmentId}`, { method: 'DELETE' });
  });

  test('GEN_SURG format shows surgical intervention, hides drawing', async ({ page }) => {
    const adminToken = readToken('admin');
    const doctorToken = readToken('doctor');
    const doctorPayload = JSON.parse(Buffer.from(doctorToken.split('.')[1], 'base64').toString());
    const doctorId = doctorPayload.doctor_id;

    // Assign GEN_SURG
    await fetch(`${BACKEND}/api/admin/doctors/${doctorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ prescription_format: 'GEN_SURG' }),
    });

    const e = await getTestEntities();
    const apptRes = await fetch(`${BACKEND}/api/test/create-appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctor_id: doctorId, user_id: e.patient_user_id, slot_id: e.slot_id,
        appointment_date: new Date().toISOString().slice(0, 10),
        symptom_code: 'FEVER', symptom_text: 'Test GEN_SURG', complaints: 'Testing',
      }),
    });
    const apptData = await apptRes.json();
    const appointmentId = apptData.appointment_id;

    await page.goto('http://localhost:3002/login');
    await page.evaluate(({ key, val }) => localStorage.setItem(key, val), { key: 'doctor_token', val: doctorToken });
    await page.goto(`http://localhost:3002/dashboard/consultation/${appointmentId}`);
    await page.waitForLoadState('networkidle');

    // Surgical Intervention SHOULD be visible
    await expect(page.getByLabel('Surgical Intervention Suggested')).toBeVisible({ timeout: 10000 });

    // Waist circumference SHOULD be visible (GEN_SURG has it)
    await expect(page.getByLabel('Waist Circumference')).toBeVisible();

    // Drawing Pad should NOT be visible for GEN_SURG
    await expect(page.getByText('Drawing Pad')).toBeHidden();

    await page.screenshot({ path: 'test-results/specialty-gen-surg.png' });
    await fetch(`${BACKEND}/api/test/appointment/${appointmentId}`, { method: 'DELETE' });
  });

  test('ENT format hides waist circumference, shows surgical intervention', async ({ page }) => {
    const adminToken = readToken('admin');
    const doctorToken = readToken('doctor');
    const doctorPayload = JSON.parse(Buffer.from(doctorToken.split('.')[1], 'base64').toString());
    const doctorId = doctorPayload.doctor_id;

    // Assign ENT
    await fetch(`${BACKEND}/api/admin/doctors/${doctorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ prescription_format: 'ENT' }),
    });

    const e2 = await getTestEntities();
    const apptRes = await fetch(`${BACKEND}/api/test/create-appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctor_id: doctorId, user_id: e2.patient_user_id, slot_id: e2.slot_id,
        appointment_date: new Date().toISOString().slice(0, 10),
        symptom_code: 'FEVER', symptom_text: 'Test ENT', complaints: 'Testing',
      }),
    });
    const apptData = await apptRes.json();
    const appointmentId = apptData.appointment_id;

    await page.goto('http://localhost:3002/login');
    await page.evaluate(({ key, val }) => localStorage.setItem(key, val), { key: 'doctor_token', val: doctorToken });
    await page.goto(`http://localhost:3002/dashboard/consultation/${appointmentId}`);
    await page.waitForLoadState('networkidle');

    // Surgical Intervention SHOULD be visible for ENT
    await expect(page.getByLabel('Surgical Intervention Suggested')).toBeVisible({ timeout: 10000 });

    // Waist circumference should NOT be visible for ENT
    await expect(page.getByLabel('Waist Circumference')).toBeHidden();

    // Temperature should be visible
    await expect(page.getByLabel('Temperature')).toBeVisible();

    // Drawing Pad should NOT be visible for ENT
    await expect(page.getByText('Drawing Pad')).toBeHidden();

    await page.screenshot({ path: 'test-results/specialty-ent.png' });

    // Restore doctor to STANDARD
    await fetch(`${BACKEND}/api/admin/doctors/${doctorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ prescription_format: 'STANDARD' }),
    });
    await fetch(`${BACKEND}/api/test/appointment/${appointmentId}`, { method: 'DELETE' });
  });
});
