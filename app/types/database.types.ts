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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      class_instances: {
        Row: {
          capacity: number
          class_slot_id: string
          created_at: string
          date: string
          id: string
          location: string
          time: string
        }
        Insert: {
          capacity: number
          class_slot_id: string
          created_at?: string
          date: string
          id?: string
          location: string
          time: string
        }
        Update: {
          capacity?: number
          class_slot_id?: string
          created_at?: string
          date?: string
          id?: string
          location?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_instances_class_slot_id_fkey"
            columns: ["class_slot_id"]
            isOneToOne: false
            referencedRelation: "class_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      class_slots: {
        Row: {
          archived: boolean
          capacity: number
          created_at: string
          day: string
          id: string
          location: string
          name: string
          time: string
        }
        Insert: {
          archived?: boolean
          capacity: number
          created_at?: string
          day: string
          id?: string
          location: string
          name: string
          time: string
        }
        Update: {
          archived?: boolean
          capacity?: number
          created_at?: string
          day?: string
          id?: string
          location?: string
          name?: string
          time?: string
        }
        Relationships: []
      }
      client_recurring_slots: {
        Row: {
          class_slot_id: string
          client_id: string
          created_at: string
          day: string
          id: string
          time: string
        }
        Insert: {
          class_slot_id: string
          client_id: string
          created_at?: string
          day: string
          id?: string
          time: string
        }
        Update: {
          class_slot_id?: string
          client_id?: string
          created_at?: string
          day?: string
          id?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_recurring_slots_class_slot_id_fkey"
            columns: ["class_slot_id"]
            isOneToOne: false
            referencedRelation: "class_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_recurring_slots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          location: string
          name: string
          rate: number
          scale_enabled: boolean
          service_type: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          location: string
          name: string
          rate: number
          scale_enabled?: boolean
          service_type: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          location?: string
          name?: string
          rate?: number
          scale_enabled?: boolean
          service_type?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          id: string
          invoice_number: string
          issued_date: string
          line_items: Json
          month: string
          scale_line_item: Json | null
          total: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          invoice_number: string
          issued_date?: string
          line_items?: Json
          month: string
          scale_line_item?: Json | null
          total: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          invoice_number?: string
          issued_date?: string
          line_items?: Json
          month?: string
          scale_line_item?: Json | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          amount: number
          class_instance_id: string
          client_id: string
          created_at: string
          date: string
          id: string
          is_recurring: boolean
          notes: string | null
          status: string
        }
        Insert: {
          amount: number
          class_instance_id: string
          client_id: string
          created_at?: string
          date: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          status?: string
        }
        Update: {
          amount?: number
          class_instance_id?: string
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_class_instance_id_fkey"
            columns: ["class_instance_id"]
            isOneToOne: false
            referencedRelation: "class_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          banking_details: string
          id: boolean
          invoice_counter: number
          studio_name: string
        }
        Insert: {
          banking_details?: string
          id?: boolean
          invoice_counter?: number
          studio_name?: string
        }
        Update: {
          banking_details?: string
          id?: boolean
          invoice_counter?: number
          studio_name?: string
        }
        Relationships: []
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
