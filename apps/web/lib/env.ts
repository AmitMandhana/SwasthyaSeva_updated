export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/public";
export const PATIENT_API_URL = process.env.NEXT_PUBLIC_PATIENT_API_URL ?? "http://localhost:5000/api/patient";
export const BACKEND_ORIGIN = new URL(API_URL).origin;
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
export const DEV_MODE = process.env.DEV_MODE === "true";
