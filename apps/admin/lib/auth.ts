import { createAuthStore } from "@swasthyaseva/ui";

export const { saveToken, getToken, clearToken, isTokenValid } = createAuthStore("admin_token");
