import { createAuthStore } from "@swasthyaseva/ui";

const store = createAuthStore("clinic_token");

export const { saveToken, getToken, clearToken, isTokenValid } = store;

export function getUserRole(): string | null {
  return store.getPayloadField("role");
}
