import { apiGet, apiPost, apiDelete } from "./client";

export interface Translation {
  id: string;
  step_id: string;
  language: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const translationsApi = {
  listByStep: (stepId: string) =>
    apiGet<Translation[]>(`/api/translations?step_id=${stepId}`),

  listByTour: (tourId: string) =>
    apiGet<Translation[]>(`/api/translations?tour_id=${tourId}`),

  upsert: (data: { step_id: string; language: string; title: string; content: string }) =>
    apiPost<Translation>("/api/translations", data),

  bulkUpsert: (translations: { step_id: string; language: string; title: string; content: string }[]) =>
    apiPost<Translation[]>("/api/translations/bulk", { translations }),

  autoTranslate: (data: { step_id: string; source_title: string; source_content: string; target_language: string }) =>
    apiPost<Translation>("/api/translations/auto", data),

  delete: (id: string) => apiDelete(`/api/translations/${id}`),
};
