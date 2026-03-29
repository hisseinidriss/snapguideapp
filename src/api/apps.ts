// Application management API - CRUD for registered applications (3-13-2026)
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "./client";
import type { App } from "@/types/tour";

const APP_LANGUAGE_CACHE_KEY = "walkthru-app-enabled-languages";

function readLanguageCache(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(APP_LANGUAGE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLanguageCache(cache: Record<string, string[]>) {
  localStorage.setItem(APP_LANGUAGE_CACHE_KEY, JSON.stringify(cache));
}

function parseEnabledLanguages(value: unknown): string[] | null {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      return null;
    }
  }

  return null;
}

function cacheEnabledLanguages(appId: string, languages: string[]) {
  const cache = readLanguageCache();
  cache[appId] = languages;
  writeLanguageCache(cache);
}

function normalizeApp(app: App): App {
  const parsedLanguages = parseEnabledLanguages((app as Partial<App>).enabled_languages);
  const cachedLanguages = readLanguageCache()[app.id] || [];
  const enabledLanguages = parsedLanguages ?? cachedLanguages;

  cacheEnabledLanguages(app.id, enabledLanguages);

  return {
    ...app,
    enabled_languages: enabledLanguages,
  };
}

export const appsApi = {
  // Retrieve all registered applications
  list: async () => {
    const result = await apiGet<App[]>("/api/apps");
    return {
      ...result,
      data: result.data?.map(normalizeApp) || null,
    };
  },
  // Get details for a single application by ID - Hissein
  get: async (id: string) => {
    const result = await apiGet<App>(`/api/apps/${id}`);
    return {
      ...result,
      data: result.data ? normalizeApp(result.data) : null,
    };
  },
  // Register a new application with name, URL, and optional description
  create: async (data: { name: string; url?: string; description?: string }) => {
    const result = await apiPost<App>("/api/apps", data);
    return {
      ...result,
      data: result.data ? normalizeApp(result.data) : null,
    };
  },
  // Update app settings (name, URL, icon, languages, diagnostics toggle) (Hissein 3-21-2026)
  update: async (id: string, data: Partial<App>) => {
    if (data.enabled_languages) {
      cacheEnabledLanguages(id, data.enabled_languages);
    }

    const result = await apiPatch<App>(`/api/apps/${id}`, data);

    if (result.error && data.enabled_languages) {
      const cache = readLanguageCache();
      delete cache[id];
      writeLanguageCache(cache);
    }

    return {
      ...result,
      data: result.data ? normalizeApp(result.data) : null,
    };
  },
  // Delete an application and all associated tours, steps, and launchers
  delete: (id: string) => apiDelete(`/api/apps/${id}`),
  // Upload app icon image to Azure Blob Storage - Hissein
  uploadIcon: (appId: string, file: File) =>
    apiUpload<{ icon_url: string }>("/api/upload", file, { type: "app-icon", app_id: appId }),
};