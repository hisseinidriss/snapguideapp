// Tour feedback API - collects user ratings (thumbs up/down) after completing tours - Hissein
import { apiGet, apiPost } from "./client";

// Feedback data shape returned from the API
export interface TourFeedback {
  id: string;
  tour_id: string;
  app_id: string;
  session_id: string;
  rating: "up" | "down";
  comment: string | null;
  created_at: string;
}

export const feedbackApi = {
  // Retrieve all feedback entries for an application (3-14-2026)
  list: (appId: string) =>
    apiGet<TourFeedback[]>(`/api/feedback?app_id=${appId}`),
  // Submit a new feedback entry with rating and optional comment (Hissein 3-21-2026)
  submit: (data: { tour_id: string; app_id: string; session_id: string; rating: "up" | "down"; comment?: string }) =>
    apiPost<TourFeedback>("/api/feedback", data),
};