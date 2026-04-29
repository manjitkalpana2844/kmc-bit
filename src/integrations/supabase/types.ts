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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          code: string
          description: string
          icon: string
          name: string
          threshold: number
        }
        Insert: {
          category?: string
          code: string
          description: string
          icon?: string
          name: string
          threshold?: number
        }
        Update: {
          category?: string
          code?: string
          description?: string
          icon?: string
          name?: string
          threshold?: number
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          pdf_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pdf_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pdf_id?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_reply: string | null
          created_at: string
          id: string
          message: string
          replied_at: string | null
          replied_by: string | null
          status: Database["public"]["Enums"]["feedback_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message: string
          replied_at?: string | null
          replied_by?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          pdf_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          pdf_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          pdf_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "pdf_files"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          plan: Database["public"]["Enums"]["payment_plan"]
          proof_path: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          semester: number | null
          status: Database["public"]["Enums"]["payment_request_status"]
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          plan: Database["public"]["Enums"]["payment_plan"]
          proof_path: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          semester?: number | null
          status?: Database["public"]["Enums"]["payment_request_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          plan?: Database["public"]["Enums"]["payment_plan"]
          proof_path?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          semester?: number | null
          status?: Database["public"]["Enums"]["payment_request_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pdf_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          pdf_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          pdf_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          pdf_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pdf_downloads: {
        Row: {
          downloaded_at: string
          id: string
          pdf_id: string
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          pdf_id: string
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          pdf_id?: string
          user_id?: string
        }
        Relationships: []
      }
      pdf_files: {
        Row: {
          created_at: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          file_path: string
          file_size: number | null
          id: string
          semester: number
          subject: string
          title: string
          uploaded_by: string | null
          year: number
        }
        Insert: {
          created_at?: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          file_path: string
          file_size?: number | null
          id?: string
          semester: number
          subject: string
          title: string
          uploaded_by?: string | null
          year: number
        }
        Update: {
          created_at?: string
          exam_type?: Database["public"]["Enums"]["exam_type"]
          file_path?: string
          file_size?: number | null
          id?: string
          semester?: number
          subject?: string
          title?: string
          uploaded_by?: string | null
          year?: number
        }
        Relationships: []
      }
      pdf_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          pdf_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          pdf_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          pdf_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pdf_ratings: {
        Row: {
          created_at: string
          id: string
          pdf_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pdf_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pdf_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pdf_views: {
        Row: {
          pdf_id: string
          updated_at: string
          view_count: number
        }
        Insert: {
          pdf_id: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          pdf_id?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          login_provider: string | null
          name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          login_provider?: string | null
          name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          login_provider?: string | null
          name?: string | null
        }
        Relationships: []
      }
      recently_viewed: {
        Row: {
          id: string
          pdf_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          pdf_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          pdf_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      semester_status: {
        Row: {
          is_locked: boolean
          semester: number
          updated_at: string
        }
        Insert: {
          is_locked?: boolean
          semester: number
          updated_at?: string
        }
        Update: {
          is_locked?: boolean
          semester?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_access: {
        Row: {
          access_type: Database["public"]["Enums"]["access_type"]
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          semester: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_type: Database["public"]["Enums"]["access_type"]
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          semester?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["access_type"]
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          semester?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_code: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_code: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_code?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number
          last_active_date: string | null
          longest_streak: number
          total_active_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          total_active_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          total_active_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_pdf_view: { Args: { _pdf_id: string }; Returns: undefined }
      user_can_access_semester: {
        Args: { _semester: number; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      access_type: "semester_pass" | "monthly_all_access"
      app_role: "admin" | "student"
      exam_type:
        | "first_term"
        | "mid_term"
        | "final"
        | "board"
        | "model_questions"
      feedback_status: "open" | "resolved"
      notification_type: "new_paper" | "exam_reminder" | "announcement"
      payment_plan: "semester_pass" | "monthly_all_access"
      payment_request_status: "pending" | "approved" | "rejected"
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
    Enums: {
      access_type: ["semester_pass", "monthly_all_access"],
      app_role: ["admin", "student"],
      exam_type: [
        "first_term",
        "mid_term",
        "final",
        "board",
        "model_questions",
      ],
      feedback_status: ["open", "resolved"],
      notification_type: ["new_paper", "exam_reminder", "announcement"],
      payment_plan: ["semester_pass", "monthly_all_access"],
      payment_request_status: ["pending", "approved", "rejected"],
    },
  },
} as const
