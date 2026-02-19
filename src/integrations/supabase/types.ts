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
      alertas: {
        Row: {
          cliente_id: string
          competencia: string
          created_at: string
          descricao: string
          id: string
          resolvido: boolean
          socio_id: string | null
          tipo: Database["public"]["Enums"]["tipo_alerta"]
        }
        Insert: {
          cliente_id: string
          competencia: string
          created_at?: string
          descricao: string
          id?: string
          resolvido?: boolean
          socio_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_alerta"]
        }
        Update: {
          cliente_id?: string
          competencia?: string
          created_at?: string
          descricao?: string
          id?: string
          resolvido?: boolean
          socio_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_alerta"]
        }
        Relationships: [
          {
            foreignKeyName: "alertas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cnpj: string
          created_at: string
          email_copia: string | null
          email_responsavel: string
          id: string
          razao_social: string
          status: Database["public"]["Enums"]["status_cliente"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          email_copia?: string | null
          email_responsavel: string
          id?: string
          razao_social: string
          status?: Database["public"]["Enums"]["status_cliente"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          email_copia?: string | null
          email_responsavel?: string
          id?: string
          razao_social?: string
          status?: Database["public"]["Enums"]["status_cliente"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      confirmacoes_mes: {
        Row: {
          cliente_id: string
          competencia: string
          created_at: string
          id: string
          observacao: string | null
          resposta: Database["public"]["Enums"]["resposta_confirmacao"]
        }
        Insert: {
          cliente_id: string
          competencia: string
          created_at?: string
          id?: string
          observacao?: string | null
          resposta: Database["public"]["Enums"]["resposta_confirmacao"]
        }
        Update: {
          cliente_id?: string
          competencia?: string
          created_at?: string
          id?: string
          observacao?: string | null
          resposta?: Database["public"]["Enums"]["resposta_confirmacao"]
        }
        Relationships: [
          {
            foreignKeyName: "confirmacoes_mes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      distribuicao_historico: {
        Row: {
          created_at: string
          distribuicao_id: string
          id: string
          observacao: string | null
          status_anterior:
            | Database["public"]["Enums"]["status_distribuicao"]
            | null
          status_novo: Database["public"]["Enums"]["status_distribuicao"]
          usuario_id: string
        }
        Insert: {
          created_at?: string
          distribuicao_id: string
          id?: string
          observacao?: string | null
          status_anterior?:
            | Database["public"]["Enums"]["status_distribuicao"]
            | null
          status_novo: Database["public"]["Enums"]["status_distribuicao"]
          usuario_id: string
        }
        Update: {
          created_at?: string
          distribuicao_id?: string
          id?: string
          observacao?: string | null
          status_anterior?:
            | Database["public"]["Enums"]["status_distribuicao"]
            | null
          status_novo?: Database["public"]["Enums"]["status_distribuicao"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribuicao_historico_distribuicao_id_fkey"
            columns: ["distribuicao_id"]
            isOneToOne: false
            referencedRelation: "distribuicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      distribuicao_itens: {
        Row: {
          created_at: string
          distribuicao_id: string
          id: string
          socio_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          distribuicao_id: string
          id?: string
          socio_id: string
          valor: number
        }
        Update: {
          created_at?: string
          distribuicao_id?: string
          id?: string
          socio_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "distribuicao_itens_distribuicao_id_fkey"
            columns: ["distribuicao_id"]
            isOneToOne: false
            referencedRelation: "distribuicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribuicao_itens_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
        ]
      }
      distribuicoes: {
        Row: {
          cliente_id: string
          competencia: string
          created_at: string
          data_distribuicao: string
          forma_pagamento: string
          id: string
          recibo_numero: string | null
          recibo_pdf_url: string | null
          solicitante_email: string
          solicitante_nome: string
          status: Database["public"]["Enums"]["status_distribuicao"]
          updated_at: string
          valor_total: number
        }
        Insert: {
          cliente_id: string
          competencia: string
          created_at?: string
          data_distribuicao: string
          forma_pagamento: string
          id?: string
          recibo_numero?: string | null
          recibo_pdf_url?: string | null
          solicitante_email: string
          solicitante_nome: string
          status?: Database["public"]["Enums"]["status_distribuicao"]
          updated_at?: string
          valor_total: number
        }
        Update: {
          cliente_id?: string
          competencia?: string
          created_at?: string
          data_distribuicao?: string
          forma_pagamento?: string
          id?: string
          recibo_numero?: string | null
          recibo_pdf_url?: string | null
          solicitante_email?: string
          solicitante_nome?: string
          status?: Database["public"]["Enums"]["status_distribuicao"]
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "distribuicoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          cliente_id: string
          created_at: string
          distribuicao_id: string | null
          id: string
          lida: boolean
          mensagem: string
          titulo: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          distribuicao_id?: string | null
          id?: string
          lida?: boolean
          mensagem: string
          titulo: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          distribuicao_id?: string | null
          id?: string
          lida?: boolean
          mensagem?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_distribuicao_id_fkey"
            columns: ["distribuicao_id"]
            isOneToOne: false
            referencedRelation: "distribuicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      recibo_sequencia: {
        Row: {
          ano: number
          id: number
          ultimo_numero: number
        }
        Insert: {
          ano: number
          id?: number
          ultimo_numero?: number
        }
        Update: {
          ano?: number
          id?: number
          ultimo_numero?: number
        }
        Relationships: []
      }
      socios: {
        Row: {
          ativo: boolean
          cliente_id: string
          cpf: string
          created_at: string
          id: string
          nome: string
          percentual: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          cpf: string
          created_at?: string
          id?: string
          nome: string
          percentual?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          cpf?: string
          created_at?: string
          id?: string
          nome?: string
          percentual?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "socios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_clientes: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          cliente_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roles_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_user_by_email: {
        Args: { _email: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      gerar_numero_recibo: { Args: never; Returns: string }
      get_user_cliente_id: { Args: { _user_id: string }; Returns: string }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_cliente_owner: { Args: { _cliente_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "cliente"
      resposta_confirmacao: "NAO_HOUVE" | "HOUVE"
      status_cliente: "ativo" | "suspenso"
      status_distribuicao:
        | "ENVIADA_AO_CONTADOR"
        | "RECEBIDA"
        | "EM_VALIDACAO"
        | "APROVADA"
        | "AJUSTE_SOLICITADO"
        | "CANCELADA"
      tipo_alerta: "ALERTA_50K" | "PENDENTE_MES"
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
      app_role: ["admin", "cliente"],
      resposta_confirmacao: ["NAO_HOUVE", "HOUVE"],
      status_cliente: ["ativo", "suspenso"],
      status_distribuicao: [
        "ENVIADA_AO_CONTADOR",
        "RECEBIDA",
        "EM_VALIDACAO",
        "APROVADA",
        "AJUSTE_SOLICITADO",
        "CANCELADA",
      ],
      tipo_alerta: ["ALERTA_50K", "PENDENTE_MES"],
    },
  },
} as const
