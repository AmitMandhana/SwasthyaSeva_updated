// Field validators mirroring backend/validators/fields/*.js
// Each returns an error message string or null if valid.
// These do NOT check for "required" — that's the form schema runner's job.

// ── String field validators ──

export function validateUsername(v: string): string | null {
  if (v.length < 3) return "Must be at least 3 characters long";
  if (v.length > 50) return "Must be at most 50 characters long";
  if (!/^[a-zA-Z0-9._-]+$/.test(v)) return "Must contain only letters, numbers, dots, underscores, or hyphens";
  return null;
}

export function validateName(v: string): string | null {
  if (v.length > 40) return "Must be at most 40 characters long";
  if (!/^[a-zA-Z ]+$/.test(v)) return "Only alphabetic characters are allowed";
  return null;
}

export function validatePhone(v: string): string | null {
  const digits = v.replace(/^\+91/, "").replace(/\s/g, "");
  if (!/^\d{10}$/.test(digits)) return "Must have exactly 10 digits after +91";
  return null;
}

export function validateEmail(v: string): string | null {
  if (v.length > 100) return "Must be at most 100 characters long";
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v)) return "Invalid email format";
  const domain = v.split("@")[1];
  if (domain && domain.split(".").length > 5) return "Subdomain depth exceeds limit";
  return null;
}

export function validatePassword(v: string): string | null {
  if (v.length < 12) return "Password must be at least 12 characters long";
  if (v.length > 100) return "Password must be at most 100 characters long";
  if (!/[a-z]/.test(v)) return "Must contain lowercase letter";
  if (!/[A-Z]/.test(v)) return "Must contain uppercase letter";
  if (!/[0-9]/.test(v)) return "Must contain a digit";
  if (!/[!@#$%^&*]/.test(v)) return "Must contain a special character";
  return null;
}

export function validateDob(v: string): string | null {
  const d = new Date(v);
  if (isNaN(d.getTime())) return "Must be a valid date";
  if (d < new Date("1900-01-01")) return "Date cannot be before 1/1/1900";
  if (d > new Date()) return "Date cannot be in the future";
  return null;
}

export function validateGender(v: string): string | null {
  const GENDERS = ["male", "female", "other"];
  if (!GENDERS.includes(v.toLowerCase())) return `Gender must be one of: ${GENDERS.join(", ")}`;
  return null;
}

export function validateCity(v: string): string | null {
  if (v.length > 40) return "Must be at most 40 characters long";
  if (!/^[a-zA-Z0-9 ]*$/.test(v)) return "Must contain only letters, numbers, or spaces";
  return null;
}

export const VALID_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep", "Puducherry",
];

export function validateState(v: string): string | null {
  if (!VALID_STATES.includes(v)) return "Must be a valid Indian state/UT name";
  return null;
}

export function validateCountry(v: string): string | null {
  if (v.length > 40) return "Must be at most 40 characters long";
  if (!/^[a-zA-Z0-9 ]*$/.test(v)) return "Must contain only letters, numbers, or spaces";
  return null;
}

export function validateStreetAddress(v: string): string | null {
  if (v.length > 40) return "Must be at most 40 characters long";
  if (!/^[a-zA-Z0-9 ,.\-]*$/.test(v)) return "Must not contain special characters except , . -";
  return null;
}

export function validatePincode(v: string): string | null {
  if (!/^\d{6}$/.test(v.trim())) return "Pincode must be a 6-digit number";
  return null;
}

export function validateLicenseNo(v: string): string | null {
  if (v.length > 50) return "Must be at most 50 characters long";
  return null;
}

export function validateBio(v: string): string | null {
  if (v.length > 500) return "Must be at most 500 characters long";
  return null;
}

export function validateCode(v: string): string | null {
  if (v.length > 50) return "Must be at most 50 characters long";
  if (!/^[A-Z0-9_]+$/.test(v)) return "Must contain only uppercase letters, numbers, or underscores";
  return null;
}

export function validateLocationX(v: string): string | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return "Must be a valid number";
  if (n < -180 || n > 180) return "Must be between -180 and 180";
  return null;
}

export function validateLocationY(v: string): string | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return "Must be a valid number";
  if (n < -90 || n > 90) return "Must be between -90 and 90";
  return null;
}

export function validateUrl(v: string): string | null {
  if (v.length > 100) return "Must be at most 100 characters long";
  if (!/^https?:\/\/.+/.test(v)) return "Must be a valid URL starting with http:// or https://";
  return null;
}

export function validateClinicName(v: string): string | null {
  if (v.length > 20) return "Must be at most 20 characters long";
  return null;
}

export function validatePositiveInteger(v: string): string | null {
  const n = Number(v);
  if (!Number.isInteger(n)) return "Must be a whole number";
  if (n < 1) return "Must be a positive integer (greater than 0)";
  return null;
}

export function validateSlotFee(v: string): string | null {
  const n = Number(v);
  if (!Number.isInteger(n)) return "Must be a whole number";
  if (n < 1) return "Must be a positive integer (greater than 0)";
  return null;
}

export function validateSlotTime(v: string): string | null {
  const n = Number(v);
  if (!Number.isInteger(n)) return "Must be a whole number";
  if (n < 0 || n > 47) return "Must be between 0 and 47";
  return null;
}

export function validateSlotDay(v: string): string | null {
  const VALID_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  if (!VALID_DAYS.includes(v.toUpperCase())) return `Must be one of: ${VALID_DAYS.join(", ")}`;
  return null;
}

export function validatePrescriptionFormat(v: string): string | null {
  const VALID_FORMATS = ["GEN_MED", "GEN_SURG", "ENT"];
  if (!VALID_FORMATS.includes(v.toUpperCase())) return `Must be one of: ${VALID_FORMATS.join(", ")}`;
  return null;
}

// ── Schema types ──

export type FieldDef = {
  validate: (v: string) => string | null;
  required: boolean;
};

export type FormSchema = Record<string, FieldDef>;
export type FieldErrors = Record<string, string>;

// ── Form validation runner ──

export function validateForm(schema: FormSchema, data: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {};
  for (const [field, def] of Object.entries(schema)) {
    const value = (data[field] ?? "").trim();
    if (!value) {
      if (def.required) errors[field] = "This field is required";
    } else {
      const err = def.validate(value);
      if (err) errors[field] = err;
    }
  }
  return errors;
}

// ── Pre-built form schemas mirroring backend/validators/schemas/ ──

const noValidate = () => null;

export const createDoctorSchema: FormSchema = {
  username: { required: true, validate: validateUsername },
  first_name: { required: true, validate: validateName },
  last_name: { required: true, validate: validateName },
  phone: { required: true, validate: validatePhone },
  base_degree_code: { required: true, validate: validateCode },
  license_no: { required: true, validate: validateLicenseNo },
  pfp_link: { required: false, validate: validateUrl },
  banner_link: { required: false, validate: validateUrl },
  signature_link: { required: false, validate: validateUrl },
  postgrad_specialization_code: { required: false, validate: validateCode },
  super_specialization_code: { required: false, validate: validateCode },
  bio: { required: false, validate: validateBio },
  password: { required: false, validate: validatePassword },
  prescription_format: { required: false, validate: validatePrescriptionFormat },
};

export const updateDoctorSchema: FormSchema = {
  first_name: { required: false, validate: validateName },
  last_name: { required: false, validate: validateName },
  phone: { required: false, validate: validatePhone },
  license_no: { required: false, validate: validateLicenseNo },
  pfp_link: { required: false, validate: validateUrl },
  banner_link: { required: false, validate: validateUrl },
  signature_link: { required: false, validate: validateUrl },
  postgrad_specialization_code: { required: false, validate: validateCode },
  super_specialization_code: { required: false, validate: validateCode },
  bio: { required: false, validate: validateBio },
  password: { required: false, validate: validatePassword },
  prescription_format: { required: false, validate: validatePrescriptionFormat },
};

export const createClinicSchema: FormSchema = {
  username: { required: true, validate: validateUsername },
  phone: { required: true, validate: validatePhone },
  license_no: { required: true, validate: validateLicenseNo },
  street_address: { required: true, validate: validateStreetAddress },
  city: { required: true, validate: validateCity },
  pfp_link: { required: false, validate: validateUrl },
  banner_link: { required: false, validate: validateUrl },
  state: { required: false, validate: validateState },
  pincode: { required: false, validate: validatePincode },
  location_x: { required: false, validate: validateLocationX },
  location_y: { required: false, validate: validateLocationY },
  clinic_name: { required: false, validate: validateClinicName },
  country: { required: false, validate: validateCountry },
  password: { required: false, validate: validatePassword },
};

export const updateClinicSchema: FormSchema = {
  phone: { required: false, validate: validatePhone },
  license_no: { required: false, validate: validateLicenseNo },
  street_address: { required: false, validate: validateStreetAddress },
  city: { required: false, validate: validateCity },
  pfp_link: { required: false, validate: validateUrl },
  banner_link: { required: false, validate: validateUrl },
  state: { required: false, validate: validateState },
  pincode: { required: false, validate: validatePincode },
  location_x: { required: false, validate: validateLocationX },
  location_y: { required: false, validate: validateLocationY },
  clinic_name: { required: false, validate: validateClinicName },
  country: { required: false, validate: validateCountry },
  password: { required: false, validate: validatePassword },
};

export const createClinicManagerSchema: FormSchema = {
  clinic_id: { required: true, validate: validatePositiveInteger },
  name: { required: true, validate: validateName },
  username: { required: true, validate: validateUsername },
  phone: { required: true, validate: validatePhone },
  pfp_link: { required: false, validate: validateUrl },
  password: { required: false, validate: validatePassword },
};

export const updateClinicManagerSchema: FormSchema = {
  name: { required: false, validate: validateName },
  phone: { required: false, validate: validatePhone },
  pfp_link: { required: false, validate: validateUrl },
  password: { required: false, validate: validatePassword },
};

export const createSlotSchema: FormSchema = {
  clinic_id: { required: true, validate: validatePositiveInteger },
  doctor_id: { required: true, validate: validatePositiveInteger },
  slot_fee: { required: true, validate: validateSlotFee },
  slot_day: { required: true, validate: validateSlotDay },
  slot_start: { required: true, validate: validateSlotTime },
  slot_end: { required: true, validate: validateSlotTime },
};

export const updateSlotSchema: FormSchema = {
  slot_fee: { required: false, validate: validateSlotFee },
  slot_day: { required: false, validate: validateSlotDay },
  slot_start: { required: false, validate: validateSlotTime },
  slot_end: { required: false, validate: validateSlotTime },
};

export const createUserSchema: FormSchema = {
  first_name: { required: true, validate: validateName },
  last_name: { required: true, validate: validateName },
  phone: { required: true, validate: validatePhone },
  email: { required: false, validate: validateEmail },
  dob: { required: true, validate: validateDob },
  gender: { required: true, validate: validateGender },
  street_address: { required: true, validate: validateStreetAddress },
  city: { required: true, validate: validateCity },
  state: { required: true, validate: validateState },
  country: { required: true, validate: validateCountry },
  location_x: { required: true, validate: validateLocationX },
  location_y: { required: true, validate: validateLocationY },
  occupation: { required: false, validate: noValidate },
  attendant_name: { required: false, validate: noValidate },
  attendant_relationship: { required: false, validate: noValidate },
};

export const adminLoginSchema: FormSchema = {
  username: { required: true, validate: validateUsername },
  password: { required: true, validate: noValidate },
};

export const passwordChangeSchema: FormSchema = {
  currentPassword: { required: true, validate: noValidate },
  newPassword: { required: true, validate: validatePassword },
  confirmPassword: { required: true, validate: noValidate },
};
