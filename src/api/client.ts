// Central API client for Azure backend - Hissein
// All API calls to the Azure Functions backend are routed through this module
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://walkthru-api-hnhpfhg6e7erhvf0.uaenorth-01.azurewebsites.net";

// Retrieve stored JWT token from localStorage for authenticated requests
function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

// Store JWT token after successful login (3-14-2026)
export function setToken(token: string) {
  localStorage.setItem("auth_token", token);
}

// Clear token on logout to invalidate session
export function clearToken() {
  localStorage.removeItem("auth_token");
}

// Quick check if user has a stored auth token - Hissein
export function hasToken(): boolean {
  return !!localStorage.getItem("auth_token");
}

// Configuration options for API requests
interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

// Standardized error shape returned from API calls (Hissein 3-21-2026)
export interface ApiError {
  message: string;
  status?: number;
}

// Generic result wrapper - all API calls return { data, error } for consistent handling
export interface ApiResult<T> {
  data: T | null;
  error: ApiError | null;
}

/**
 * Core API function - sends HTTP requests to the Azure backend
 * Automatically attaches auth token and handles JSON serialization
 * Returns a standardized { data, error } result object (3-17-2026)
 */
export async function api<T = any>(
  path: string,
  options: ApiOptions = {}
): Promise<ApiResult<T>> {
  const { method = "GET", body, headers = {} } = options;

  // Attach authorization header if token exists
  const token = getToken();
  const reqHeaders: Record<string, string> = {
    ...headers,
  };
  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }
  // Set Content-Type for JSON bodies; FormData sets its own boundary header
  if (body && !(body instanceof FormData)) {
    reqHeaders["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: reqHeaders,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    // Parse error response body for meaningful error messages - Hissein
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ message: res.statusText }));
      return {
        data: null,
        error: { message: errBody.message || errBody.error || res.statusText, status: res.status },
      };
    }

    // Handle 204 No Content (e.g., DELETE responses)
    if (res.status === 204) {
      return { data: null, error: null };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err: any) {
    // Network errors (offline, DNS failure, CORS issues) (Hissein 3-21-2026)
    return {
      data: null,
      error: { message: err.message || "Network error" },
    };
  }
}

// Convenience methods for common HTTP verbs (3-11-2026)
export const apiGet = <T = any>(path: string) => api<T>(path);
export const apiPost = <T = any>(path: string, body?: any) => api<T>(path, { method: "POST", body });
export const apiPut = <T = any>(path: string, body?: any) => api<T>(path, { method: "PUT", body });
export const apiPatch = <T = any>(path: string, body?: any) => api<T>(path, { method: "PATCH", body });
export const apiDelete = <T = any>(path: string) => api<T>(path, { method: "DELETE" });

// File upload helper - wraps file in FormData and sends as multipart request - Hissein
export async function apiUpload<T = any>(
  path: string,
  file: File,
  additionalFields?: Record<string, string>
): Promise<ApiResult<T>> {
  const formData = new FormData();
  formData.append("file", file);
  // Attach any extra fields (e.g., type, app_id) to the upload request
  if (additionalFields) {
    for (const [key, value] of Object.entries(additionalFields)) {
      formData.append(key, value);
    }
  }
  return api<T>(path, { method: "POST", body: formData });
}