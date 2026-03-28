// Checklists API - manages onboarding checklists that group multiple tours - Hissein
// Each checklist belongs to an app and contains ordered items linking to tours
import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import type { Checklist, ChecklistItem } from "@/types/tour";

// Checklists API - parent checklist with name, description, and active status
export const checklistsApi = {
  list: (appId: string) => apiGet<Checklist[]>(`/api/checklists?app_id=${appId}`),
  get: (id: string) => apiGet<Checklist>(`/api/checklists/${id}`),
  // Update checklist properties (name, description, is_active) (3-15-2026)
  update: (id: string, data: Partial<Checklist>) =>
    apiPatch<Checklist>(`/api/checklists/${id}`, data),
  delete: (id: string) => apiDelete(`/api/checklists/${id}`),
};

// Checklist Items API - individual items that reference tours within a checklist (Hissein 3-21-2026)
export const checklistItemsApi = {
  list: (checklistId: string) =>
    apiGet<ChecklistItem[]>(`/api/checklists/${checklistId}/items`),
  // Create a new checklist item linking a tour with a sort order
  create: (data: { checklist_id: string; tour_id: string; sort_order: number }) =>
    apiPost<ChecklistItem>("/api/checklist-items", data),
  update: (id: string, data: Partial<ChecklistItem>) =>
    apiPatch<ChecklistItem>(`/api/checklist-items/${id}`, data),
  delete: (id: string) => apiDelete(`/api/checklist-items/${id}`),
};