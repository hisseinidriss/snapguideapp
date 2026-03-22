ALTER TABLE public.tour_steps ADD COLUMN IF NOT EXISTS fallback_selectors jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tour_steps ADD COLUMN IF NOT EXISTS element_metadata jsonb DEFAULT '{}'::jsonb;