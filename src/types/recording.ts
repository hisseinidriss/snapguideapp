// Type definitions for the Scribe recording feature (3-16-2026)
// Scribe captures browser interactions to auto-generate tour steps

// ProcessRecording - parent object representing a single recording session - Hissein
export interface ProcessRecording {
  id: string;
  app_id: string;
  tour_id: string | null;          // Optional link to a tour if steps were converted
  title: string;
  description: string | null;
  status: string;                   // e.g., 'recording', 'completed', 'draft'
  created_at: string;
  updated_at: string;
}

// ProcessRecordingStep - a single captured user action (click, type, navigate) (Hissein 3-21-2026)
export interface ProcessRecordingStep {
  id: string;
  recording_id: string;
  sort_order: number;
  action_type: string;              // Type of user action captured
  instruction: string;              // Human-readable description of the action - Hissein
  notes: string | null;
  selector: string | null;          // CSS selector of the interacted element
  target_url: string | null;        // Page URL where the action occurred (3-15-2026)
  screenshot_url: string | null;    // Screenshot captured at time of action
  element_text: string | null;      // Visible text of the interacted element
  element_tag: string | null;       // HTML tag name (e.g., 'button', 'input')
  input_value: string | null;       // Value entered for type/select actions
  created_at: string;
  updated_at: string;
}

// Supported action types for recording steps
export type ActionType = 'click' | 'type' | 'select' | 'navigate' | 'scroll' | 'hover';