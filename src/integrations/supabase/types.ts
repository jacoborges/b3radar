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
          created_at: string
          key: string
          updated_at: string
          value: string
          version: number
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: string
          version?: number
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
          version?: number
        }
        Relationships: []
      }
      dividend_cache: {
        Row: {
          error: string | null
          eventos_cash: Json
          fetched_at: string
          fonte: string | null
          historico: Json
          historico_completo: Json
          provisionados: Json
          ticker: string
          trading_name: string | null
        }
        Insert: {
          error?: string | null
          eventos_cash?: Json
          fetched_at?: string
          fonte?: string | null
          historico?: Json
          historico_completo?: Json
          provisionados?: Json
          ticker: string
          trading_name?: string | null
        }
        Update: {
          error?: string | null
          eventos_cash?: Json
          fetched_at?: string
          fonte?: string | null
          historico?: Json
          historico_completo?: Json
          provisionados?: Json
          ticker?: string
          trading_name?: string | null
        }
        Relationships: []
      }
      macro_observations: {
        Row: {
          date: string
          series_code: string
          value: number
        }
        Insert: {
          date: string
          series_code: string
          value: number
        }
        Update: {
          date?: string
          series_code?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "macro_observations_series_code_fkey"
            columns: ["series_code"]
            isOneToOne: false
            referencedRelation: "macro_series"
            referencedColumns: ["code"]
          },
        ]
      }
      macro_series: {
        Row: {
          category: string
          code: string
          description: string
          frequency: string
          last_date: string | null
          last_value: number | null
          name: string
          sort_order: number
          source: string
          source_id: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          code: string
          description?: string
          frequency?: string
          last_date?: string | null
          last_value?: number | null
          name: string
          sort_order?: number
          source: string
          source_id: string
          unit?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          description?: string
          frequency?: string
          last_date?: string | null
          last_value?: number | null
          name?: string
          sort_order?: number
          source?: string
          source_id?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      market_cache: {
        Row: {
          fetched_at: string
          kind: string
          payload: Json
          ticker: string
        }
        Insert: {
          fetched_at?: string
          kind: string
          payload: Json
          ticker: string
        }
        Update: {
          fetched_at?: string
          kind?: string
          payload?: Json
          ticker?: string
        }
        Relationships: []
      }
      open_orders: {
        Row: {
          created_at: string
          filled_at: string | null
          id: string
          portfolio_id: string
          price: number
          quantity: number
          ticker: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filled_at?: string | null
          id?: string
          portfolio_id: string
          price: number
          quantity: number
          ticker: string
          user_id?: string
        }
        Update: {
          created_at?: string
          filled_at?: string | null
          id?: string
          portfolio_id?: string
          price?: number
          quantity?: number
          ticker?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_orders_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_lots: {
        Row: {
          bought_at: string
          created_at: string
          id: string
          portfolio_id: string
          price: number
          quantity: number
          ticker: string
          updated_at: string
        }
        Insert: {
          bought_at?: string
          created_at?: string
          id?: string
          portfolio_id: string
          price: number
          quantity: number
          ticker: string
          updated_at?: string
        }
        Update: {
          bought_at?: string
          created_at?: string
          id?: string
          portfolio_id?: string
          price?: number
          quantity?: number
          ticker?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_lots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_sales: {
        Row: {
          created_at: string
          id: string
          portfolio_id: string
          price: number
          quantity: number
          sold_at: string
          ticker: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          portfolio_id: string
          price: number
          quantity: number
          sold_at?: string
          ticker: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          portfolio_id?: string
          price?: number
          quantity?: number
          sold_at?: string
          ticker?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_sales_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          suspended: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          suspended?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          suspended?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      sim_portfolio_lots: {
        Row: {
          bought_at: string
          created_at: string
          id: string
          portfolio_id: string
          price: number
          quantity: number
          ticker: string
          updated_at: string
        }
        Insert: {
          bought_at?: string
          created_at?: string
          id?: string
          portfolio_id: string
          price: number
          quantity: number
          ticker: string
          updated_at?: string
        }
        Update: {
          bought_at?: string
          created_at?: string
          id?: string
          portfolio_id?: string
          price?: number
          quantity?: number
          ticker?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_portfolio_lots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "sim_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_portfolios: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_group_items: {
        Row: {
          created_at: string
          group_id: string
          id: string
          ticker: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          ticker: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          ticker?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_group_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "stock_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_groups: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_access_sessions: {
        Row: {
          client_session_id: string
          created_at: string
          id: string
          last_seen_at: string
          signed_in_at: string
          signed_out_at: string | null
          user_id: string
        }
        Insert: {
          client_session_id: string
          created_at?: string
          id?: string
          last_seen_at?: string
          signed_in_at?: string
          signed_out_at?: string | null
          user_id: string
        }
        Update: {
          client_session_id?: string
          created_at?: string
          id?: string
          last_seen_at?: string
          signed_in_at?: string
          signed_out_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
      user_settings: {
        Row: {
          brapi_token: string | null
          created_at: string
          monthly_sales_limit: number
          selected_sectors: Json | null
          stock_columns: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brapi_token?: string | null
          created_at?: string
          monthly_sales_limit?: number
          selected_sectors?: Json | null
          stock_columns?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brapi_token?: string | null
          created_at?: string
          monthly_sales_limit?: number
          selected_sectors?: Json | null
          stock_columns?: Json | null
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
      record_portfolio_sale: {
        Args: {
          _expected_lots: Json
          _expected_sales: Json
          _portfolio_id: string
          _price: number
          _quantity: number
          _sold_at: string
          _ticker: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "usuario"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "gestor", "usuario"],
    },
  },
} as const
