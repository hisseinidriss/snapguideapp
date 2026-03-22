// Standalone type definitions (no Supabase dependency)

export interface App {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  icon_url: string | null;
  created_at: string;
  updated_at: string;
}

export type AppInsert = Partial<App> & Pick<App, "name">;

export interface Tour {
  id: string;
  app_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type TourInsert = Partial<Tour> & Pick<Tour, "app_id" | "name">;

export interface TourStep {
  id: string;
  tour_id: string;
  title: string;
  content: string;
  selector: string | null;
  placement: string;
  sort_order: number;
  target_url: string | null;
  click_selector: string | null;
  step_type: string;
  video_url: string | null;
  fallback_selectors: string[] | null;
  element_metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export type TourStepInsert = Partial<TourStep> & Pick<TourStep, "tour_id">;

export interface Launcher {
  id: string;
  app_id: string;
  name: string;
  type: string;
  selector: string;
  color: string | null;
  label: string | null;
  pulse: boolean | null;
  is_active: boolean | null;
  tour_id: string | null;
  created_at: string;
  updated_at: string;
}

export type LauncherInsert = Partial<Launcher> & Pick<Launcher, "app_id" | "name">;

export interface Checklist {
  id: string;
  app_id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export type ChecklistInsert = Partial<Checklist> & Pick<Checklist, "app_id" | "name">;

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  tour_id: string;
  sort_order: number;
  is_required: boolean | null;
  created_at: string;
}

export type ChecklistItemInsert = Partial<ChecklistItem> & Pick<ChecklistItem, "checklist_id" | "tour_id">;

export type Placement = "top" | "bottom" | "left" | "right" | "center";
export type LauncherType = "beacon" | "button" | "hotspot";
