// Translations API - manages multilingual content for tour steps (3-10-2026)
// Supports manual entry and AI-powered auto-translation
import { apiGet, apiPost, apiDelete } from "./client";

// Translation record linking a step to localized title/content in a specific language
export interface Translation {
  id: string;
  step_id: string;
  language: string;     // ISO language code (e.g., 'ar', 'fr')
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const translationsApi = {
  // Get translations for a specific step - Hissein
  listByStep: (stepId: string) =>
    apiGet<Translation[]>(`/api/translations?step_id=${stepId}`),

  // Get all translations for all steps in a tour (used during extension generation) (Hissein 3-21-2026)
  listByTour: (tourId: string) =>
    apiGet<Translation[]>(`/api/translations?tour_id=${tourId}`),

  // Create or update a translation for a step/language pair
  upsert: (data: { step_id: string; language: string; title: string; content: string }) =>
    apiPost<Translation>("/api/translations", data),

  // Batch upsert multiple translations at once (3-16-2026)
  bulkUpsert: (translations: { step_id: string; language: string; title: string; content: string }[]) =>
    apiPost<Translation[]>("/api/translations/bulk", { translations }),

  // AI-powered auto-translation from source content to target language - Hissein
  autoTranslate: (data: { step_id: string; source_title: string; source_content: string; target_language: string }) =>
    apiPost<Translation>("/api/translations/auto", data),

  delete: (id: string) => apiDelete(`/api/translations/${id}`),
};