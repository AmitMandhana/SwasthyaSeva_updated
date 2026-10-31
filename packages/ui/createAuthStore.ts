export function createAuthStore(tokenKey: string) {
  function saveToken(token: string): void {
    localStorage.setItem(tokenKey, token);
  }

  function getToken(): string | null {
    return localStorage.getItem(tokenKey);
  }

  function clearToken(): void {
    localStorage.removeItem(tokenKey);
  }

  function isTokenValid(): boolean {
    const token = getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  function getPayloadField(field: string): string | null {
    const token = getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload[field] ?? null;
    } catch {
      return null;
    }
  }

  return { saveToken, getToken, clearToken, isTokenValid, getPayloadField };
}
