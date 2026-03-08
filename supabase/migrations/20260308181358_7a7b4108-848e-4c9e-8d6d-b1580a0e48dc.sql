
-- Checklists table
CREATE TABLE public.checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Checklist items (links to tours with ordering)
CREATE TABLE public.checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(checklist_id, tour_id)
);

-- RLS for checklists
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read checklists" ON public.checklists FOR SELECT USING (true);
CREATE POLICY "Anyone can create checklists" ON public.checklists FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update checklists" ON public.checklists FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete checklists" ON public.checklists FOR DELETE USING (true);

-- RLS for checklist_items
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read checklist_items" ON public.checklist_items FOR SELECT USING (true);
CREATE POLICY "Anyone can create checklist_items" ON public.checklist_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update checklist_items" ON public.checklist_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete checklist_items" ON public.checklist_items FOR DELETE USING (true);

-- Updated_at trigger for checklists
CREATE TRIGGER update_checklists_updated_at
  BEFORE UPDATE ON public.checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
