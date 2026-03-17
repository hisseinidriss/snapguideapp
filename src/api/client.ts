// Central API client for Azure backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearToken() {
  localStorage.removeItem("auth_token");
}

export function hasToken(): boolean {
  return !!localStorage.getItem("auth_token");
}

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

export interface ApiError {
  message: string;
  status?: number;
}

export interface ApiResult<T> {
  data: T | null;
  error: ApiError | null;
}

export async function api<T = any>(
  path: string,
  options: ApiOptions = {}
): Promise<ApiResult<T>> {
  const { method = "GET", body, headers = {} } = options;

  const token = getToken();
  const reqHeaders: Record<string, string> = {
    ...headers,
  };
  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }
  if (body && !(body instanceof FormData)) {
    reqHeaders["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: reqHeaders,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ message: res.statusText }));
      return {
        data: null,
        error: { message: errBody.message || errBody.error || res.statusText, status: res.status },
      };
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return { data: null, error: null };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || "Network error" },
    };
  }
}

// Convenience methods
export const apiGet = <T = any>(path: string) => api<T>(path);
export const apiPost = <T = any>(path: string, body?: any) => api<T>(path, { method: "POST", body });
export const apiPut = <T = any>(path: string, body?: any) => api<T>(path, { method: "PUT", body });
export const apiPatch = <T = any>(path: string, body?: any) => api<T>(path, { method: "PATCH", body });
export const apiDelete = <T = any>(path: string) => api<T>(path, { method: "DELETE" });

// File upload helper
export async function apiUpload<T = any>(
  path: string,
  file: File,
  additionalFields?: Record<string, string>
): Promise<ApiResult<T>> {
  const formData = new FormData();
  formData.append("file", file);
  if (additionalFields) {
    for (const [key, value] of Object.entries(additionalFields)) {
      formData.append(key, value);
    }
  }
  return api<T>(path, { method: "POST", body: formData });
}
