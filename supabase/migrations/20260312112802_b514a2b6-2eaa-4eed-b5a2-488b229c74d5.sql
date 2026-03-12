
-- Process Recordings table
CREATE TABLE public.process_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  tour_id uuid REFERENCES public.tours(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Untitled Recording',
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Process Recording Steps table
CREATE TABLE public.process_recording_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid NOT NULL REFERENCES public.process_recordings(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  action_type text NOT NULL DEFAULT 'click',
  instruction text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  selector text DEFAULT '',
  target_url text DEFAULT '',
  screenshot_url text DEFAULT '',
  element_text text DEFAULT '',
  element_tag text DEFAULT '',
  input_value text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.process_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_recording_steps ENABLE ROW LEVEL SECURITY;

-- RLS policies for process_recordings
CREATE POLICY "Anyone can read recordings" ON public.process_recordings FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can create recordings" ON public.process_recordings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update recordings" ON public.process_recordings FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete recordings" ON public.process_recordings FOR DELETE TO public USING (true);

-- RLS policies for process_recording_steps
CREATE POLICY "Anyone can read recording steps" ON public.process_recording_steps FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can create recording steps" ON public.process_recording_steps FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update recording steps" ON public.process_recording_steps FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete recording steps" ON public.process_recording_steps FOR DELETE TO public USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_process_recordings_updated_at
  BEFORE UPDATE ON public.process_recordings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_process_recording_steps_updated_at
  BEFORE UPDATE ON public.process_recording_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for recording screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('recording-screenshots', 'recording-screenshots', true);

-- Storage RLS for screenshots
CREATE POLICY "Anyone can upload screenshots" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'recording-screenshots');
CREATE POLICY "Anyone can read screenshots" ON storage.objects FOR SELECT TO public USING (bucket_id = 'recording-screenshots');
CREATE POLICY "Anyone can delete screenshots" ON storage.objects FOR DELETE TO public USING (bucket_id = 'recording-screenshots');
