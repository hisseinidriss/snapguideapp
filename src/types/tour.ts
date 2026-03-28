// Standalone type definitions for core domain models (Hissein 3-21-2026)
// These types mirror the database schema and are used throughout the frontend

// Application - represents a registered web application that tours are built for
export interface App {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  icon_url: string | null;
  enabled_languages: string[];      // ISO codes of languages enabled for this app (e.g., ['ar', 'fr'])
  diagnostics_enabled: boolean;     // Controls diagnostic tab visibility in the extension - Hissein
  created_at: string;
  updated_at: string;
}

export type AppInsert = Partial<App> & Pick<App, "name">;

// Tour - a named sequence of guided steps within an application (3-12-2026)
export interface Tour {
  id: string;
  app_id: string;
  name: string;
  sort_order: number;               // Controls display order in the extension popup
  created_at: string;
  updated_at: string;
}

export type TourInsert = Partial<Tour> & Pick<Tour, "app_id" | "name">;

// TourStep - individual step in a guided tour with selector targeting and content (Hissein 3-21-2026)
export interface TourStep {
  id: string;
  tour_id: string;
  title: string;
  content: string;
  selector: string | null;          // CSS selector for the target element on the page
  placement: string;                // Tooltip position relative to target (top, bottom, left, right)
  sort_order: number;
  target_url: string | null;        // URL where this step should execute (for multi-page tours)
  click_selector: string | null;    // Element to click before showing tooltip (e.g., open modal first) - Hissein
  step_type: string;                // 'standard' or 'video'
  video_url: string | null;         // YouTube/OneDrive video URL for video-type steps
  fallback_selectors: string[] | null;  // Alternative selectors for self-healing element resolution (3-18-2026)
  element_metadata: Record<string, any> | null;  // aria-label, name, placeholder for metadata-based recovery
  created_at: string;
  updated_at: string;
}

export type TourStepInsert = Partial<TourStep> & Pick<TourStep, "tour_id">;

// Launcher - in-page trigger element that starts a tour when interacted with - Hissein
export interface Launcher {
  id: string;
  app_id: string;
  name: string;
  type: string;                     // 'beacon', 'button', or 'hotspot'
  selector: string;                 // CSS selector for the element to attach the launcher to
  color: string | null;
  label: string | null;
  pulse: boolean | null;            // Whether to show pulse animation (beacons only)
  is_active: boolean | null;
  tour_id: string | null;           // The tour this launcher triggers (Hissein 3-21-2026)
  created_at: string;
  updated_at: string;
}

export type LauncherInsert = Partial<Launcher> & Pick<Launcher, "app_id" | "name">;

// Checklist - groups multiple tours into an onboarding checklist (3-11-2026)
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

// ChecklistItem - links a tour to a checklist with ordering and required flag - Hissein
export interface ChecklistItem {
  id: string;
  checklist_id: string;
  tour_id: string;
  sort_order: number;
  is_required: boolean | null;
  created_at: string;
}

export type ChecklistItemInsert = Partial<ChecklistItem> & Pick<ChecklistItem, "checklist_id" | "tour_id">;

// Enum types for constrained fields
export type Placement = "top" | "bottom" | "left" | "right" | "center";
export type LauncherType = "beacon" | "button" | "hotspot";