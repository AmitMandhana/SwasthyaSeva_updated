export interface ApiClientConfig {
  baseUrl: string;
  getToken: () => string | null;
  clearToken: () => void;
  requireToken?: boolean;
  onUnauthorized?: () => void;
}

export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, getToken, clearToken, requireToken = false, onUnauthorized } = config;

  return async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    if (requireToken && !token) throw new Error("Not authenticated");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });

    if (res.status === 401) {
      clearToken();
      if (onUnauthorized) onUnauthorized();
      throw new Error("Session expired");
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (data.issues && Array.isArray(data.issues)) {
        const details = data.issues.map((i: { field: string; message: string }) => `${i.field}: ${i.message}`).join("\n");
        throw new Error(details);
      }
      throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
    }

    return data as T;
  };
}
