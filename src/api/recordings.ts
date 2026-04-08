// Process recordings API - SnapGuide Scribe feature
import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import type { ProcessRecording, ProcessRecordingStep } from "@/types/recording";

export const recordingsApi = {
  list: (appId: string) => apiGet<ProcessRecording[]>(`/api/recordings?app_id=${appId}`),
  get: (id: string) => apiGet<ProcessRecording>(`/api/recordings/${id}`),
  create: (data: { app_id: string; title: string; status: string }) =>
    apiPost<ProcessRecording>("/api/recordings", data),
  update: (id: string, data: Partial<ProcessRecording>) =>
    apiPatch<ProcessRecording>(`/api/recordings/${id}`, data),
  delete: (id: string) => apiDelete(`/api/recordings/${id}`),
};

export const recordingStepsApi = {
  list: (recordingId: string) =>
    apiGet<ProcessRecordingStep[]>(`/api/recordings/${recordingId}/steps`),
  create: (data: Partial<ProcessRecordingStep> & { recording_id: string }) =>
    apiPost<ProcessRecordingStep>("/api/recording-steps", data),
  update: (id: string, data: Partial<ProcessRecordingStep>) =>
    apiPatch<ProcessRecordingStep>(`/api/recording-steps/${id}`, data),
  delete: (id: string) => apiDelete(`/api/recording-steps/${id}`),
};
