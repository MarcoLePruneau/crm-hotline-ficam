CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START WITH 1000 INCREMENT BY 1;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS teamviewer_id text;

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS ticket_number text DEFAULT ('FICAM-' || nextval('public.ticket_number_seq'::regclass)::text),
ADD COLUMN IF NOT EXISTS contact_client text,
ADD COLUMN IF NOT EXISTS telephone_client text,
ADD COLUMN IF NOT EXISTS teamviewer_id text,
ADD COLUMN IF NOT EXISTS teamviewer_password text,
ADD COLUMN IF NOT EXISTS heure_debut_effectif timestamp with time zone,
ADD COLUMN IF NOT EXISTS heure_fin_effectif timestamp with time zone,
ADD COLUMN IF NOT EXISTS compte_rendu text,
ADD COLUMN IF NOT EXISTS outlook_location text,
ADD COLUMN IF NOT EXISTS outlook_body_preview text;

UPDATE public.tickets
SET ticket_number = 'FICAM-' || nextval('public.ticket_number_seq'::regclass)::text
WHERE ticket_number IS NULL;

ALTER TABLE public.tickets
ALTER COLUMN ticket_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tickets_ticket_number_key ON public.tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_clients_teamviewer_id ON public.clients(teamviewer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON public.tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_client_motif_date ON public.tickets(client_id, motif, date_ouverture);

CREATE TABLE IF NOT EXISTS public.calendar_events_simulated (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid,
  ticket_number text,
  title text NOT NULL,
  location text,
  body text,
  start_at timestamp with time zone NOT NULL DEFAULT now(),
  end_at timestamp with time zone,
  technician text,
  direction text NOT NULL DEFAULT 'app_to_calendar',
  status text NOT NULL DEFAULT 'simulated',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events_simulated ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events_simulated' AND policyname = 'Public read simulated calendar events') THEN
    CREATE POLICY "Public read simulated calendar events"
    ON public.calendar_events_simulated
    FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events_simulated' AND policyname = 'Public insert simulated calendar events') THEN
    CREATE POLICY "Public insert simulated calendar events"
    ON public.calendar_events_simulated
    FOR INSERT
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events_simulated' AND policyname = 'Public update simulated calendar events') THEN
    CREATE POLICY "Public update simulated calendar events"
    ON public.calendar_events_simulated
    FOR UPDATE
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events_simulated' AND policyname = 'Public delete simulated calendar events') THEN
    CREATE POLICY "Public delete simulated calendar events"
    ON public.calendar_events_simulated
    FOR DELETE
    USING (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_calendar_events_simulated_updated_at ON public.calendar_events_simulated;
CREATE TRIGGER update_calendar_events_simulated_updated_at
BEFORE UPDATE ON public.calendar_events_simulated
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();