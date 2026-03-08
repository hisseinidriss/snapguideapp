-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apps table
CREATE TABLE public.apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read apps" ON public.apps FOR SELECT USING (true);
CREATE POLICY "Anyone can create apps" ON public.apps FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update apps" ON public.apps FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete apps" ON public.apps FOR DELETE USING (true);

CREATE TRIGGER update_apps_updated_at BEFORE UPDATE ON public.apps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tours table
CREATE TABLE public.tours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tours" ON public.tours FOR SELECT USING (true);
CREATE POLICY "Anyone can create tours" ON public.tours FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tours" ON public.tours FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tours" ON public.tours FOR DELETE USING (true);

CREATE TRIGGER update_tours_updated_at BEFORE UPDATE ON public.tours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tour Steps table
CREATE TABLE public.tour_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Step',
  content TEXT NOT NULL DEFAULT 'Describe what happens here.',
  selector TEXT DEFAULT '',
  placement TEXT NOT NULL DEFAULT 'bottom' CHECK (placement IN ('top', 'bottom', 'left', 'right', 'center')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tour_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read steps" ON public.tour_steps FOR SELECT USING (true);
CREATE POLICY "Anyone can create steps" ON public.tour_steps FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update steps" ON public.tour_steps FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete steps" ON public.tour_steps FOR DELETE USING (true);

CREATE TRIGGER update_tour_steps_updated_at BEFORE UPDATE ON public.tour_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Launchers table
CREATE TABLE public.launchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'beacon' CHECK (type IN ('beacon', 'button', 'hotspot')),
  selector TEXT NOT NULL DEFAULT '',
  label TEXT DEFAULT '',
  color TEXT DEFAULT '#1e6b45',
  pulse BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.launchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read launchers" ON public.launchers FOR SELECT USING (true);
CREATE POLICY "Anyone can create launchers" ON public.launchers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update launchers" ON public.launchers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete launchers" ON public.launchers FOR DELETE USING (true);

CREATE TRIGGER update_launchers_updated_at BEFORE UPDATE ON public.launchers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_tours_app_id ON public.tours(app_id);
CREATE INDEX idx_tour_steps_tour_id ON public.tour_steps(tour_id);
CREATE INDEX idx_tour_steps_sort_order ON public.tour_steps(tour_id, sort_order);
CREATE INDEX idx_launchers_app_id ON public.launchers(app_id);