
-- Analytics events table
CREATE TABLE public.tour_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'tour_started', 'step_viewed', 'tour_completed', 'tour_abandoned'
  step_index INTEGER, -- which step (null for tour-level events)
  session_id TEXT NOT NULL, -- anonymous session identifier
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_tour_events_tour_id ON public.tour_events(tour_id);
CREATE INDEX idx_tour_events_app_id ON public.tour_events(app_id);
CREATE INDEX idx_tour_events_created_at ON public.tour_events(created_at);

-- RLS - allow public inserts (from embed scripts) and authenticated reads
ALTER TABLE public.tour_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events" ON public.tour_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read events" ON public.tour_events FOR SELECT USING (true);
