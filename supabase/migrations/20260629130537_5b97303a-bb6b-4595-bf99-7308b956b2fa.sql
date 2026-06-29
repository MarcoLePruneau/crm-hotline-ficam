
-- Table de stockage du mot de passe de la boîte hotline (mise à jour via interface admin)
CREATE TABLE IF NOT EXISTS public.hotline_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login text NOT NULL DEFAULT 'hot-line@ficam.com',
  password text NOT NULL,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.hotline_credentials TO service_role;
-- Pas de grants pour anon/authenticated : seuls les edge functions (service_role) y accèdent

ALTER TABLE public.hotline_credentials ENABLE ROW LEVEL SECURITY;

-- Aucune policy pour authenticated/anon : table totalement opaque côté client.
-- L'accès passe exclusivement par les edge functions hotline-credentials et hotline-pop3 (service_role).

-- Trace des emails déjà relevés (déduplication POP3 via Message-ID)
CREATE TABLE IF NOT EXISTS public.hotline_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text UNIQUE NOT NULL,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  subject text,
  from_address text,
  processed_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.hotline_email_log TO service_role;
GRANT SELECT ON public.hotline_email_log TO authenticated;

ALTER TABLE public.hotline_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ficam techs read email log"
  ON public.hotline_email_log
  FOR SELECT
  TO authenticated
  USING (public.is_ficam_tech());
