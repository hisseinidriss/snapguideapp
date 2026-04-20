// Type definitions for the SnapGuide Scribe recording feature

export type VideoStatus = 'idle' | 'narrating' | 'rendering' | 'ready' | 'failed';

export interface ProcessRecording {
  id: string;
  app_id: string;
  tour_id: string | null;
  title: string;
  description: string | null;
  status: string;
  video_url?: string | null;
  video_status?: VideoStatus;
  video_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessRecordingStep {
  id: string;
  recording_id: string;
  sort_order: number;
  action_type: string;
  instruction: string;
  notes: string | null;
  selector: string | null;
  target_url: string | null;
  screenshot_url: string | null;
  element_text: string | null;
  element_tag: string | null;
  input_value: string | null;
  narration_text?: string | null;
  narration_url?: string | null;
  narration_duration_ms?: number | null;
  created_at: string;
  updated_at: string;
}

export type ActionType = 'click' | 'type' | 'select' | 'navigate' | 'scroll' | 'hover';
