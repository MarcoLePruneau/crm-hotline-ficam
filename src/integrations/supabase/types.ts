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
      clients: {
        Row: {
          adresse: string | null
          code_postal: string | null
          contact_fonction: string | null
          contact_nom: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          date_echeance_hotline: string | null
          date_echeance_maintenance: string | null
          email: string | null
          entreprise: string
          external_ref: string | null
          extra_contacts: Json
          id: string
          notes: string | null
          numero_serie_mastercam: string | null
          pays: string | null
          telephone: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          code_postal?: string | null
          contact_fonction?: string | null
          contact_nom?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          date_echeance_hotline?: string | null
          date_echeance_maintenance?: string | null
          email?: string | null
          entreprise: string
          external_ref?: string | null
          extra_contacts?: Json
          id?: string
          notes?: string | null
          numero_serie_mastercam?: string | null
          pays?: string | null
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          code_postal?: string | null
          contact_fonction?: string | null
          contact_nom?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          date_echeance_hotline?: string | null
          date_echeance_maintenance?: string | null
          email?: string | null
          entreprise?: string
          external_ref?: string | null
          extra_contacts?: Json
          id?: string
          notes?: string | null
          numero_serie_mastercam?: string | null
          pays?: string | null
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      outlook_sync_state: {
        Row: {
          calendar_email: string
          created_at: string
          delta_token: string | null
          id: string
          last_sync_at: string | null
          updated_at: string
        }
        Insert: {
          calendar_email: string
          created_at?: string
          delta_token?: string | null
          id?: string
          last_sync_at?: string | null
          updated_at?: string
        }
        Update: {
          calendar_email?: string
          created_at?: string
          delta_token?: string | null
          id?: string
          last_sync_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ticket_time_logs: {
        Row: {
          created_at: string
          duree_secondes: number | null
          ended_at: string | null
          id: string
          started_at: string
          technicien: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          duree_secondes?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          technicien: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          duree_secondes?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          technicien?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_time_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          client_id: string | null
          client_nom: string
          created_at: string
          date_cloture: string | null
          date_ouverture: string
          description: string | null
          duree_secondes: number
          hors_contrat: boolean
          id: string
          motif: Database["public"]["Enums"]["ticket_motif"]
          motif_detail: string | null
          outlook_event_id: string | null
          outlook_synced_at: string | null
          priorite: Database["public"]["Enums"]["ticket_priority"]
          resolution: string | null
          statut: Database["public"]["Enums"]["ticket_status"]
          technicien: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_nom: string
          created_at?: string
          date_cloture?: string | null
          date_ouverture?: string
          description?: string | null
          duree_secondes?: number
          hors_contrat?: boolean
          id?: string
          motif?: Database["public"]["Enums"]["ticket_motif"]
          motif_detail?: string | null
          outlook_event_id?: string | null
          outlook_synced_at?: string | null
          priorite?: Database["public"]["Enums"]["ticket_priority"]
          resolution?: string | null
          statut?: Database["public"]["Enums"]["ticket_status"]
          technicien: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_nom?: string
          created_at?: string
          date_cloture?: string | null
          date_ouverture?: string
          description?: string | null
          duree_secondes?: number
          hors_contrat?: boolean
          id?: string
          motif?: Database["public"]["Enums"]["ticket_motif"]
          motif_detail?: string | null
          outlook_event_id?: string | null
          outlook_synced_at?: string | null
          priorite?: Database["public"]["Enums"]["ticket_priority"]
          resolution?: string | null
          statut?: Database["public"]["Enums"]["ticket_status"]
          technicien?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      contract_type:
        | "maintenance_hotline"
        | "hotline"
        | "maintenance"
        | "hors_contrat"
      ticket_motif:
        | "aide_programmation"
        | "modification_pp"
        | "installation"
        | "mise_a_jour_licence"
        | "autre"
      ticket_priority: "basse" | "haute" | "critique"
      ticket_status:
        | "ouvert"
        | "en_cours"
        | "attente_client"
        | "resolu"
        | "ferme"
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
      contract_type: [
        "maintenance_hotline",
        "hotline",
        "maintenance",
        "hors_contrat",
      ],
      ticket_motif: [
        "aide_programmation",
        "modification_pp",
        "installation",
        "mise_a_jour_licence",
        "autre",
      ],
      ticket_priority: ["basse", "haute", "critique"],
      ticket_status: [
        "ouvert",
        "en_cours",
        "attente_client",
        "resolu",
        "ferme",
      ],
    },
  },
} as const
