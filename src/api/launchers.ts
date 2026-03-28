// Launchers API - manages in-page triggers (beacons, buttons, hotspots) that start tours (3-19-2026)
// Launchers are placed on specific page elements via CSS selectors
import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import type { Launcher } from "@/types/tour";

export const launchersApi = {
  // Fetch all launchers configured for an application - Hissein
  list: (appId: string) => apiGet<Launcher[]>(`/api/launchers?app_id=${appId}`),
  // Create a new launcher with type (beacon/button/hotspot), selector, and linked tour
  create: (data: { app_id: string; name: string; type: string }) =>
    apiPost<Launcher>("/api/launchers", data),
  // Update launcher settings (color, label, pulse animation, active status) (Hissein 3-21-2026)
  update: (id: string, data: Partial<Launcher>) =>
    apiPatch<Launcher>(`/api/launchers/${id}`, data),
  delete: (id: string) => apiDelete(`/api/launchers/${id}`),
};