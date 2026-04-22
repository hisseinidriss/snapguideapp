// Centralised HTTP client for the SnapGuide REST API.
//
// All API calls MUST go to the absolute Azure Function App URL — never to a
// relative path on the Static Web App origin. Routing requests through the
// SWA host produces 405s because the SWA does not host the API itself.
//
// Resolution order (consistent across dev, build, and production):
//   1. VITE_API_BASE_URL  — must be an absolute https?:// origin if provided
//   2. DEFAULT_API_BASE   — the deployed Azure Function App
//
// A relative value (empty string, "/", "/api", …) is rejected and replaced
// with the default so we never accidentally prefix the SWA domain.

const DEFAULT_API_BASE = "https://snapeguide1-hjakarahbzhcc2dk.uaenorth-01.azurewebsites.net";

function resolveApiBase(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
  if (raw.length === 0) return DEFAULT_API_BASE;
  if (!/^https?:\/\//i.test(raw)) {
    // Relative path or malformed value — refuse to use the SWA origin.
    if (typeof console !== "undefined") {
      console.warn(
        `[api] VITE_API_BASE_URL must be an absolute URL (got "${raw}"). Falling back to ${DEFAULT_API_BASE}.`
      );
    }
    return DEFAULT_API_BASE;
  }
  return raw;
}

const API_BASE = resolveApiBase().replace(/\/$/, "");

// Exposed for diagnostics/settings UIs.
export const API_BASE_URL = API_BASE;

export type ApiResult<T> = { data: T | null; error: { message: string } | null };

function url(path: string) {
  if (!path.startsWith("/")) path = "/" + path;
  return `${API_BASE}/api${path.replace(/^\/api/, "")}`;
}

// Public helper for callers (e.g. PDF generator) that need the absolute API URL
// without going through the JSON request() helper.
export function buildApiUrl(path: string) {
  return url(path);
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
