export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      apps: {
        Row: {
          auto_redact: boolean
          created_at: string
          description: string | null
          diagnostics_enabled: boolean
          enabled_languages: Json
          icon_url: string | null
          id: string
          name: string
          updated_at: string
          url: string | null
        }
        Insert: {
          auto_redact?: boolean
          created_at?: string
          description?: string | null
          diagnostics_enabled?: boolean
          enabled_languages?: Json
          icon_url?: string | null
          id?: string
          name: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          auto_redact?: boolean
          created_at?: string
          description?: string | null
          diagnostics_enabled?: boolean
          enabled_languages?: Json
          icon_url?: string | null
          id?: string
          name?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          checklist_id: string
          created_at: string
          id: string
          is_required: boolean | null
          sort_order: number
          tour_id: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          id?: string
          is_required?: boolean | null
          sort_order?: number
          tour_id: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          id?: string
          is_required?: boolean | null
          sort_order?: number
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          app_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          app_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          app_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      launchers: {
        Row: {
          app_id: string
          color: string | null
          created_at: string
          id: string
          is_active: boolean | null
          label: string | null
          name: string
          pulse: boolean | null
          selector: string
          tour_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          app_id: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          label?: string | null
          name: string
          pulse?: boolean | null
          selector?: string
          tour_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          app_id?: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          label?: string | null
          name?: string
          pulse?: boolean | null
          selector?: string
          tour_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launchers_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launchers_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      process_recording_steps: {
        Row: {
          action_type: string
          created_at: string
          element_tag: string | null
          element_text: string | null
          id: string
          input_value: string | null
          instruction: string
          notes: string | null
          recording_id: string
          screenshot_url: string | null
          selector: string | null
          sort_order: number
          target_url: string | null
          updated_at: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          element_tag?: string | null
          element_text?: string | null
          id?: string
          input_value?: string | null
          instruction?: string
          notes?: string | null
          recording_id: string
          screenshot_url?: string | null
          selector?: string | null
          sort_order?: number
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          element_tag?: string | null
          element_text?: string | null
          id?: string
          input_value?: string | null
          instruction?: string
          notes?: string | null
          recording_id?: string
          screenshot_url?: string | null
          selector?: string | null
          sort_order?: number
          target_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_recording_steps_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "process_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      process_recordings: {
        Row: {
          app_id: string
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          app_id: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          app_id?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_recordings_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_recordings_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_events: {
        Row: {
          app_id: string
          created_at: string
          event_type: string
          id: string
          session_id: string
          step_index: number | null
          tour_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          event_type: string
          id?: string
          session_id: string
          step_index?: number | null
          tour_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          event_type?: string
          id?: string
          session_id?: string
          step_index?: number | null
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_events_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_events_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_feedback: {
        Row: {
          app_id: string
          comment: string | null
          created_at: string
          id: string
          rating: string
          session_id: string
          tour_id: string
        }
        Insert: {
          app_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: string
          session_id: string
          tour_id: string
        }
        Update: {
          app_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: string
          session_id?: string
          tour_id?: string
        }
        Relationships: []
      }
      tour_steps: {
        Row: {
          click_selector: string | null
          content: string
          created_at: string
          element_metadata: Json | null
          fallback_selectors: Json | null
          id: string
          placement: string
          selector: string | null
          sort_order: number
          step_type: string
          target_url: string | null
          title: string
          tour_id: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          click_selector?: string | null
          content?: string
          created_at?: string
          element_metadata?: Json | null
          fallback_selectors?: Json | null
          id?: string
          placement?: string
          selector?: string | null
          sort_order?: number
          step_type?: string
          target_url?: string | null
          title?: string
          tour_id: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          click_selector?: string | null
          content?: string
          created_at?: string
          element_metadata?: Json | null
          fallback_selectors?: Json | null
          id?: string
          placement?: string
          selector?: string | null
          sort_order?: number
          step_type?: string
          target_url?: string | null
          title?: string
          tour_id?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_steps_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          app_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tours_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
