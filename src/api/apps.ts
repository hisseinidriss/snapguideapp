// Application management API - CRUD for registered applications (3-13-2026)
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "./client";
import type { App } from "@/types/tour";

export const appsApi = {
  // Retrieve all registered applications
  list: () => apiGet<App[]>("/api/apps"),
  // Get details for a single application by ID - Hissein
  get: (id: string) => apiGet<App>(`/api/apps/${id}`),
  // Register a new application with name, URL, and optional description
  create: (data: { name: string; url?: string; description?: string }) =>
    apiPost<App>("/api/apps", data),
  // Update app settings (name, URL, icon, languages, diagnostics toggle) (Hissein 3-21-2026)
  update: (id: string, data: Partial<App>) =>
    apiPatch<App>(`/api/apps/${id}`, data),
  // Delete an application and all associated tours, steps, and launchers
  delete: (id: string) => apiDelete(`/api/apps/${id}`),
  // Upload app icon image to Azure Blob Storage - Hissein
  uploadIcon: (appId: string, file: File) =>
    apiUpload<{ icon_url: string }>("/api/upload", file, { type: "app-icon", app_id: appId }),
};