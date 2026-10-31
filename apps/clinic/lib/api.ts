import { createApiClient } from "@swasthyaseva/ui";
import { getToken, clearToken } from "./auth";
import { API_URL } from "./env";

const request = createApiClient({
  baseUrl: API_URL,
  getToken,
  clearToken,
  onUnauthorized: () => { window.location.href = "/login"; },
});

// ── Auth ──

export async function clinicEntityLogin(phone: string, password: string): Promise<{ token: string }> {
  const res = await fetch(`${API_URL}/clinic-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Login failed");
  return data as { token: string };
}

export async function loginClinic(
  endpoint: string,
  body: Record<string, unknown>
): Promise<{ requires_otp?: boolean; loginId?: string; phone_masked?: string; token?: string }> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  return data;
}

export async function verifyClinicLoginOtp(
  endpoint: string,
  loginId: string,
  otp: string
): Promise<{ token: string; attemptsRemaining?: number }> {
  const res = await fetch(`${API_URL}${endpoint}`, {
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

export async function resendClinicLoginOtp(
  endpoint: string,
  loginId: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to resend");
  return data;
}

export async function logout(): Promise<void> {
  clearToken();
}

// ── Cloudinary ──

export async function getCloudinarySignature(): Promise<{ timestamp: number; signature: string; api_key: string; cloud_name: string }> {
  return request('/cloudinary-signature');
}

// ── Profile ──

export type ClinicProfile = {
  role: string;
  profile: Record<string, unknown>;
  clinic_name?: string;
};

export async function getProfile(): Promise<ClinicProfile> {
  return request<ClinicProfile>("/profile");
}

// ── Appointments ──

export type Appointment = {
  appointment_id: number;
  patient_name: string;
  doctor_name: string;
  doctor_username: string;
  appointment_date: string;
  appointment_status: string;
  slot_day: string;
  slot_start: number;
  slot_end: number;
  slot_fee: number;
  symptom_code: string;
  symptom_name: string;
  symptom_text: string;
  visit_no: number;
  booked_at: string;
};

export type AppointmentStats = {
  pending: number;
  in_progress: number;
  completed: number;
  missed: number;
  cancelled: number;
};

export async function getAppointments(opts?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}): Promise<{ appointments: Appointment[]; total: number }> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.dateFrom) params.set("dateFrom", opts.dateFrom);
  if (opts?.dateTo) params.set("dateTo", opts.dateTo);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return request(`/appointments${qs ? `?${qs}` : ""}`);
}

export async function getAppointmentStats(): Promise<{ stats: AppointmentStats }> {
  return request("/appointments/stats");
}

// ── Clinic Admins ──

export type ClinicAdmin = {
  clinic_admin_id: number;
  clinic_id: number;
  name: string;
  username: string;
  phone: string;
  pfp_link: string | null;
  is_deleted: boolean;
  created_at: string;
};

export async function getClinicAdmins(
  includeDeleted = false,
  filters?: Record<string, string>
): Promise<{ managers: ClinicAdmin[] }> {
  const params = new URLSearchParams();
  if (includeDeleted) params.set("includeDeleted", "true");
  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.set(k, v);
    }
  }
  const qs = params.toString();
  return request(`/clinic-admins${qs ? `?${qs}` : ""}`);
}

export async function createClinicAdmin(
  data: Record<string, unknown>
): Promise<{ manager: ClinicAdmin; temporaryPassword?: string }> {
  return request("/clinic-admins", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateClinicAdmin(
  id: number,
  data: Record<string, unknown>
): Promise<{ manager: ClinicAdmin }> {
  return request(`/clinic-admins/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteClinicAdmin(id: number): Promise<void> {
  await request(`/clinic-admins/${id}`, { method: "DELETE" });
}

export async function restoreClinicAdmin(id: number): Promise<void> {
  await request(`/clinic-admins/${id}/restore`, { method: "PATCH" });
}

// ── Analytics ──

export type TrendPoint = {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
  missed: number;
  pending: number;
};

export type RevenuePoint = {
  date: string;
  total_revenue: number;
  cleared: number;
  advanced: number;
};

export type UtilizationRow = {
  doctor_id: number;
  doctor_name: string;
  slot_count: number;
  appointment_count: number;
};

export type TopDoctor = {
  doctor_id: number;
  doctor_name: string;
  pfp_link: string | null;
  appointment_count: number;
  completed: number;
};

export async function getAppointmentTrends(opts?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ trends: TrendPoint[] }> {
  const params = new URLSearchParams();
  if (opts?.dateFrom) params.set("dateFrom", opts.dateFrom);
  if (opts?.dateTo) params.set("dateTo", opts.dateTo);
  const qs = params.toString();
  return request(`/analytics/appointments${qs ? `?${qs}` : ""}`);
}

export async function getRevenueSummary(opts?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ revenue: RevenuePoint[] }> {
  const params = new URLSearchParams();
  if (opts?.dateFrom) params.set("dateFrom", opts.dateFrom);
  if (opts?.dateTo) params.set("dateTo", opts.dateTo);
  const qs = params.toString();
  return request(`/analytics/revenue${qs ? `?${qs}` : ""}`);
}

export async function getSlotUtilization(): Promise<{ utilization: UtilizationRow[] }> {
  return request("/analytics/utilization");
}

export async function getTopDoctors(
  limit = 10
): Promise<{ doctors: TopDoctor[] }> {
  return request(`/analytics/top-doctors?limit=${limit}`);
}

// ── Leads ──

export type Lead = {
  inquiry_id: number;
  clinic_id: number;
  patient_name: string;
  patient_phone: string;
  symptom_text: string | null;
  source: string;
  status: string;
  notes: string | null;
  slot_id: number | null;
  created_at: string;
  updated_at: string;
};

export async function getLeads(opts?: {
  status?: string;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ inquiries: Lead[]; total: number }> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.source) params.set("source", opts.source);
  if (opts?.search) params.set("search", opts.search);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return request(`/leads${qs ? `?${qs}` : ""}`);
}

export async function createLead(
  data: Record<string, unknown>
): Promise<{ inquiry: Lead }> {
  return request("/leads", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateLead(
  id: number,
  data: Record<string, unknown>
): Promise<{ inquiry: Lead }> {
  return request(`/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ── Audit Logs ──

export type AuditLog = {
  log_id: number;
  clinic_id: number;
  actor_role: string;
  actor_id: number;
  actor_name: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  endpoint: string;
  data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export async function getAuditLogs(opts?: {
  action?: string;
  exclude_action?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLog[]; total: number }> {
  const params = new URLSearchParams();
  if (opts?.action) params.set("action", opts.action);
  if (opts?.exclude_action) params.set("exclude_action", opts.exclude_action);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return request(`/audit-logs${qs ? `?${qs}` : ""}`);
}

// ── Prescriptions (metadata only) ──

export type PrescriptionListItem = {
  appointmentId: number;
  date: string;
  status: string;
  patientName: string;
  doctorName: string;
  chiefComplain: string;
};

export type PrescriptionDetail = {
  appointmentId: number;
  date: string;
  status: string;
  patientName: string;
  doctorName: string;
  chiefComplain: string;
  finalDiagnosis: string | null;
  medicationCount: number;
  testRequestCount: number;
};

export async function getPrescriptions(opts?: {
  dateFrom?: string;
  dateTo?: string;
  doctorId?: number;
  limit?: number;
  offset?: number;
}): Promise<{ prescriptions: PrescriptionListItem[]; total: number }> {
  const params = new URLSearchParams();
  if (opts?.dateFrom) params.set("dateFrom", opts.dateFrom);
  if (opts?.dateTo) params.set("dateTo", opts.dateTo);
  if (opts?.doctorId) params.set("doctorId", String(opts.doctorId));
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return request(`/prescriptions${qs ? `?${qs}` : ""}`);
}

export async function getPrescriptionDetail(appointmentId: number): Promise<PrescriptionDetail> {
  return request(`/prescriptions/${appointmentId}`);
}

// ── Booking Flow ──

export type SlotForBooking = {
  slot_id: number;
  clinic_id: number;
  doctor_id: number;
  slot_fee: number;
  booking_fee: number;
  slot_day: string;
  slot_start: number;
  slot_end: number;
  watermark_url: string | null;
  doctor_username: string | null;
  doctor_name: string | null;
};

export type SymptomOption = { symptom_code: string; name: string };
export type ComplaintOption = { complaint_code: string; name: string };

export type BookingLookupUser = { user_id: number; first_name: string; last_name: string };
export type BookingLookupResult = { found: boolean; users: BookingLookupUser[] };
export type BookingSendOTPResult = { bookingId: string };
export type BookingVerifyOTPResult = { authenticated: boolean; userId: number | null; attemptsRemaining?: number };
export type BookingRegisterResult = { user_id: number; first_name: string; last_name: string };

export async function getClinicSlots(): Promise<{ slots: SlotForBooking[] }> {
  return request("/slots");
}

export async function createClinicSlot(data: { doctor_id: number; slot_fee: number; booking_fee?: number; slot_day: string; slot_start: number; slot_end: number }): Promise<{ slot: SlotForBooking }> {
  return request("/slots", { method: "POST", body: JSON.stringify(data) });
}

export async function updateClinicSlot(slotId: number, data: Partial<{ slot_fee: number; booking_fee: number; slot_day: string; slot_start: number; slot_end: number; watermark_url: string | null }>): Promise<{ slot: SlotForBooking }> {
  return request(`/slots/${slotId}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteClinicSlot(slotId: number): Promise<void> {
  await request(`/slots/${slotId}`, { method: "DELETE" });
}

export async function restoreClinicSlot(slotId: number): Promise<void> {
  await request(`/slots/${slotId}/restore`, { method: "PATCH" });
}

export async function getSymptoms(): Promise<{ symptoms: SymptomOption[] }> {
  return request("/symptoms");
}

export async function getComplaints(): Promise<{ complaints: ComplaintOption[] }> {
  return request("/complaints");
}

export async function lookupPatient(
  phone: string
): Promise<BookingLookupResult> {
  return request("/booking/lookup", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function sendBookingOTP(
  phone: string,
  userId?: number
): Promise<BookingSendOTPResult> {
  return request("/booking/send-otp", {
    method: "POST",
    body: JSON.stringify({ phone, user_id: userId }),
  });
}

export async function verifyBookingOTP(
  bookingId: string,
  otp: string
): Promise<BookingVerifyOTPResult> {
  return request("/booking/verify-otp", {
    method: "POST",
    body: JSON.stringify({ bookingId, otp }),
  });
}

export async function registerBookingPatient(
  bookingId: string,
  patient: Record<string, unknown>
): Promise<BookingRegisterResult> {
  return request("/booking/register-patient", {
    method: "POST",
    body: JSON.stringify({ bookingId, patient }),
  });
}

export async function createBookingAppointment(
  data: Record<string, unknown>
): Promise<{ appointment: Appointment }> {
  return request("/booking/create-appointment", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Profile ──

export async function updateClinicProfile(data: {
  currentPassword?: string;
  newPassword?: string;
  pfp_link?: string;
}): Promise<{ message: string }> {
  return request("/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
