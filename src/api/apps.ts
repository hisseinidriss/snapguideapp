import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "./client";
import type { App } from "@/types/tour";

export const appsApi = {
  list: () => apiGet<App[]>("/api/apps"),
  get: (id: string) => apiGet<App>(`/api/apps/${id}`),
  create: (data: { name: string; url?: string; description?: string }) =>
    apiPost<App>("/api/apps", data),
  update: (id: string, data: Partial<App>) =>
    apiPatch<App>(`/api/apps/${id}`, data),
  delete: (id: string) => apiDelete(`/api/apps/${id}`),
  uploadIcon: (appId: string, file: File) =>
    apiUpload<{ icon_url: string }>("/api/upload", file, { type: "app-icon", app_id: appId }),
};
