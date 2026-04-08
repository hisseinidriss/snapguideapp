// Application management API - CRUD for registered applications
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "./client";
import type { App } from "@/types/app";

export const appsApi = {
  list: async () => apiGet<App[]>("/api/apps"),
  get: async (id: string) => apiGet<App>(`/api/apps/${id}`),
  create: async (data: { name: string; url?: string; description?: string }) =>
    apiPost<App>("/api/apps", data),
  update: async (id: string, data: Partial<App>) =>
    apiPatch<App>(`/api/apps/${id}`, data),
  delete: (id: string) => apiDelete(`/api/apps/${id}`),
  uploadIcon: (appId: string, file: File) =>
    apiUpload<{ icon_url: string }>("/api/upload", file, { type: "app-icon", app_id: appId }),
};
