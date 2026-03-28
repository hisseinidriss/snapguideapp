// Process recordings API - manages Scribe-recorded browser interactions (3-18-2026)
// Recordings capture user actions (clicks, inputs, navigation) for auto-generating tour steps
import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import type { ProcessRecording, ProcessRecordingStep } from "@/types/recording";

// Recordings API - parent recording objects with title, status, and app association
export const recordingsApi = {
  // List all recordings for a given application - Hissein
  list: (appId: string) => apiGet<ProcessRecording[]>(`/api/recordings?app_id=${appId}`),
  get: (id: string) => apiGet<ProcessRecording>(`/api/recordings/${id}`),
  update: (id: string, data: Partial<ProcessRecording>) =>
    apiPatch<ProcessRecording>(`/api/recordings/${id}`, data),
  delete: (id: string) => apiDelete(`/api/recordings/${id}`),
};

// Recording Steps API - individual captured actions within a recording (Hissein 3-21-2026)
export const recordingStepsApi = {
  // Fetch all steps for a recording, ordered by sort_order
  list: (recordingId: string) =>
    apiGet<ProcessRecordingStep[]>(`/api/recordings/${recordingId}/steps`),
  // Save a new captured step with selector, action type, and screenshot
  create: (data: Partial<ProcessRecordingStep> & { recording_id: string }) =>
    apiPost<ProcessRecordingStep>("/api/recording-steps", data),
  update: (id: string, data: Partial<ProcessRecordingStep>) =>
    apiPatch<ProcessRecordingStep>(`/api/recording-steps/${id}`, data),
  delete: (id: string) => apiDelete(`/api/recording-steps/${id}`),
};