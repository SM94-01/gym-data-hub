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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      allowed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["app_user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_user_role"]
        }
        Relationships: []
      }
      body_weights: {
        Row: {
          created_at: string
          date: string
          id: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "body_weights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          avg_bpm: number | null
          avg_incline: number | null
          avg_speed: number | null
          created_at: string
          exercise2_name: string | null
          id: string
          is_cardio: boolean
          is_superset: boolean
          muscle: string
          muscle2: string | null
          name: string
          note: string | null
          position: number
          reps: number
          reps_per_set: Json | null
          reps2: number | null
          rest_time: number | null
          sets: number
          target_weight: number
          target_weight2: number | null
          workout_id: string
        }
        Insert: {
          avg_bpm?: number | null
          avg_incline?: number | null
          avg_speed?: number | null
          created_at?: string
          exercise2_name?: string | null
          id?: string
          is_cardio?: boolean
          is_superset?: boolean
          muscle: string
          muscle2?: string | null
          name: string
          note?: string | null
          position?: number
          reps?: number
          reps_per_set?: Json | null
          reps2?: number | null
          rest_time?: number | null
          sets?: number
          target_weight?: number
          target_weight2?: number | null
          workout_id: string
        }
        Update: {
          avg_bpm?: number | null
          avg_incline?: number | null
          avg_speed?: number | null
          created_at?: string
          exercise2_name?: string | null
          id?: string
          is_cardio?: boolean
          is_superset?: boolean
          muscle?: string
          muscle2?: string | null
          name?: string
          note?: string | null
          position?: number
          reps?: number
          reps_per_set?: Json | null
          reps2?: number | null
          rest_time?: number | null
          sets?: number
          target_weight?: number
          target_weight2?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_members: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          member_email: string
          member_id: string | null
          member_role: string
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          member_email: string
          member_id?: string | null
          member_role?: string
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          member_email?: string
          member_id?: string | null
          member_role?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          id: string
          invitation_type: string
          invitee_email: string
          inviter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_type?: string
          invitee_email: string
          inviter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_type?: string
          invitee_email?: string
          inviter_id?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      trainer_clients: {
        Row: {
          client_email: string
          client_id: string
          created_at: string
          id: string
          trainer_id: string
        }
        Insert: {
          client_email: string
          client_id: string
          created_at?: string
          id?: string
          trainer_id: string
        }
        Update: {
          client_email?: string
          client_id?: string
          created_at?: string
          id?: string
          trainer_id?: string
        }
        Relationships: []
      }
      workout_progress: {
        Row: {
          date: string
          exercise_id: string | null
          exercise_name: string
          exercise_note: string | null
          id: string
          is_superset: boolean | null
          muscle: string
          notes: string | null
          reps_completed: number
          sets_completed: number
          sets_data: Json | null
          user_id: string
          weight_used: number
        }
        Insert: {
          date?: string
          exercise_id?: string | null
          exercise_name: string
          exercise_note?: string | null
          id?: string
          is_superset?: boolean | null
          muscle: string
          notes?: string | null
          reps_completed: number
          sets_completed: number
          sets_data?: Json | null
          user_id: string
          weight_used: number
        }
        Update: {
          date?: string
          exercise_id?: string | null
          exercise_name?: string
          exercise_note?: string | null
          id?: string
          is_superset?: boolean | null
          muscle?: string
          notes?: string | null
          reps_completed?: number
          sets_completed?: number
          sets_data?: Json | null
          user_id?: string
          weight_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          created_at: string
          duration_seconds: number
          ended_at: string
          id: string
          started_at: string
          user_id: string
          workout_name: string
        }
        Insert: {
          created_at?: string
          duration_seconds: number
          ended_at: string
          id?: string
          started_at: string
          user_id: string
          workout_name: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string
          id?: string
          started_at?: string
          user_id?: string
          workout_name?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_saved: boolean
          last_used: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_saved?: boolean
          last_used?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_saved?: boolean
          last_used?: string | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_invite_limits: { Args: { _user_id: string }; Returns: Json }
      get_user_id_by_email: { Args: { _email: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_user_role"]
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_email_allowed: { Args: { check_email: string }; Returns: boolean }
      is_gym: { Args: { _user_id: string }; Returns: boolean }
      is_personal_trainer: { Args: { _user_id: string }; Returns: boolean }
      is_trainer_of: { Args: { _client_id: string }; Returns: boolean }
    }
    Enums: {
      app_user_role:
        | "Utente"
        | "Personal Trainer Starter"
        | "Personal Trainer Pro"
        | "Personal Trainer Elite"
        | "Palestra Starter"
        | "Palestra Pro"
        | "Palestra Elite"
        | "Admin"
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
      app_user_role: [
        "Utente",
        "Personal Trainer Starter",
        "Personal Trainer Pro",
        "Personal Trainer Elite",
        "Palestra Starter",
        "Palestra Pro",
        "Palestra Elite",
        "Admin",
      ],
    },
  },
} as const
