import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import type { Launcher } from "@/types/tour";

export const launchersApi = {
  list: (appId: string) => apiGet<Launcher[]>(`/api/launchers?app_id=${appId}`),
  create: (data: { app_id: string; name: string; type: string }) =>
    apiPost<Launcher>("/api/launchers", data),
  update: (id: string, data: Partial<Launcher>) =>
    apiPatch<Launcher>(`/api/launchers/${id}`, data),
  delete: (id: string) => apiDelete(`/api/launchers/${id}`),
};
