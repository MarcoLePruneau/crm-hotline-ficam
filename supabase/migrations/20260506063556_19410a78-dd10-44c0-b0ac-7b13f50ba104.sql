-- ============================================================
-- FICAM V1.2 — Schéma relationnel Everwin-compatible
-- ============================================================

-- 1. Élargir l'enum contract_type avec "souscription"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'contract_type' AND e.enumlabel = 'souscription'
  ) THEN
    ALTER TYPE contract_type ADD VALUE 'souscription';
  END IF;
END$$;

-- 2. Table contrats (historique complet, multi-lignes par client)
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  client_nom text NOT NULL,
  external_ref text,
  numero_commande text,
  date_commande date,
  type_abonnement text NOT NULL,             -- 'hotline' | 'maintenance' | 'souscription' | 'autre'
  affaire text,
  date_debut date,
  date_fin date,
  source_file text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contracts_client_id_idx ON public.contracts(client_id);
CREATE INDEX IF NOT EXISTS contracts_external_ref_idx ON public.contracts(external_ref);
CREATE INDEX IF NOT EXISTS contracts_type_idx ON public.contracts(type_abonnement);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read contracts" ON public.contracts;
DROP POLICY IF EXISTS "Public insert contracts" ON public.contracts;
DROP POLICY IF EXISTS "Public update contracts" ON public.contracts;
DROP POLICY IF EXISTS "Public delete contracts" ON public.contracts;
CREATE POLICY "Public read contracts" ON public.contracts FOR SELECT USING (true);
CREATE POLICY "Public insert contracts" ON public.contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update contracts" ON public.contracts FOR UPDATE USING (true);
CREATE POLICY "Public delete contracts" ON public.contracts FOR DELETE USING (true);

DROP TRIGGER IF EXISTS contracts_updated_at ON public.contracts;
CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Garantir l'unicité external_ref sur clients (upsert sur import)
CREATE UNIQUE INDEX IF NOT EXISTS clients_external_ref_uk ON public.clients(external_ref) WHERE external_ref IS NOT NULL;

-- 4. Bucket pièces jointes tickets (Outlook .msg, ZIP, post-pro, images, PDF)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read ticket-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public upload ticket-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public delete ticket-attachments" ON storage.objects;
CREATE POLICY "Public read ticket-attachments" ON storage.objects FOR SELECT USING (bucket_id = 'ticket-attachments');
CREATE POLICY "Public upload ticket-attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ticket-attachments');
CREATE POLICY "Public delete ticket-attachments" ON storage.objects FOR DELETE USING (bucket_id = 'ticket-attachments');

-- 5. Métadonnées pièces jointes par ticket
CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_attachments_ticket_idx ON public.ticket_attachments(ticket_id);
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read ticket_attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Public insert ticket_attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Public delete ticket_attachments" ON public.ticket_attachments;
CREATE POLICY "Public read ticket_attachments" ON public.ticket_attachments FOR SELECT USING (true);
CREATE POLICY "Public insert ticket_attachments" ON public.ticket_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete ticket_attachments" ON public.ticket_attachments FOR DELETE USING (true);
