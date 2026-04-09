// Process recordings API - using Supabase directly
import { supabase } from "@/integrations/supabase/client";
import type { ProcessRecording, ProcessRecordingStep } from "@/types/recording";

type ApiResult<T> = { data: T | null; error: { message: string } | null };

export const recordingsApi = {
  list: async (appId: string): Promise<ApiResult<ProcessRecording[]>> => {
    const { data, error } = await supabase
      .from("process_recordings")
      .select("*")
      .eq("app_id", appId)
      .order("created_at", { ascending: true });
    return { data: data as ProcessRecording[] | null, error: error ? { message: error.message } : null };
  },

  get: async (id: string): Promise<ApiResult<ProcessRecording>> => {
    const { data, error } = await supabase.from("process_recordings").select("*").eq("id", id).single();
    return { data: data as ProcessRecording | null, error: error ? { message: error.message } : null };
  },

  create: async (input: { app_id: string; title: string; status: string }): Promise<ApiResult<ProcessRecording>> => {
    const { data, error } = await supabase.from("process_recordings").insert(input).select().single();
    return { data: data as ProcessRecording | null, error: error ? { message: error.message } : null };
  },

  update: async (id: string, updates: Partial<ProcessRecording>): Promise<ApiResult<ProcessRecording>> => {
    const { id: _id, created_at, updated_at, app_id, ...clean } = updates as any;
    const { data, error } = await supabase.from("process_recordings").update(clean).eq("id", id).select().single();
    return { data: data as ProcessRecording | null, error: error ? { message: error.message } : null };
  },

  delete: async (id: string): Promise<ApiResult<null>> => {
    const { error } = await supabase.from("process_recordings").delete().eq("id", id);
    return { data: null, error: error ? { message: error.message } : null };
  },
};

export const recordingStepsApi = {
  list: async (recordingId: string): Promise<ApiResult<ProcessRecordingStep[]>> => {
    const { data, error } = await supabase
      .from("process_recording_steps")
      .select("*")
      .eq("recording_id", recordingId)
      .order("sort_order", { ascending: true });
    return { data: data as ProcessRecordingStep[] | null, error: error ? { message: error.message } : null };
  },

  create: async (input: Partial<ProcessRecordingStep> & { recording_id: string }): Promise<ApiResult<ProcessRecordingStep>> => {
    const { data, error } = await supabase.from("process_recording_steps").insert(input).select().single();
    return { data: data as ProcessRecordingStep | null, error: error ? { message: error.message } : null };
  },

  update: async (id: string, updates: Partial<ProcessRecordingStep>): Promise<ApiResult<ProcessRecordingStep>> => {
    const { id: _id, created_at, updated_at, recording_id, ...clean } = updates as any;
    const { data, error } = await supabase.from("process_recording_steps").update(clean).eq("id", id).select().single();
    return { data: data as ProcessRecordingStep | null, error: error ? { message: error.message } : null };
  },

  delete: async (id: string): Promise<ApiResult<null>> => {
    const { error } = await supabase.from("process_recording_steps").delete().eq("id", id);
    return { data: null, error: error ? { message: error.message } : null };
  },
};
