// Process recordings API — talks to the Azure Functions backend.
import { http, type ApiResult } from "./http";
import type { ProcessRecording, ProcessRecordingStep } from "@/types/recording";

export const recordingsApi = {
  list: (appId: string) =>
    http.get<ProcessRecording[]>(`/recordings?app_id=${encodeURIComponent(appId)}`),

  get: (id: string) => http.get<ProcessRecording>(`/recordings/${id}`),

  create: (input: { app_id: string; title: string; status: string }) =>
    http.post<ProcessRecording>("/recordings", input),

  update: (
    id: string,
    updates: Partial<ProcessRecording>
  ): Promise<ApiResult<ProcessRecording>> => {
    const { id: _id, created_at, updated_at, app_id, ...clean } = updates as any;
    return http.patch<ProcessRecording>(`/recordings/${id}`, clean);
  },

  delete: (id: string) => http.del<null>(`/recordings/${id}`),
};

export const recordingStepsApi = {
  list: (recordingId: string) =>
    http.get<ProcessRecordingStep[]>(
      `/recording-steps?recording_id=${encodeURIComponent(recordingId)}`
    ),

  create: (input: Partial<ProcessRecordingStep> & { recording_id: string }) =>
    http.post<ProcessRecordingStep>("/recording-steps", input),

  update: (
    id: string,
    updates: Partial<ProcessRecordingStep>
  ): Promise<ApiResult<ProcessRecordingStep>> => {
    const { id: _id, created_at, updated_at, recording_id, ...clean } = updates as any;
    return http.patch<ProcessRecordingStep>(`/recording-steps/${id}`, clean);
  },

  delete: (id: string) => http.del<null>(`/recording-steps/${id}`),
};
