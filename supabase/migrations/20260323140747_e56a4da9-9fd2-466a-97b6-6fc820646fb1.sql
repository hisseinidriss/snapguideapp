CREATE TABLE public.tour_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id uuid NOT NULL,
  app_id uuid NOT NULL,
  session_id text NOT NULL,
  rating text NOT NULL CHECK (rating IN ('up', 'down')),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tour_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback" ON public.tour_feedback FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read feedback" ON public.tour_feedback FOR SELECT TO public USING (true);