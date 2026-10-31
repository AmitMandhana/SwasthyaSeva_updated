import { createAuthStore } from "@swasthyaseva/ui";

const store = createAuthStore("patient_token");

export const { saveToken, getToken, clearToken, isTokenValid } = store;

export function getPatientName(): string | null {
  return store.getPayloadField("name");
}
