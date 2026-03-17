import { apiGet, apiPost } from "./client";

export interface TourEvent {
  id: string;
  tour_id: string;
  app_id: string;
  event_type: string;
  step_index: number | null;
  session_id: string;
  created_at: string;
}

export const analyticsApi = {
  getEvents: (appId: string) =>
    apiGet<TourEvent[]>(`/api/analytics/events?app_id=${appId}`),
  trackEvents: (events: any[]) =>
    apiPost("/api/track-events", { events }),
};
