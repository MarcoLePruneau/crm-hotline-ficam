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
      calendar_events_simulated: {
        Row: {
          body: string | null
          created_at: string
          direction: string
          end_at: string | null
          id: string
          location: string | null
          start_at: string
          status: string
          technician: string | null
          ticket_id: string | null
          ticket_number: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          direction?: string
          end_at?: string | null
          id?: string
          location?: string | null
          start_at?: string
          status?: string
          technician?: string | null
          ticket_id?: string | null
          ticket_number?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          direction?: string
          end_at?: string | null
          id?: string
          location?: string | null
          start_at?: string
          status?: string
          technician?: string | null
          ticket_id?: string | null
          ticket_number?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          fonction: string | null
          id: string
          is_primary: boolean
          nom: string
          notes: string | null
          teamviewer_id: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          fonction?: string | null
          id?: string
          is_primary?: boolean
          nom: string
          notes?: string | null
          teamviewer_id?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          fonction?: string | null
          id?: string
          is_primary?: boolean
          nom?: string
          notes?: string | null
          teamviewer_id?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
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
          teamviewer_id: string | null
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
          teamviewer_id?: string | null
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
          teamviewer_id?: string | null
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          affaire: string | null
          client_id: string | null
          client_nom: string
          created_at: string
          date_commande: string | null
          date_debut: string | null
          date_fin: string | null
          external_ref: string | null
          id: string
          numero_commande: string | null
          source_file: string | null
          type_abonnement: string
          updated_at: string
        }
        Insert: {
          affaire?: string | null
          client_id?: string | null
          client_nom: string
          created_at?: string
          date_commande?: string | null
          date_debut?: string | null
          date_fin?: string | null
          external_ref?: string | null
          id?: string
          numero_commande?: string | null
          source_file?: string | null
          type_abonnement: string
          updated_at?: string
        }
        Update: {
          affaire?: string | null
          client_id?: string | null
          client_nom?: string
          created_at?: string
          date_commande?: string | null
          date_debut?: string | null
          date_fin?: string | null
          external_ref?: string | null
          id?: string
          numero_commande?: string | null
          source_file?: string | null
          type_abonnement?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string | null
          created_at: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          read_at: string | null
          recipient: string
          sender: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          read_at?: string | null
          recipient: string
          sender: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          read_at?: string | null
          recipient?: string
          sender?: string
        }
        Relationships: []
      }
      hotline_credentials: {
        Row: {
          created_at: string
          id: string
          login: string
          password: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          login?: string
          password: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          login?: string
          password?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      hotline_email_log: {
        Row: {
          from_address: string | null
          id: string
          message_id: string
          processed_at: string
          subject: string | null
          ticket_id: string | null
        }
        Insert: {
          from_address?: string | null
          id?: string
          message_id: string
          processed_at?: string
          subject?: string | null
          ticket_id?: string | null
        }
        Update: {
          from_address?: string | null
          id?: string
          message_id?: string
          processed_at?: string
          subject?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotline_email_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
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
      technician_preferences: {
        Row: {
          created_at: string
          pense_betes: Json
          shortcuts: Json
          technicien: string
          updated_at: string
          widgets: Json
        }
        Insert: {
          created_at?: string
          pense_betes?: Json
          shortcuts?: Json
          technicien: string
          updated_at?: string
          widgets?: Json
        }
        Update: {
          created_at?: string
          pense_betes?: Json
          shortcuts?: Json
          technicien?: string
          updated_at?: string
          widgets?: Json
        }
        Relationships: []
      }
      technician_presence: {
        Row: {
          last_seen: string
          status: string
          technicien: string
          updated_at: string
        }
        Insert: {
          last_seen?: string
          status?: string
          technicien: string
          updated_at?: string
        }
        Update: {
          last_seen?: string
          status?: string
          technicien?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          ticket_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          ticket_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          ticket_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
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
          compte_rendu: string | null
          contact_client: string | null
          contact_id: string | null
          created_at: string
          date_cloture: string | null
          date_ouverture: string
          description: string | null
          duree_secondes: number
          heure_debut_effectif: string | null
          heure_fin_effectif: string | null
          hors_contrat: boolean
          hotline_override: string | null
          id: string
          motif: Database["public"]["Enums"]["ticket_motif"]
          motif_detail: string | null
          outlook_body_preview: string | null
          outlook_event_id: string | null
          outlook_location: string | null
          outlook_synced_at: string | null
          priorite: Database["public"]["Enums"]["ticket_priority"]
          resolution: string | null
          scheduled_at: string | null
          source: string
          statut: Database["public"]["Enums"]["ticket_status"]
          teamviewer_id: string | null
          teamviewer_password: string | null
          technicien: string
          telephone_client: string | null
          ticket_number: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_nom: string
          compte_rendu?: string | null
          contact_client?: string | null
          contact_id?: string | null
          created_at?: string
          date_cloture?: string | null
          date_ouverture?: string
          description?: string | null
          duree_secondes?: number
          heure_debut_effectif?: string | null
          heure_fin_effectif?: string | null
          hors_contrat?: boolean
          hotline_override?: string | null
          id?: string
          motif?: Database["public"]["Enums"]["ticket_motif"]
          motif_detail?: string | null
          outlook_body_preview?: string | null
          outlook_event_id?: string | null
          outlook_location?: string | null
          outlook_synced_at?: string | null
          priorite?: Database["public"]["Enums"]["ticket_priority"]
          resolution?: string | null
          scheduled_at?: string | null
          source?: string
          statut?: Database["public"]["Enums"]["ticket_status"]
          teamviewer_id?: string | null
          teamviewer_password?: string | null
          technicien: string
          telephone_client?: string | null
          ticket_number?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_nom?: string
          compte_rendu?: string | null
          contact_client?: string | null
          contact_id?: string | null
          created_at?: string
          date_cloture?: string | null
          date_ouverture?: string
          description?: string | null
          duree_secondes?: number
          heure_debut_effectif?: string | null
          heure_fin_effectif?: string | null
          hors_contrat?: boolean
          hotline_override?: string | null
          id?: string
          motif?: Database["public"]["Enums"]["ticket_motif"]
          motif_detail?: string | null
          outlook_body_preview?: string | null
          outlook_event_id?: string | null
          outlook_location?: string | null
          outlook_synced_at?: string | null
          priorite?: Database["public"]["Enums"]["ticket_priority"]
          resolution?: string | null
          scheduled_at?: string | null
          source?: string
          statut?: Database["public"]["Enums"]["ticket_status"]
          teamviewer_id?: string | null
          teamviewer_password?: string | null
          technicien?: string
          telephone_client?: string | null
          ticket_number?: string
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
          {
            foreignKeyName: "tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_technicien: { Args: never; Returns: string }
      is_ficam_tech: { Args: never; Returns: boolean }
    }
    Enums: {
      contract_type:
        | "maintenance_hotline"
        | "hotline"
        | "maintenance"
        | "hors_contrat"
        | "cimco"
        | "souscription"
      ticket_motif:
        | "aide_programmation"
        | "modification_pp"
        | "installation"
        | "mise_a_jour_licence"
        | "autre"
        | "cimco"
        | "aide_prog_tournage"
        | "aide_prog_fraisage"
        | "aide_prog_millturn"
        | "mod_pp_tournage"
        | "mod_pp_fraisage_3_4"
        | "mod_pp_fraisage_5"
        | "mod_pp_millturn"
        | "install_mastercam"
        | "migration_pp"
      ticket_priority: "basse" | "haute" | "critique"
      ticket_status:
        | "ouvert"
        | "en_cours"
        | "attente_client"
        | "resolu"
        | "ferme"
        | "a_rappeler"
        | "a_appeler"
        | "traite"
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
        "cimco",
        "souscription",
      ],
      ticket_motif: [
        "aide_programmation",
        "modification_pp",
        "installation",
        "mise_a_jour_licence",
        "autre",
        "cimco",
        "aide_prog_tournage",
        "aide_prog_fraisage",
        "aide_prog_millturn",
        "mod_pp_tournage",
        "mod_pp_fraisage_3_4",
        "mod_pp_fraisage_5",
        "mod_pp_millturn",
        "install_mastercam",
        "migration_pp",
      ],
      ticket_priority: ["basse", "haute", "critique"],
      ticket_status: [
        "ouvert",
        "en_cours",
        "attente_client",
        "resolu",
        "ferme",
        "a_rappeler",
        "a_appeler",
        "traite",
      ],
    },
  },
} as const
