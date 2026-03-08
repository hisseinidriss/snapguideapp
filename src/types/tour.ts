import { Tables, TablesInsert } from "@/integrations/supabase/types";

export type App = Tables<"apps">;
export type AppInsert = TablesInsert<"apps">;

export type Tour = Tables<"tours">;
export type TourInsert = TablesInsert<"tours">;

export type TourStep = Tables<"tour_steps">;
export type TourStepInsert = TablesInsert<"tour_steps">;

export type Launcher = Tables<"launchers">;
export type LauncherInsert = TablesInsert<"launchers">;

export type Placement = "top" | "bottom" | "left" | "right" | "center";
export type LauncherType = "beacon" | "button" | "hotspot";
