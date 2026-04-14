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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          kvk_number: string | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kvk_number?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kvk_number?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      invoice_counters: {
        Row: {
          invoice_year: number
          last_number: number
        }
        Insert: {
          invoice_year: number
          last_number?: number
        }
        Update: {
          invoice_year?: number
          last_number?: number
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          price: number
          quantity: number
          subtotal: number
          vat_percentage: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          price?: number
          quantity?: number
          subtotal?: number
          vat_percentage?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          price?: number
          quantity?: number
          subtotal?: number
          vat_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_month: number
          invoice_number: string
          invoice_year: number
          notes: string | null
          original_filename: string | null
          paid_at: string | null
          pdf_storage_path: string | null
          sent_at: string | null
          source_type: string
          status: string
          subtotal: number
          total: number
          updated_at: string
          uploaded_at: string | null
          vat_total: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_month: number
          invoice_number: string
          invoice_year: number
          notes?: string | null
          original_filename?: string | null
          paid_at?: string | null
          pdf_storage_path?: string | null
          sent_at?: string | null
          source_type?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          uploaded_at?: string | null
          vat_total?: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_month?: number
          invoice_number?: string
          invoice_year?: number
          notes?: string | null
          original_filename?: string | null
          paid_at?: string | null
          pdf_storage_path?: string | null
          sent_at?: string | null
          source_type?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          uploaded_at?: string | null
          vat_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          default_vat: number | null
          email: string | null
          iban: string | null
          id: string
          invoice_footer_text: string | null
          kvk: string | null
          logo_url: string | null
          payment_terms: number | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          default_vat?: number | null
          email?: string | null
          iban?: string | null
          id?: string
          invoice_footer_text?: string | null
          kvk?: string | null
          logo_url?: string | null
          payment_terms?: number | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          default_vat?: number | null
          email?: string | null
          iban?: string | null
          id?: string
          invoice_footer_text?: string | null
          kvk?: string | null
          logo_url?: string | null
          payment_terms?: number | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: { Args: { p_year: number }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
