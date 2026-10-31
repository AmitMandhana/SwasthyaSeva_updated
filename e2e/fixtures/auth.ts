import * as fs from 'fs';
import * as path from 'path';

export type AuthRole = 'admin' | 'doctor' | 'clinic' | 'clinic_admin' | 'patient';
export type AppName = 'web' | 'admin' | 'doctor' | 'clinic';

const TOKEN_KEYS: Record<AppName, string> = {
  web: 'patient_token',
  admin: 'admin_token',
  doctor: 'doctor_token',
  clinic: 'clinic_token',
};

const ROLE_TO_APP: Record<AuthRole, AppName> = {
  admin: 'admin',
  doctor: 'doctor',
  clinic: 'clinic',
  clinic_admin: 'clinic',
  patient: 'web',
};

export function getTokenKey(app: AppName): string {
  return TOKEN_KEYS[app];
}

export function getAppForRole(role: AuthRole): AppName {
  return ROLE_TO_APP[role];
}

interface AuthCredentials {
  role: AuthRole;
  username?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  password: string;
}

function getCredentials(role: AuthRole): AuthCredentials {
  switch (role) {
    case 'admin':
      return {
        role,
        username: process.env.TEST_ADMIN_USERNAME || 'TestAdmin',
        password: process.env.TEST_ADMIN_PASSWORD || '',
      };
    case 'doctor':
      return {
        role,
        username: process.env.TEST_DOCTOR_USERNAME || 'e2e_doc_primary',
        password: process.env.TEST_DOCTOR_PASSWORD || '',
      };
    case 'clinic_admin':
      return {
        role,
        username: process.env.TEST_CLINIC_ADMIN_USERNAME || 'e2e_cadmin_primary',
        password: process.env.TEST_CLINIC_ADMIN_PASSWORD || '',
      };
    case 'clinic':
      return {
        role,
        phone: process.env.TEST_CLINIC_PHONE || '+910001000010',
        password: process.env.TEST_CLINIC_PASSWORD || '',
      };
    case 'patient':
      return {
        role,
        firstName: process.env.TEST_PATIENT_FIRST_NAME || 'E2E',
        lastName: process.env.TEST_PATIENT_LAST_NAME || 'TestPatient',
        phone: process.env.TEST_PATIENT_PHONE || '+910001000001',
        password: process.env.TEST_PATIENT_PASSWORD || '',
      };
  }
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function fetchToken(role: AuthRole): Promise<string> {
  const creds = getCredentials(role);
  let endpoint: string;
  let body: Record<string, string>;

  switch (role) {
    case 'admin':
      endpoint = `${BACKEND_URL}/api/admin/login`;
      body = { username: creds.username!, password: creds.password };
      break;
    case 'doctor':
      endpoint = `${BACKEND_URL}/api/doctor/login`;
      body = { username: creds.username!, password: creds.password };
      break;
    case 'clinic_admin':
      endpoint = `${BACKEND_URL}/api/clinic/login`;
      body = { username: creds.username!, password: creds.password };
      break;
    case 'clinic':
      endpoint = `${BACKEND_URL}/api/clinic/clinic-login`;
      body = { phone: creds.phone!, password: creds.password };
      break;
    case 'patient':
      endpoint = `${BACKEND_URL}/api/patient/login`;
      body = { first_name: creds.firstName!, last_name: creds.lastName!, phone: creds.phone!, password: creds.password };
      break;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (data.requires_otp && data.loginId) {
    let verifyEndpoint: string;
    if (role === 'doctor') verifyEndpoint = `${BACKEND_URL}/api/doctor/verify-login-otp`;
    else if (role === 'clinic_admin') verifyEndpoint = `${BACKEND_URL}/api/clinic/verify-login-otp`;
    else if (role === 'clinic') verifyEndpoint = `${BACKEND_URL}/api/clinic/clinic-verify-login-otp`;
    else throw new Error(`Unexpected 2FA for role ${role}`);

    const otpRes = await fetch(verifyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: data.loginId, otp: '123456' }),
    });
    const otpData = await otpRes.json();
    if (!otpData.token) throw new Error(`2FA verify failed for ${role}: ${JSON.stringify(otpData)}`);
    return otpData.token;
  }

  if (!data.token) throw new Error(`Auth failed for ${role}: ${JSON.stringify(data)}`);
  return data.token;
}

const TOKEN_DIR = path.join(process.cwd(), '.auth');

export function getTokenFilePath(role: AuthRole): string {
  return path.join(TOKEN_DIR, `${role}.token`);
}

export async function setupAuth(role: AuthRole): Promise<void> {
  if (!fs.existsSync(TOKEN_DIR)) fs.mkdirSync(TOKEN_DIR, { recursive: true });
  const token = await fetchToken(role);
  fs.writeFileSync(getTokenFilePath(role), token, 'utf8');
}

export function readAuthToken(role: AuthRole): string {
  return fs.readFileSync(getTokenFilePath(role), 'utf8').trim();
}

export function clearAllTokenFiles(): void {
  if (!fs.existsSync(TOKEN_DIR)) return;
  for (const file of fs.readdirSync(TOKEN_DIR)) {
    if (file.endsWith('.token')) {
      fs.unlinkSync(path.join(TOKEN_DIR, file));
    }
  }
}
