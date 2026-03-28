// Tour and TourStep API module - handles CRUD operations for guided tours (Hissein 3-21-2026)
import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import type { Tour, TourStep } from "@/types/tour";

// Tours API - manages the parent tour objects (name, sort order, app association)
export const toursApi = {
  // Fetch all tours for a given application - Hissein
  list: (appId: string) => apiGet<Tour[]>(`/api/tours?app_id=${appId}`),
  // Get a single tour by ID
  get: (id: string) => apiGet<Tour>(`/api/tours/${id}`),
  // Create a new tour under an application
  create: (data: { app_id: string; name: string; sort_order?: number }) =>
    apiPost<Tour>("/api/tours", data),
  // Partial update of tour properties (3-16-2026)
  update: (id: string, data: Partial<Tour>) =>
    apiPatch<Tour>(`/api/tours/${id}`, data),
  // Remove a tour and its associated steps
  delete: (id: string) => apiDelete(`/api/tours/${id}`),
};

// Tour Steps API - manages individual steps within a tour
export const tourStepsApi = {
  // Fetch steps for a single tour, ordered by sort_order
  list: (tourId: string) => apiGet<TourStep[]>(`/api/tour-steps?tour_id=${tourId}`),
  // Batch fetch steps for multiple tours at once (used in extension generation) - Hissein
  listByTourIds: (tourIds: string[]) =>
    apiPost<TourStep[]>("/api/tour-steps/by-tours", { tour_ids: tourIds }),
  // Create a new step in a tour
  create: (data: Partial<TourStep> & { tour_id: string }) =>
    apiPost<TourStep>("/api/tour-steps", data),
  // Update step properties (selector, content, placement, etc.)
  update: (id: string, data: Partial<TourStep>) =>
    apiPatch<TourStep>(`/api/tour-steps/${id}`, data),
  delete: (id: string) => apiDelete(`/api/tour-steps/${id}`),
};