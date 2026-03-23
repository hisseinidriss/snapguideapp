import { apiGet, apiPost } from "./client";

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
  list: (appId: string) =>
    apiGet<TourFeedback[]>(`/api/feedback?app_id=${appId}`),
  submit: (data: { tour_id: string; app_id: string; session_id: string; rating: "up" | "down"; comment?: string }) =>
    apiPost<TourFeedback>("/api/feedback", data),
};
