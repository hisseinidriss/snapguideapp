// Analytics API - tracks tour engagement events (started, completed, abandoned) (Hissein 3-21-2026)
import { apiGet, apiPost } from "./client";

// Shape of a single analytics event record
export interface TourEvent {
  id: string;
  tour_id: string;
  app_id: string;
  event_type: string;    // e.g., tour_started, step_viewed, tour_completed, tour_abandoned
  step_index: number | null;
  session_id: string;
  created_at: string;
}

export const analyticsApi = {
  // Fetch all analytics events for an application (up to 1000 rows) - Hissein
  getEvents: (appId: string) =>
    apiGet<TourEvent[]>(`/api/analytics/events?app_id=${appId}`),
  // Batch-submit events from the extension (queued and flushed periodically) (3-17-2026)
  trackEvents: (events: any[]) =>
    apiPost("/api/track-events", { events }),
};