import { API_URL } from "./env";

const BASE = API_URL;

export type PublicSlotDoctor = {
  doctor_id: number;
  username: string;
  first_name: string;
  last_name: string;
  pfp_link: string | null;
  base_degree_name: string | null;
  postgrad_name: string | null;
  super_spec_name: string | null;
  tag_1_name: string | null;
  tag_2_name: string | null;
  tag_3_name: string | null;
  bio: string | null;
};

export type PublicSlotClinic = {
  clinic_id: number;
  username: string;
  clinic_name: string | null;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  location_x: number;
  location_y: number;
};

export type PublicSlot = {
  slot_id: number;
  slot_fee: number;
  booking_fee: number;
  slot_day: string;
  slot_start: number;
  slot_end: number;
  distance_km: number;
  doctor: PublicSlotDoctor;
  clinic: PublicSlotClinic;
};

export type Tag = {
  tag_code: string;
  name: string;
};

export type SearchParams = {
  lat: number;
  lng: number;
  tags?: string[];
  maxDistanceKm?: number;
  minFee?: number;
  maxFee?: number;
  timeRanges?: string[];
  day?: string;
  days?: string[];
  name?: string;
};

export async function searchSlots(
  params: SearchParams,
  turnstileToken: string
): Promise<PublicSlot[]> {
  const res = await fetch(`${BASE}/slots/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Turnstile-Token": turnstileToken,
    },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
  return data.slots;
}

export async function getTags(): Promise<Tag[]> {
  const res = await fetch(`${BASE}/tags`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
  return data.tags;
}

// ── Doctor / Clinic Profiles ──

export type DoctorProfile = {
  doctor_id: number;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  pfp_link: string | null;
  banner_link: string | null;
  base_degree_name: string | null;
  postgrad_name: string | null;
  super_spec_name: string | null;
  tag_1_name: string | null;
  tag_2_name: string | null;
  tag_3_name: string | null;
  bio: string | null;
  license_no: string;
  verified_doctor: boolean;
  extra_qualifications: { qualification_code: string; name: string }[];
};

export type ClinicProfile = {
  clinic_id: number;
  username: string;
  clinic_name: string | null;
  phone: string;
  license_no: string | null;
  pfp_link: string;
  banner_link: string;
  verified: boolean;
  street_address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  location_x: number;
  location_y: number;
};

export async function getDoctorProfile(
  username: string
): Promise<DoctorProfile> {
  const res = await fetch(
    `${BASE}/doctors/${encodeURIComponent(username)}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
  return data.doctor;
}

export type DoctorScheduleSlot = {
  slot_id: number;
  day: string;
  start: number;
  end: number;
  fee: number;
  booking_fee: number;
  clinic: {
    clinic_id: number;
    username: string;
    name: string;
    city: string;
  };
};

export async function getDoctorSchedule(
  username: string
): Promise<DoctorScheduleSlot[]> {
  const res = await fetch(
    `${BASE}/doctors/${encodeURIComponent(username)}/schedule`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  return data.slots ?? [];
}

export async function getClinicProfile(
  username: string
): Promise<ClinicProfile> {
  const res = await fetch(
    `${BASE}/clinics/${encodeURIComponent(username)}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
  return data.clinic;
}

export async function submitInquiry(params: {
  clinic_id: number;
  patient_name: string;
  patient_phone: string;
  symptom_text?: string;
}): Promise<void> {
  const res = await fetch(`${BASE}/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
}
