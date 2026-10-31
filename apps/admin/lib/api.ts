import { createApiClient } from "@swasthyaseva/ui";
import { getToken, clearToken } from "./auth";
import { API_URL } from "./env";

const request = createApiClient({
  baseUrl: API_URL,
  getToken,
  clearToken,
  onUnauthorized: () => { window.location.href = "/"; },
});

// ---------- Auth ----------
export async function login(
  username: string,
  password: string
): Promise<{ token: string }> {
  return request<{ token: string }>("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<void> {
  try {
    await request("/logout", { method: "POST" });
  } catch {
    // Ignore errors — we'll clear local token regardless
  }
}

// ---------- Doctors ----------
export type Doctor = {
  doctor_id: number;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  pfp_link: string | null;
  base_degree_code: string;
  postgrad_specialization_code: string | null;
  super_specialization_code: string | null;
  tag_1: string | null;
  tag_2: string | null;
  tag_3: string | null;
  bio: string | null;
  license_no: string;
  verified_doctor: boolean;
  banner_link: string | null;
  signature_link: string | null;
  prescription_format: string;
  is_deleted: boolean;
  created_at: string;
  base_degree_name: string | null;
  postgrad_name: string | null;
  super_spec_name: string | null;
  tag_1_name: string | null;
  tag_2_name: string | null;
  tag_3_name: string | null;
};

export async function getDoctors(includeDeleted = false, filters?: Record<string, string>): Promise<Doctor[]> {
  const res = await request<{ doctors: Doctor[] }>("/doctors/search", {
    method: "POST",
    body: JSON.stringify({ includeDeleted, filters }),
  });
  return res.doctors;
}

export async function createDoctor(
  data: Record<string, unknown>
): Promise<{ doctor: Doctor; temporaryPassword?: string }> {
  return request("/doctors", { method: "POST", body: JSON.stringify(data) });
}

export async function updateDoctor(
  id: number,
  data: Record<string, unknown>
): Promise<{ doctor: Doctor }> {
  return request(`/doctors/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteDoctor(id: number): Promise<void> {
  await request(`/doctors/${id}`, { method: "DELETE" });
}

export async function restoreDoctor(id: number): Promise<void> {
  await request(`/doctors/${id}/restore`, { method: "PATCH" });
}

// ---------- Clinics ----------
export type Clinic = {
  clinic_id: number;
  username: string;
  clinic_name: string | null;
  phone: string;
  license_no: string | null;
  pfp_link: string;
  verified: boolean;
  banner_link: string;
  street_address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  location_x: number;
  location_y: number;
  is_deleted: boolean;
  created_at: string;
};

export async function getClinics(includeDeleted = false, filters?: Record<string, string>): Promise<Clinic[]> {
  const res = await request<{ clinics: Clinic[] }>("/clinics/search", {
    method: "POST",
    body: JSON.stringify({ includeDeleted, filters }),
  });
  return res.clinics;
}

export async function createClinic(
  data: Record<string, unknown>
): Promise<{ clinic: Clinic; temporaryPassword?: string }> {
  return request("/clinics", { method: "POST", body: JSON.stringify(data) });
}

export async function updateClinic(
  id: number,
  data: Record<string, unknown>
): Promise<{ clinic: Clinic }> {
  return request(`/clinics/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteClinic(id: number): Promise<void> {
  await request(`/clinics/${id}`, { method: "DELETE" });
}

export async function restoreClinic(id: number): Promise<void> {
  await request(`/clinics/${id}/restore`, { method: "PATCH" });
}

// ---------- Clinic Managers ----------
export type ClinicManager = {
  clinic_admin_id: number;
  clinic_id: number;
  name: string;
  username: string;
  phone: string;
  pfp_link: string | null;
  is_deleted: boolean;
  created_at: string;
};

export async function getClinicManagers(
  clinicId?: number,
  includeDeleted = false,
  filters?: Record<string, string>
): Promise<ClinicManager[]> {
  const res = await request<{ managers: ClinicManager[] }>("/clinic-managers/search", {
    method: "POST",
    body: JSON.stringify({ 
      clinicId, 
      includeDeleted, 
      filters
    }),
  });
  return res.managers;
}

export async function createClinicManager(
  data: Record<string, unknown>
): Promise<{ manager: ClinicManager; temporaryPassword?: string }> {
  return request("/clinic-managers", { method: "POST", body: JSON.stringify(data) });
}

export async function updateClinicManager(
  id: number,
  data: Record<string, unknown>
): Promise<{ manager: ClinicManager }> {
  return request(`/clinic-managers/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteClinicManager(id: number): Promise<void> {
  await request(`/clinic-managers/${id}`, { method: "DELETE" });
}

export async function restoreClinicManager(id: number): Promise<void> {
  await request(`/clinic-managers/${id}/restore`, { method: "PATCH" });
}

// ---------- Slots ----------
export type Slot = {
  slot_id: number;
  clinic_id: number;
  doctor_id: number;
  slot_fee: number;
  booking_fee: number;
  slot_day: string;
  slot_start: number;
  slot_end: number;
  is_deleted: boolean;
  created_at: string;
  doctor_username: string | null;
  doctor_name: string | null;
  clinic_username: string | null;
  clinic_name: string | null;
  clinic_city: string | null;
  watermark_url: string | null;
};

export async function getSlots(
  filters?: {
    clinic_username?: string;
    doctor_username?: string;
    day?: string;
    tag?: string;
    includeDeleted?: boolean;
  }
): Promise<Slot[]> {
  const params = new URLSearchParams();
  if (filters?.clinic_username) params.set("clinic_username", filters.clinic_username);
  if (filters?.doctor_username) params.set("doctor_username", filters.doctor_username);
  if (filters?.day) params.set("day", filters.day);
  if (filters?.tag) params.set("tag", filters.tag);
  if (filters?.includeDeleted) params.set("includeDeleted", "true");
  const q = params.toString() ? `?${params}` : "";
  const res = await request<{ slots: Slot[] }>(`/slots${q}`);
  return res.slots;
}

export async function createSlot(
  data: Record<string, unknown>
): Promise<{ slot: Slot }> {
  return request("/slots", { method: "POST", body: JSON.stringify(data) });
}

export async function updateSlot(
  id: number,
  data: Record<string, unknown>
): Promise<{ slot: Slot }> {
  return request(`/slots/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteSlot(id: number): Promise<void> {
  await request(`/slots/${id}`, { method: "DELETE" });
}

export async function restoreSlot(id: number): Promise<void> {
  await request(`/slots/${id}/restore`, { method: "PATCH" });
}

// ---------- Lookups ----------
export type Specialization = {
  specialization_code: string;
  name: string;
};

export type Tag = {
  tag_code: string;
  name: string;
};

export type ExtraQualification = {
  qualification_code: string;
  name: string;
  type: 'fellowship' | 'diploma' | 'pdcc';
};

export async function getSpecializations(): Promise<Specialization[]> {
  const res = await request<{ specializations: Specialization[] }>("/specializations");
  return res.specializations;
}

export async function getTags(): Promise<Tag[]> {
  const res = await request<{ tags: Tag[] }>("/tags");
  return res.tags;
}

export async function getExtraQualifications(): Promise<ExtraQualification[]> {
  const res = await request<{ extraQualifications: ExtraQualification[] }>("/extra-qualifications");
  return res.extraQualifications;
}

// ---------- States ----------
export type StateOption = { value: string; label: string };

export async function getStates(): Promise<StateOption[]> {
  const res = await request<{ states: StateOption[] }>("/states");
  return res.states;
}

// ---------- Username Availability ----------
export async function checkDoctorUsername(username: string): Promise<{ available: boolean }> {
  return request<{ available: boolean }>(`/check-username/doctors?username=${encodeURIComponent(username)}`);
}

export async function checkClinicUsername(username: string): Promise<{ available: boolean }> {
  return request<{ available: boolean }>(`/check-username/clinics?username=${encodeURIComponent(username)}`);
}

export async function checkClinicManagerUsername(username: string, clinicId: number): Promise<{ available: boolean }> {
  return request<{ available: boolean }>(`/check-username/clinic-managers?username=${encodeURIComponent(username)}&clinic_id=${clinicId}`);
}

// ---------- Cloudinary ----------
export type CloudinarySignature = {
  timestamp: number;
  signature: string;
  api_key: string;
  cloud_name: string;
};

export async function getCloudinarySignature(): Promise<CloudinarySignature> {
  return request<CloudinarySignature>("/cloudinary-signature");
}

// ---------- Doctor Extra Qualifications ----------
export type DoctorExtraQualification = {
  doctor_id: number;
  qualification_code: string;
  created_at: string;
};

export async function getDoctorExtraQualifications(doctorId: number): Promise<DoctorExtraQualification[]> {
  const res = await request<{ qualifications: DoctorExtraQualification[] }>(`/doctors/${doctorId}/extra-qualifications`);
  return res.qualifications;
}

export async function addDoctorExtraQualification(doctorId: number, qualificationCode: string): Promise<DoctorExtraQualification> {
  const res = await request<{ qualification: DoctorExtraQualification }>(`/doctors/${doctorId}/extra-qualifications`, {
    method: "POST",
    body: JSON.stringify({ qualification_code: qualificationCode }),
  });
  return res.qualification;
}

export async function removeDoctorExtraQualification(doctorId: number, qualificationCode: string): Promise<void> {
  await request(`/doctors/${doctorId}/extra-qualifications/${qualificationCode}`, {
    method: "DELETE",
  });
}

export async function getAddressByMapUrl(url: string): Promise<{ resolved: string; lat?: string; lng?: string; street?: string; city?: string; state?: string; pincode?: string }> {
  const params = new URLSearchParams({ url });
  return request(`/address-by-map-url?${params}`);
}

export async function reverseGeocode(lat: string, lng: string): Promise<{ street: string; city: string; state: string; pincode: string }> {
  const params = new URLSearchParams({ lat, lng });
  return request(`/geocode/reverse?${params}`);
}

// ── Profile ──

export async function getAdminProfile(): Promise<{ profile: { admin_id: number; username: string } }> {
  return request("/profile");
}

export async function updateAdminProfile(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> {
  return request("/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ---------- Softboard ----------
export type SoftboardCard = {
  card_id: number;
  column_id: number;
  title: string;
  description: string | null;
  link_text: string | null;
  link_url: string | null;
  position: number;
  created_at: string;
};

export type SoftboardColumn = {
  column_id: number;
  title: string;
  position: number;
  created_at: string;
  cards: SoftboardCard[];
};

export async function getSoftboard(): Promise<{ columns: SoftboardColumn[] }> {
  return request("/softboard");
}
export async function createSoftboardColumn(title: string): Promise<{ column: SoftboardColumn }> {
  return request("/softboard/columns", { method: "POST", body: JSON.stringify({ title }) });
}
export async function updateSoftboardColumn(columnId: number, title: string): Promise<{ column: SoftboardColumn }> {
  return request(`/softboard/columns/${columnId}`, { method: "PATCH", body: JSON.stringify({ title }) });
}
export async function deleteSoftboardColumn(columnId: number): Promise<void> {
  await request(`/softboard/columns/${columnId}`, { method: "DELETE" });
}
export async function reorderSoftboardColumns(columnIds: number[]): Promise<void> {
  await request("/softboard/columns/reorder", { method: "PUT", body: JSON.stringify({ columnIds }) });
}
export async function createSoftboardCard(columnId: number, title: string, description?: string, link_text?: string, link_url?: string): Promise<{ card: SoftboardCard }> {
  return request("/softboard/cards", { method: "POST", body: JSON.stringify({ column_id: columnId, title, description, link_text, link_url }) });
}
export async function updateSoftboardCard(cardId: number, updates: Partial<Pick<SoftboardCard, 'title' | 'description' | 'link_text' | 'link_url'>>): Promise<{ card: SoftboardCard }> {
  return request(`/softboard/cards/${cardId}`, { method: "PATCH", body: JSON.stringify(updates) });
}
export async function deleteSoftboardCard(cardId: number): Promise<void> {
  await request(`/softboard/cards/${cardId}`, { method: "DELETE" });
}
export async function moveSoftboardCard(cardId: number, targetColumnId: number, targetPosition: number): Promise<{ card: SoftboardCard }> {
  return request("/softboard/cards/move", { method: "PUT", body: JSON.stringify({ cardId, targetColumnId, targetPosition }) });
}

export interface OtpEntry {
  loginId?: string;
  role?: string;
  phone: string;
  firstName?: string;
  userId?: number;
  otp: string | null;
  attempts: number;
  maxAttempts: number;
  sentAt: number | null;
  expiresAt: number;
  cooldownUntil: number | null;
}

export interface OtpMonitorData {
  loginOTPs: OtpEntry[];
  patientOTPs: OtpEntry[];
  debugNumbers: string[];
  devMode: boolean;
  serverTime: number;
}

export async function getOtpMonitor(): Promise<OtpMonitorData> {
  return request("/otp-monitor");
}
