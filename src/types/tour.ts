import { Tables, TablesInsert } from "@/integrations/supabase/types";

export type App = Tables<"apps">;
export type AppInsert = TablesInsert<"apps">;

export type Tour = Tables<"tours">;
export type TourInsert = TablesInsert<"tours">;

export type TourStep = Tables<"tour_steps">;
export type TourStepInsert = TablesInsert<"tour_steps">;

export type Launcher = Tables<"launchers">;
export type LauncherInsert = TablesInsert<"launchers">;

export type Checklist = Tables<"checklists">;
export type ChecklistInsert = TablesInsert<"checklists">;

export type ChecklistItem = Tables<"checklist_items">;
export type ChecklistItemInsert = TablesInsert<"checklist_items">;

export type Placement = "top" | "bottom" | "left" | "right" | "center";
export type LauncherType = "beacon" | "button" | "hotspot";
