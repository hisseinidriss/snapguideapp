import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import type { Tour, TourStep } from "@/types/tour";

export const toursApi = {
  list: (appId: string) => apiGet<Tour[]>(`/api/tours?app_id=${appId}`),
  get: (id: string) => apiGet<Tour>(`/api/tours/${id}`),
  create: (data: { app_id: string; name: string; sort_order?: number }) =>
    apiPost<Tour>("/api/tours", data),
  update: (id: string, data: Partial<Tour>) =>
    apiPatch<Tour>(`/api/tours/${id}`, data),
  delete: (id: string) => apiDelete(`/api/tours/${id}`),
};

export const tourStepsApi = {
  list: (tourId: string) => apiGet<TourStep[]>(`/api/tour-steps?tour_id=${tourId}`),
  listByTourIds: (tourIds: string[]) =>
    apiPost<TourStep[]>("/api/tour-steps/by-tours", { tour_ids: tourIds }),
  create: (data: Partial<TourStep> & { tour_id: string }) =>
    apiPost<TourStep>("/api/tour-steps", data),
  update: (id: string, data: Partial<TourStep>) =>
    apiPatch<TourStep>(`/api/tour-steps/${id}`, data),
  delete: (id: string) => apiDelete(`/api/tour-steps/${id}`),
};
