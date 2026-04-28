
-- Enums
CREATE TYPE public.contract_type AS ENUM ('maintenance_hotline', 'hotline', 'maintenance', 'hors_contrat');
CREATE TYPE public.ticket_priority AS ENUM ('basse', 'haute', 'critique');
CREATE TYPE public.ticket_status AS ENUM ('ouvert', 'en_cours', 'attente_client', 'resolu', 'ferme');
CREATE TYPE public.ticket_motif AS ENUM ('aide_programmation', 'modification_pp', 'installation', 'mise_a_jour_licence', 'autre');

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Clients
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise TEXT NOT NULL,
  contact_nom TEXT,
  contact_fonction TEXT,
  telephone TEXT,
  email TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT,
  numero_serie_mastercam TEXT,
  contract_type public.contract_type NOT NULL DEFAULT 'hors_contrat',
  date_echeance_maintenance DATE,
  date_echeance_hotline DATE,
  extra_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_entreprise ON public.clients (entreprise);
CREATE INDEX idx_clients_contract_type ON public.clients (contract_type);
CREATE INDEX idx_clients_echeance_maintenance ON public.clients (date_echeance_maintenance);

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Public insert clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Public delete clients" ON public.clients FOR DELETE USING (true);

-- Tickets
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nom TEXT NOT NULL,
  technicien TEXT NOT NULL,
  motif public.ticket_motif NOT NULL DEFAULT 'autre',
  motif_detail TEXT,
  priorite public.ticket_priority NOT NULL DEFAULT 'basse',
  statut public.ticket_status NOT NULL DEFAULT 'ouvert',
  description TEXT,
  resolution TEXT,
  duree_secondes INTEGER NOT NULL DEFAULT 0,
  hors_contrat BOOLEAN NOT NULL DEFAULT false,
  outlook_event_id TEXT UNIQUE,
  outlook_synced_at TIMESTAMPTZ,
  date_ouverture TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_cloture TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_client ON public.tickets (client_id);
CREATE INDEX idx_tickets_technicien ON public.tickets (technicien);
CREATE INDEX idx_tickets_statut ON public.tickets (statut);
CREATE INDEX idx_tickets_date_ouverture ON public.tickets (date_ouverture DESC);
CREATE INDEX idx_tickets_motif ON public.tickets (motif);

CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read tickets" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Public insert tickets" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update tickets" ON public.tickets FOR UPDATE USING (true);
CREATE POLICY "Public delete tickets" ON public.tickets FOR DELETE USING (true);

-- Time logs
CREATE TABLE public.ticket_time_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  technicien TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duree_secondes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_time_logs_ticket ON public.ticket_time_logs (ticket_id);

ALTER TABLE public.ticket_time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read time_logs" ON public.ticket_time_logs FOR SELECT USING (true);
CREATE POLICY "Public insert time_logs" ON public.ticket_time_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update time_logs" ON public.ticket_time_logs FOR UPDATE USING (true);
CREATE POLICY "Public delete time_logs" ON public.ticket_time_logs FOR DELETE USING (true);

-- Outlook sync state
CREATE TABLE public.outlook_sync_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_email TEXT NOT NULL UNIQUE,
  delta_token TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_outlook_sync_updated_at
  BEFORE UPDATE ON public.outlook_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.outlook_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sync_state" ON public.outlook_sync_state FOR SELECT USING (true);
CREATE POLICY "Public insert sync_state" ON public.outlook_sync_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update sync_state" ON public.outlook_sync_state FOR UPDATE USING (true);
