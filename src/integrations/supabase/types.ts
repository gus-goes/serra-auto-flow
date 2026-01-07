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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      banks: {
        Row: {
          commission_rate: number | null
          created_at: string
          id: string
          interest_rate: number | null
          is_active: boolean | null
          logo_url: string | null
          name: string
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string
          id?: string
          interest_rate?: number | null
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          commission_rate?: number | null
          created_at?: string
          id?: string
          interest_rate?: number | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          cpf: string | null
          created_at: string
          email: string | null
          funnel_stage: Database["public"]["Enums"]["funnel_stage"]
          id: string
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          name: string
          notes: string | null
          occupation: string | null
          phone: string | null
          rg: string | null
          seller_id: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          funnel_stage?: Database["public"]["Enums"]["funnel_stage"]
          id?: string
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          name: string
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          rg?: string | null
          seller_id?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          funnel_stage?: Database["public"]["Enums"]["funnel_stage"]
          id?: string
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          name?: string
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          rg?: string | null
          seller_id?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          client_id: string | null
          client_signature: string | null
          contract_date: string
          contract_number: string
          created_at: string
          delivery_percentage: number | null
          first_due_date: string | null
          id: string
          proposal_id: string | null
          seller_id: string | null
          seller_signature: string | null
          signed_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          client_id?: string | null
          client_signature?: string | null
          contract_date?: string
          contract_number: string
          created_at?: string
          delivery_percentage?: number | null
          first_due_date?: string | null
          id?: string
          proposal_id?: string | null
          seller_id?: string | null
          seller_signature?: string | null
          signed_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          client_id?: string | null
          client_signature?: string | null
          contract_date?: string
          contract_number?: string
          created_at?: string
          delivery_percentage?: number | null
          first_due_date?: string | null
          id?: string
          proposal_id?: string | null
          seller_id?: string | null
          seller_signature?: string | null
          signed_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          bank_id: string | null
          client_id: string | null
          created_at: string
          down_payment: number | null
          financed_amount: number | null
          first_due_date: string | null
          id: string
          installment_value: number | null
          installments: number | null
          interest_rate: number | null
          notes: string | null
          proposal_number: string
          seller_id: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          total_amount: number
          type: Database["public"]["Enums"]["proposal_type"]
          updated_at: string
          vehicle_id: string | null
          vehicle_price: number
        }
        Insert: {
          bank_id?: string | null
          client_id?: string | null
          created_at?: string
          down_payment?: number | null
          financed_amount?: number | null
          first_due_date?: string | null
          id?: string
          installment_value?: number | null
          installments?: number | null
          interest_rate?: number | null
          notes?: string | null
          proposal_number: string
          seller_id?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          total_amount: number
          type: Database["public"]["Enums"]["proposal_type"]
          updated_at?: string
          vehicle_id?: string | null
          vehicle_price: number
        }
        Update: {
          bank_id?: string | null
          client_id?: string | null
          created_at?: string
          down_payment?: number | null
          financed_amount?: number | null
          first_due_date?: string | null
          id?: string
          installment_value?: number | null
          installments?: number | null
          interest_rate?: number | null
          notes?: string | null
          proposal_number?: string
          seller_id?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          total_amount?: number
          type?: Database["public"]["Enums"]["proposal_type"]
          updated_at?: string
          vehicle_id?: string | null
          vehicle_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposals_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference: Database["public"]["Enums"]["payment_reference"]
          proposal_id: string | null
          receipt_number: string
          seller_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference: Database["public"]["Enums"]["payment_reference"]
          proposal_id?: string | null
          receipt_number: string
          seller_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_reference?: Database["public"]["Enums"]["payment_reference"]
          proposal_id?: string | null
          receipt_number?: string
          seller_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          client_id: string | null
          created_at: string
          deposit_amount: number | null
          expiry_date: string | null
          id: string
          notes: string | null
          reservation_date: string
          seller_id: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          deposit_amount?: number | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          reservation_date?: string
          seller_id?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          deposit_amount?: number | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          reservation_date?: string
          seller_id?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          client_id: string | null
          commission_value: number | null
          created_at: string
          id: string
          notes: string | null
          proposal_id: string | null
          sale_date: string
          seller_id: string | null
          total_value: number
          vehicle_id: string | null
        }
        Insert: {
          client_id?: string | null
          commission_value?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          proposal_id?: string | null
          sale_date?: string
          seller_id?: string | null
          total_value: number
          vehicle_id?: string | null
        }
        Update: {
          client_id?: string | null
          commission_value?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          proposal_id?: string | null
          sale_date?: string
          seller_id?: string | null
          total_value?: number
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
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
      vehicle_photos: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          photo_url: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          photo_url: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          photo_url?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_photos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          chassi: string | null
          color: string
          created_at: string
          created_by: string | null
          crv_number: string | null
          description: string | null
          fuel: Database["public"]["Enums"]["fuel_type"]
          id: string
          mileage: number | null
          model: string
          plate: string | null
          price: number
          renavam: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          transmission: Database["public"]["Enums"]["transmission_type"]
          updated_at: string
          version: string | null
          year_fab: number
          year_model: number
        }
        Insert: {
          brand: string
          chassi?: string | null
          color: string
          created_at?: string
          created_by?: string | null
          crv_number?: string | null
          description?: string | null
          fuel?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          mileage?: number | null
          model: string
          plate?: string | null
          price: number
          renavam?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          transmission?: Database["public"]["Enums"]["transmission_type"]
          updated_at?: string
          version?: string | null
          year_fab: number
          year_model: number
        }
        Update: {
          brand?: string
          chassi?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          crv_number?: string | null
          description?: string | null
          fuel?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          mileage?: number | null
          model?: string
          plate?: string | null
          price?: number
          renavam?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          transmission?: Database["public"]["Enums"]["transmission_type"]
          updated_at?: string
          version?: string | null
          year_fab?: number
          year_model?: number
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "vendedor" | "cliente"
      fuel_type:
        | "flex"
        | "gasolina"
        | "etanol"
        | "diesel"
        | "eletrico"
        | "hibrido"
      funnel_stage:
        | "lead"
        | "atendimento"
        | "simulacao"
        | "proposta"
        | "vendido"
        | "perdido"
      marital_status:
        | "solteiro"
        | "casado"
        | "divorciado"
        | "viuvo"
        | "uniao_estavel"
      payment_method:
        | "dinheiro"
        | "pix"
        | "cartao_debito"
        | "cartao_credito"
        | "transferencia"
        | "boleto"
        | "cheque"
      payment_reference: "entrada" | "sinal" | "parcial" | "quitacao"
      proposal_status: "pendente" | "aprovada" | "recusada" | "cancelada"
      proposal_type:
        | "financiamento_bancario"
        | "financiamento_direto"
        | "a_vista"
      reservation_status: "ativa" | "cancelada" | "convertida"
      transmission_type: "manual" | "automatico" | "cvt" | "automatizado"
      vehicle_status: "disponivel" | "reservado" | "vendido"
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
      app_role: ["admin", "vendedor", "cliente"],
      fuel_type: [
        "flex",
        "gasolina",
        "etanol",
        "diesel",
        "eletrico",
        "hibrido",
      ],
      funnel_stage: [
        "lead",
        "atendimento",
        "simulacao",
        "proposta",
        "vendido",
        "perdido",
      ],
      marital_status: [
        "solteiro",
        "casado",
        "divorciado",
        "viuvo",
        "uniao_estavel",
      ],
      payment_method: [
        "dinheiro",
        "pix",
        "cartao_debito",
        "cartao_credito",
        "transferencia",
        "boleto",
        "cheque",
      ],
      payment_reference: ["entrada", "sinal", "parcial", "quitacao"],
      proposal_status: ["pendente", "aprovada", "recusada", "cancelada"],
      proposal_type: [
        "financiamento_bancario",
        "financiamento_direto",
        "a_vista",
      ],
      reservation_status: ["ativa", "cancelada", "convertida"],
      transmission_type: ["manual", "automatico", "cvt", "automatizado"],
      vehicle_status: ["disponivel", "reservado", "vendido"],
    },
  },
} as const
