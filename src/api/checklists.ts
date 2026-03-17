import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import type { Checklist, ChecklistItem } from "@/types/tour";

export const checklistsApi = {
  list: (appId: string) => apiGet<Checklist[]>(`/api/checklists?app_id=${appId}`),
  get: (id: string) => apiGet<Checklist>(`/api/checklists/${id}`),
  update: (id: string, data: Partial<Checklist>) =>
    apiPatch<Checklist>(`/api/checklists/${id}`, data),
  delete: (id: string) => apiDelete(`/api/checklists/${id}`),
};

export const checklistItemsApi = {
  list: (checklistId: string) =>
    apiGet<ChecklistItem[]>(`/api/checklists/${checklistId}/items`),
  create: (data: { checklist_id: string; tour_id: string; sort_order: number }) =>
    apiPost<ChecklistItem>("/api/checklist-items", data),
  update: (id: string, data: Partial<ChecklistItem>) =>
    apiPatch<ChecklistItem>(`/api/checklist-items/${id}`, data),
  delete: (id: string) => apiDelete(`/api/checklist-items/${id}`),
};
