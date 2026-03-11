ALTER TABLE public.tour_steps 
ADD COLUMN step_type text NOT NULL DEFAULT 'standard',
ADD COLUMN video_url text DEFAULT NULL;