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
    // Remove all screenshots for this recording from storage (folder = recording id)
    try {
      const { data: files } = await supabase.storage.from("recording-screenshots").list(id);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${id}/${f.name}`);
        await supabase.storage.from("recording-screenshots").remove(paths);
      }
    } catch (e) {
      console.warn("Failed to clean recording screenshots:", e);
    }
    const { error } = await supabase.from("process_recordings").delete().eq("id", id);
    return { data: null, error: error ? { message: error.message } : null };
  },
};

// Extract storage path (e.g. "<recording_id>/step-1.png") from a public screenshot URL
const extractScreenshotPath = (url?: string | null): string | null => {
  if (!url) return null;
  const marker = "/recording-screenshots/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length).split("?")[0];
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
    // Look up the step's screenshot first so we can remove the file from storage
    try {
      const { data: step } = await supabase
        .from("process_recording_steps")
        .select("screenshot_url")
        .eq("id", id)
        .single();
      const path = extractScreenshotPath(step?.screenshot_url);
      if (path) {
        await supabase.storage.from("recording-screenshots").remove([path]);
      }
    } catch (e) {
      console.warn("Failed to clean step screenshot:", e);
    }
    const { error } = await supabase.from("process_recording_steps").delete().eq("id", id);
    return { data: null, error: error ? { message: error.message } : null };
  },
};
