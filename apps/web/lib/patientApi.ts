import { createApiClient } from "@swasthyaseva/ui";
import { getToken, clearToken, saveToken } from "./auth";
import { PATIENT_API_URL } from "./env";

const BASE = PATIENT_API_URL;

const request = createApiClient({
  baseUrl: BASE,
  getToken,
  clearToken,
  onUnauthorized: () => { window.location.href = "/login"; },
});

// ── Auth (no Bearer token needed) ──

export async function loginPassword(data: {
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
}): Promise<{ token: string; user: { user_id: number; first_name: string } }> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
  saveToken(body.token);
  return body;
}

export async function requestOTP(data: {
  first_name: string;
  last_name: string;
  phone: string;
}): Promise<{ message: string }> {
  const res = await fetch(`${BASE}/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
  return body;
}

export async function verifyOTP(data: {
  first_name: string;
  last_name: string;
  phone: string;
  otp: string;
}): Promise<{ token: string; user: { user_id: number; first_name: string } }> {
  const res = await fetch(`${BASE}/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
  saveToken(body.token);
  return body;
}

// ── Prescriptions (authenticated) ──

export type PrescriptionListItem = {
  appointmentId: number;
  date: string;
  status: string;
  doctorName: string;
  clinicName: string;
  chiefComplain: string;
};

export type FullPrescription = {
  prescriptionFormat: string;
  prescription: {
    chiefComplain: string;
    significantMedicalHistory: string | null;
    otherFindings: string | null;
    provisionalDiagnosis: string;
    finalDiagnosis: string | null;
    prognosis: string | null;
    duration: number;
    refills: number;
    digitalSignature: string | null;
    surgicalInterventionSuggested: string | null;
    investigationsSuggested: string | null;
    formatData: Record<string, unknown>;
  };
  appointment: {
    appointmentId: number;
    date: string;
    status: string;
    symptomText: string;
    complaints: string;
    slotStart: number;
    slotEnd: number;
  };
  doctor: {
    name: string;
    licenseNo: string;
    signatureLink: string | null;
    baseDegreeCode: string;
    phone: string | null;
  };
  clinic: {
    name: string;
    address: string;
    phone: string;
  };
  patient: {
    name: string;
    dob: string;
    gender: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    occupation: string | null;
    attendantName: string | null;
    attendantRelationship: string | null;
  };
  watermarkUrl: string | null;
  medications: Array<{
    medication_id: number;
    medication_type: string;
    medicine_name: string;
    amount: number;
    dosage: number;
    frequency: number;
    route: string;
    duration_days: number;
    special_instructions: string | null;
    timings: string | null;
    conditional_instructions: string | null;
  }>;
  examination: {
    height: number | null;
    weight: number | null;
    sp_systolic: number | null;
    bp_diastolic: number | null;
    heart_rate: number | null;
    respiratory_rate: number | null;
    oxygen_saturation: number | null;
    blood_sugar: number | null;
    temperature: number | null;
    waist_circumference: number | null;
  } | null;
  testRequests: Array<{
    request_id: number;
    test_name: string;
    report_id: number | null;
    test_report_link: string | null;
    test_date: string | null;
  }>;
};

export async function getPrescriptions(): Promise<{ prescriptions: PrescriptionListItem[]; total: number }> {
  return request("/prescriptions");
}

export async function getPrescriptionDetail(appointmentId: number): Promise<FullPrescription> {
  return request(`/prescriptions/${appointmentId}`);
}

// ── Appointments ──

export type PatientAppointment = {
  appointment_id: number;
  appointment_date: string;
  appointment_status: string;
  symptom_text: string;
  complaints: string;
  slot_day: string;
  slot_start: number;
  slot_end: number;
  slot_fee: number;
  doctor_name: string;
  clinic_name: string;
  has_prescription: boolean;
};

export async function getPatientAppointments(opts?: {
  status?: 'upcoming' | 'past';
  dateFrom?: string;
  dateTo?: string;
  hasPrescription?: boolean;
}): Promise<{ appointments: PatientAppointment[] }> {
  const params = new URLSearchParams();
  if (opts?.status) params.set('status', opts.status);
  if (opts?.dateFrom) params.set('dateFrom', opts.dateFrom);
  if (opts?.dateTo) params.set('dateTo', opts.dateTo);
  if (opts?.hasPrescription) params.set('hasPrescription', 'true');
  const qs = params.toString();
  return request(`/appointments${qs ? `?${qs}` : ''}`);
}

// ── Dashboard ──

export type DashboardData = {
  nextAppointment: {
    appointment_id: number;
    date: string;
    status: string;
    doctor_name: string;
    clinic_name: string;
    slot_day: string;
    slot_start: number;
    slot_end: number;
    daysUntil: number;
  } | null;
  activeMedications: number;
  pendingLabResults: number;
  totalVisits: number;
  completedVisits: number;
};

export async function getPatientDashboard(): Promise<DashboardData> {
  return request('/dashboard');
}

export type ActiveMedication = {
  medicine_name: string;
  medication_type: string;
  amount: number;
  dosage: number;
  frequency: number;
  route: string;
  duration_days: number;
  special_instructions: string;
  appointment_date: string;
  days_elapsed: number;
  days_remaining: number;
  progress: number;
};

export async function getActiveMedications(): Promise<{ medications: ActiveMedication[] }> {
  return request('/active-medications');
}

// ── Profile ──

export type PatientProfile = {
  user_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  pfp_link: string | null;
  city: string;
  state: string;
  country: string;
  occupation: string | null;
};

export async function getPatientProfile(): Promise<{ profile: PatientProfile }> {
  return request("/profile");
}

export async function updatePatientProfile(data: {
  currentPassword?: string;
  newPassword?: string;
  pfp_link?: string;
  occupation?: string;
}): Promise<{ message: string }> {
  return request("/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getCloudinarySignature(): Promise<{ timestamp: number; signature: string; api_key: string; cloud_name: string }> {
  return request('/cloudinary-signature');
}
