import { createApiClient } from "@swasthyaseva/ui";
import { getToken, clearToken } from "./auth";
import { API_URL } from "./env";

const request = createApiClient({
  baseUrl: API_URL,
  getToken,
  clearToken,
  requireToken: true,
});

// ── Types ──

export type QueueAppointment = {
  appointment_id: number;
  user_id: number;
  patient_name: string;
  dob: string;
  gender: string;
  symptom_code: string;
  symptom_name: string;
  symptom_text: string;
  complaints: string;
  appointment_status: string;
  recommended_index: number;
  slot_id: number;
  clinic_id: number;
  appointment_date: string;
  visit_no?: number;
  patient_phone?: string | null;
  patient_address?: string | null;
  patient_occupation?: string | null;
  patient_attendant_name?: string | null;
  patient_attendant_relationship?: string | null;
  slot_start?: number;
  slot_end?: number;
};

export type ExaminationRecord = {
  examination_id: number;
  user_id: number;
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
  appointment_date?: string;
};

export type Prescription = {
  prescription_id: number;
  user_id: number;
  chief_complain: string;
  significant_medical_history: string | null;
  other_findings: string | null;
  provisional_diagnosis: string;
  final_diagnosis: string | null;
  prognosis: string | null;
  duration: number;
  refills: number;
  digital_signature: string | null;
  surgical_intervention_suggested: string | null;
  investigations_suggested: string | null;
  format_data: Record<string, unknown> | null;
};

export type Medication = {
  medication_id: number;
  medication_type: string;
  medicine_name: string;
  user_id: number;
  appointment_id: number;
  medicine_id: number | null;
  amount: number;
  dosage: number;
  frequency: number;
  route: string;
  duration_days: number;
  special_instructions: string | null;
  timings: string | null;
  conditional_instructions: string | null;
};

export type TestRequest = {
  request_id: number;
  user_id: number;
  appointment_id: number;
  test_name: string;
};

export type TestResult = {
  request_id: number;
  test_name: string;
  appointment_id: number;
  report_id: number | null;
  test_report_link: string | null;
  test_date: string | null;
  clinic_id: number | null;
};

export type Medicine = {
  medicine_id: number;
  medicine_name: string;
  medicine_no: string;
  precautions: string;
};

export type FullAppointmentData = {
  appointment: QueueAppointment & { clinic_id: number };
  prescription: Prescription | null;
  medications: Medication[];
  examination: ExaminationRecord | null;
  testRequests: TestRequest[];
  clinic: { name: string; address: string; phone: string } | null;
  doctor: { name: string; baseDegreeCode: string; licenseNo: string; phone: string; signatureLink: string | null } | null;
};

export type QueueAppointmentWithClinic = QueueAppointment & {
  clinic_name: string;
};

// ── Appointment Queue ──

export async function getTodayQueue(): Promise<{ appointments: QueueAppointment[] }> {
  return request("/appointments/today");
}

export async function getAppointments(opts?: {
  includePast?: boolean;
  dateFrom?: string;
  dateTo?: string;
  clinicIds?: number[];
  search?: string;
}): Promise<{ appointments: QueueAppointmentWithClinic[] }> {
  const params = new URLSearchParams();
  if (opts?.includePast) params.set("includePast", "true");
  if (opts?.dateFrom) params.set("dateFrom", opts.dateFrom);
  if (opts?.dateTo) params.set("dateTo", opts.dateTo);
  if (opts?.clinicIds?.length) params.set("clinicIds", opts.clinicIds.join(","));
  if (opts?.search) params.set("search", opts.search);
  const qs = params.toString();
  return request(`/appointments${qs ? `?${qs}` : ""}`);
}

export type DoctorClinic = {
  clinic_id: number;
  clinic_name: string;
};

export async function getDoctorClinics(): Promise<{ clinics: DoctorClinic[] }> {
  return request("/clinics");
}

export async function resolveAppointment(id: number): Promise<{ message: string }> {
  return request(`/appointments/${id}/resolve`, { method: "PATCH" });
}

export async function completeAppointment(id: number): Promise<{ message: string }> {
  return request(`/appointments/${id}/complete`, { method: "PATCH" });
}

export async function getFullAppointment(id: number): Promise<FullAppointmentData> {
  return request(`/appointments/${id}/full`);
}

// ── Examination (Vitals) ──

export async function upsertExamination(data: {
  appointmentId: number;
  height?: number;
  weight?: number;
  spSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  bloodSugar?: number;
  temperature?: number;
  waistCircumference?: number;
}): Promise<{ examination: ExaminationRecord }> {
  return request("/examination", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getVitalsHistory(userId: number): Promise<{ history: ExaminationRecord[] }> {
  return request(`/patients/${userId}/vitals-history`);
}

// ── Prescriptions ──

export async function savePrescription(data: {
  appointmentId: number;
  chiefComplain: string;
  significantMedicalHistory?: string;
  otherFindings?: string;
  surgicalInterventionSuggested?: string;
  investigationsSuggested?: string;
  formatData?: Record<string, unknown>;
  provisionalDiagnosis: string;
  finalDiagnosis?: string;
  prognosis?: string;
  duration: number;
  refills: number;
  vitals?: { height?: number; weight?: number; spSystolic?: number; bpDiastolic?: number; heartRate?: number; respiratoryRate?: number; oxygenSaturation?: number; temperature?: number; waistCircumference?: number };
  medications?: Array<{ medicationId?: number; medicineName?: string; medicationType?: string; route?: string; amount?: number; dosage?: number; frequency?: number; durationDays?: number; specialInstructions?: string }>;
}): Promise<{ prescription: Prescription }> {
  return request("/prescriptions/save", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function resetPrescription(appointmentId: number): Promise<{ message: string }> {
  return request(`/prescriptions/${appointmentId}/all`, {
    method: "DELETE",
  });
}

// ── Medications ──

export async function createMedication(data: {
  appointmentId: number;
  medicineName: string;
  medicationType: string;
  route: string;
  medicineId?: number;
  amount?: number;
  dosage?: number;
  frequency?: number;
  durationDays?: number;
  specialInstructions?: string;
}): Promise<{ medication: Medication }> {
  return request("/medications", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteMedication(id: number): Promise<void> {
  await request(`/medications/${id}`, { method: "DELETE" });
}

export async function getMedicines(): Promise<{ medicines: Medicine[] }> {
  return request("/medicines");
}

// ── Lab Tests ──

export async function createTestRequest(data: {
  appointmentId: number;
  testName: string;
}): Promise<{ testRequest: TestRequest }> {
  return request("/test-requests", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteTestRequest(id: number): Promise<void> {
  await request(`/test-requests/${id}`, { method: "DELETE" });
}

export async function getTestResults(userId: number): Promise<{ results: TestResult[] }> {
  return request(`/patients/${userId}/test-results`);
}

// ── Profile ──

export type DoctorProfile = {
  doctor_id: number;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  pfp_link: string | null;
  bio: string | null;
  license_no: string;
  verified_doctor: boolean;
  base_degree_name: string | null;
  postgrad_name: string | null;
  super_spec_name: string | null;
  tag_1_name: string | null;
  tag_2_name: string | null;
  tag_3_name: string | null;
  signature_link: string | null;
  banner_link: string | null;
  prescription_format: string;
  extra_qualifications: { qualification_code: string; name: string }[];
};

export async function getDoctorProfile(): Promise<{ profile: DoctorProfile }> {
  return request("/profile");
}

export async function updateDoctorProfile(data: {
  currentPassword?: string;
  newPassword?: string;
  pfp_link?: string;
}): Promise<{ message: string }> {
  return request("/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ── Cloudinary ──

export async function getCloudinarySignature(): Promise<{
  timestamp: number;
  signature: string;
  api_key: string;
  cloud_name: string;
}> {
  return request("/cloudinary-signature");
}

// ── Slots ──

export type DoctorSlot = {
  slot_id: number;
  clinic_id: number;
  doctor_id: number;
  slot_day: string;
  slot_start: number;
  slot_end: number;
  slot_fee: number;
  booking_fee: number;
  clinic_name: string;
  clinic_city: string;
};

export async function getDoctorSlots(): Promise<{ slots: DoctorSlot[] }> {
  return request("/slots");
}

// ── Dashboard ──

export type DashboardSummary = {
  todaySlots: { slot_id: number; slot_day: string; slot_start: number; slot_end: number; clinic_id: number; clinic_name: string; patient_count: number }[];
  unresolvedCount: number;
  todayStats: { total: number; completed: number; accepted: number; pending: number };
  weekSlots?: Record<string, { slot_id: number; slot_day: string; slot_start: number; slot_end: number; clinic_id: number; clinic_name: string; patient_count: number }[]>;
  visitTypes?: { firstTime: number; followUp: number };
  growth?: {
    thisWeek: { appointments: number; uniquePatients: number; completed: number };
    lastWeek: { appointments: number; uniquePatients: number; completed: number };
  };
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return request("/dashboard-summary");
}

// ── Patients ──

export type PatientListItem = {
  user_id: number;
  patient_name: string;
  gender: string;
  dob: string;
  last_visit: string;
  total_visits: number;
};

export async function getDoctorPatients(search?: string): Promise<{ patients: PatientListItem[] }> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const qs = params.toString();
  return request(`/patients${qs ? `?${qs}` : ""}`);
}

// ── Patient History ──

export type PrescriptionHistory = {
  prescription_id: number;
  chief_complain: string;
  significant_medical_history: string | null;
  provisional_diagnosis: string;
  final_diagnosis: string | null;
  other_findings: string | null;
  duration: number;
  appointment_date: string;
  symptom_text: string | null;
  complaints: string | null;
  doctor_id: number;
  doctor_first_name: string;
  doctor_last_name: string;
  doctor_username: string;
  clinic_id: number;
  clinic_name: string;
  clinic_username: string;
  medications: { medicine_name: string; amount: number; frequency: number; duration_days: number; special_instructions: string | null }[] | null;
};

export async function getPrescriptionHistory(userId: number): Promise<{ history: PrescriptionHistory[] }> {
  return request(`/patients/${userId}/prescription-history`);
}

// ── Login (unauthenticated) ──

export async function loginDoctor(
  username: string,
  password: string
): Promise<{ requires_otp?: boolean; loginId?: string; phone_masked?: string; token?: string }> {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  return data;
}

export async function verifyLoginOtp(
  loginId: string,
  otp: string
): Promise<{ token: string; attemptsRemaining?: number }> {
  const res = await fetch(`${API_URL}/verify-login-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId, otp }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (data.attemptsRemaining != null) {
      throw new Error(`Invalid OTP. ${data.attemptsRemaining} attempt(s) remaining.`);
    }
    throw new Error(data.message || "OTP verification failed");
  }
  return data;
}

export async function resendLoginOtp(
  loginId: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/resend-login-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to resend");
  return data;
}
