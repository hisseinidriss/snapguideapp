// Centralised HTTP client for the SnapGuide REST API.
// Base URL comes from VITE_API_BASE_URL (e.g. https://snapguide-api.azurewebsites.net/api).
// On Azure Static Web Apps with linked Functions, leave it empty so requests go to /api/*.

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
const API_BASE = RAW_BASE.replace(/\/$/, "");

export type ApiResult<T> = { data: T | null; error: { message: string } | null };

function url(path: string) {
  if (!path.startsWith("/")) path = "/" + path;
  return `${API_BASE}/api${path.replace(/^\/api/, "")}`;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url(path), {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return { data: null, error: null };
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      return { data: null, error: { message: json?.error || res.statusText } };
    }
    return { data: json as T, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message } };
  }
}

export const http = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};

// Helper: read a File as a base64 data URL (used for screenshot/icon uploads)
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
