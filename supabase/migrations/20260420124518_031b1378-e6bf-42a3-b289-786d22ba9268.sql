ALTER TABLE public.process_recording_steps
  ADD COLUMN IF NOT EXISTS narration_text text,
  ADD COLUMN IF NOT EXISTS narration_url text,
  ADD COLUMN IF NOT EXISTS narration_duration_ms integer;

ALTER TABLE public.process_recordings
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS video_error text;