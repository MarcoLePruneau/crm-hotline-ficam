
-- 1. Table client_contacts (multi-contacts par client avec TeamViewer ID)
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  fonction TEXT,
  telephone TEXT,
  email TEXT,
  teamviewer_id TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON public.client_contacts(client_id);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read client_contacts" ON public.client_contacts FOR SELECT USING (true);
CREATE POLICY "Public insert client_contacts" ON public.client_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update client_contacts" ON public.client_contacts FOR UPDATE USING (true);
CREATE POLICY "Public delete client_contacts" ON public.client_contacts FOR DELETE USING (true);

CREATE TRIGGER update_client_contacts_updated_at
BEFORE UPDATE ON public.client_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Ajouter contact_id sur tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.client_contacts(id) ON DELETE SET NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- 3. Nouveaux statuts pour le calendrier (à rappeler / à appeler / traité)
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'a_rappeler';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'a_appeler';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'traite';

-- 4. Migrer les contacts existants (extra_contacts JSON + contact_nom principal) vers client_contacts
INSERT INTO public.client_contacts (client_id, nom, fonction, telephone, email, teamviewer_id, is_primary)
SELECT c.id, c.contact_nom, c.contact_fonction, c.telephone, c.email, c.teamviewer_id, true
FROM public.clients c
WHERE c.contact_nom IS NOT NULL AND c.contact_nom <> ''
  AND NOT EXISTS (SELECT 1 FROM public.client_contacts cc WHERE cc.client_id = c.id);

-- Migrer extra_contacts (jsonb array) en contacts secondaires
INSERT INTO public.client_contacts (client_id, nom, telephone, is_primary)
SELECT c.id,
       COALESCE(NULLIF(TRIM(elem->>'nom'), ''), 'Contact'),
       NULLIF(TRIM(elem->>'telephone'), ''),
       false
FROM public.clients c, jsonb_array_elements(c.extra_contacts) AS elem
WHERE jsonb_typeof(c.extra_contacts) = 'array'
  AND COALESCE(NULLIF(TRIM(elem->>'nom'), ''), '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.client_contacts cc
    WHERE cc.client_id = c.id AND cc.nom = COALESCE(NULLIF(TRIM(elem->>'nom'), ''), 'Contact')
  );
