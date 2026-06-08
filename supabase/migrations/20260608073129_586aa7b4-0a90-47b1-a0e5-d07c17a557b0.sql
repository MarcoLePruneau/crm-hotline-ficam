
-- Helper: map authenticated user's email -> technicien name
CREATE OR REPLACE FUNCTION public.current_technicien()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE lower(coalesce((auth.jwt() ->> 'email'), ''))
    WHEN 'ma.henry@ficam.com'     THEN 'Marc-Antoine HENRY'
    WHEN 'j.valiere@ficam.com'    THEN 'Jocelyn VALIERE'
    WHEN 'c.provendier@ficam.com' THEN 'Cédric PROVENDIER'
    WHEN 'n.mercier@ficam.com'    THEN 'Nicolas MERCIER'
    WHEN 'e.dauvilliers@ficam.com'THEN 'Eric DAUVILLIERS'
    WHEN 'c.ferreira@ficam.com'   THEN 'Christophe FERREIRA'
    WHEN 'v.folliot@ficam.com'    THEN 'Valentin FOLLIOT'
    WHEN 's.ferreira@ficam.com'   THEN 'Sergio FERREIRA'
    WHEN 'd.montoya@ficam.com'    THEN 'David MONTOYA'
    WHEN 'b.bouquin@ficam.com'    THEN 'Benoit BOUQUIN'
    WHEN 'v.beuzelin@ficam.com'   THEN 'Valentin BEUZELIN'
    WHEN 'm.derlon@ficam.com'     THEN 'Michael DERLON'
    WHEN 'n.bengrid@ficam.com'    THEN 'NADIA BENGRID'
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.is_ficam_tech()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_technicien() IS NOT NULL
$$;

-- Drop all old permissive public policies
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('clients','client_contacts','contracts','tickets','ticket_attachments','ticket_time_logs','direct_messages','technician_preferences','technician_presence','outlook_sync_state','calendar_events_simulated')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- Revoke anon, grant authenticated/service_role
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients','client_contacts','contracts','tickets','ticket_attachments','ticket_time_logs','direct_messages','technician_preferences','technician_presence','outlook_sync_state','calendar_events_simulated']
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- Shared-data tables: any authenticated FICAM tech
CREATE POLICY "tech read clients" ON public.clients FOR SELECT TO authenticated USING (public.is_ficam_tech());
CREATE POLICY "tech write clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech update clients" ON public.clients FOR UPDATE TO authenticated USING (public.is_ficam_tech()) WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech delete clients" ON public.clients FOR DELETE TO authenticated USING (public.is_ficam_tech());

CREATE POLICY "tech read contacts" ON public.client_contacts FOR SELECT TO authenticated USING (public.is_ficam_tech());
CREATE POLICY "tech write contacts" ON public.client_contacts FOR INSERT TO authenticated WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech update contacts" ON public.client_contacts FOR UPDATE TO authenticated USING (public.is_ficam_tech()) WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech delete contacts" ON public.client_contacts FOR DELETE TO authenticated USING (public.is_ficam_tech());

CREATE POLICY "tech read contracts" ON public.contracts FOR SELECT TO authenticated USING (public.is_ficam_tech());
CREATE POLICY "tech write contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech update contracts" ON public.contracts FOR UPDATE TO authenticated USING (public.is_ficam_tech()) WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech delete contracts" ON public.contracts FOR DELETE TO authenticated USING (public.is_ficam_tech());

CREATE POLICY "tech read tickets" ON public.tickets FOR SELECT TO authenticated USING (public.is_ficam_tech());
CREATE POLICY "tech write tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech update tickets" ON public.tickets FOR UPDATE TO authenticated USING (public.is_ficam_tech()) WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech delete tickets" ON public.tickets FOR DELETE TO authenticated USING (public.is_ficam_tech());

CREATE POLICY "tech read ta" ON public.ticket_attachments FOR SELECT TO authenticated USING (public.is_ficam_tech());
CREATE POLICY "tech write ta" ON public.ticket_attachments FOR INSERT TO authenticated WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech update ta" ON public.ticket_attachments FOR UPDATE TO authenticated USING (public.is_ficam_tech()) WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech delete ta" ON public.ticket_attachments FOR DELETE TO authenticated USING (public.is_ficam_tech());

CREATE POLICY "tech read time" ON public.ticket_time_logs FOR SELECT TO authenticated USING (public.is_ficam_tech());
CREATE POLICY "tech write time" ON public.ticket_time_logs FOR INSERT TO authenticated WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech update time" ON public.ticket_time_logs FOR UPDATE TO authenticated USING (public.is_ficam_tech()) WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech delete time" ON public.ticket_time_logs FOR DELETE TO authenticated USING (public.is_ficam_tech());

CREATE POLICY "tech read cal" ON public.calendar_events_simulated FOR SELECT TO authenticated USING (public.is_ficam_tech());
CREATE POLICY "tech write cal" ON public.calendar_events_simulated FOR INSERT TO authenticated WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech update cal" ON public.calendar_events_simulated FOR UPDATE TO authenticated USING (public.is_ficam_tech()) WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech delete cal" ON public.calendar_events_simulated FOR DELETE TO authenticated USING (public.is_ficam_tech());

-- Outlook sync: only the owning technicien
CREATE POLICY "tech read sync" ON public.outlook_sync_state FOR SELECT TO authenticated USING (public.is_ficam_tech());
CREATE POLICY "tech upsert sync" ON public.outlook_sync_state FOR INSERT TO authenticated WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech update sync" ON public.outlook_sync_state FOR UPDATE TO authenticated USING (public.is_ficam_tech()) WITH CHECK (public.is_ficam_tech());
CREATE POLICY "tech delete sync" ON public.outlook_sync_state FOR DELETE TO authenticated USING (public.is_ficam_tech());

-- Direct messages: only sender/recipient
CREATE POLICY "dm read mine" ON public.direct_messages FOR SELECT TO authenticated
  USING (sender = public.current_technicien() OR recipient = public.current_technicien());
CREATE POLICY "dm send mine" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender = public.current_technicien());
CREATE POLICY "dm update mine" ON public.direct_messages FOR UPDATE TO authenticated
  USING (sender = public.current_technicien() OR recipient = public.current_technicien())
  WITH CHECK (sender = public.current_technicien() OR recipient = public.current_technicien());
CREATE POLICY "dm delete mine" ON public.direct_messages FOR DELETE TO authenticated
  USING (sender = public.current_technicien());

-- Technician preferences: only own row
CREATE POLICY "prefs read mine" ON public.technician_preferences FOR SELECT TO authenticated
  USING (technicien = public.current_technicien());
CREATE POLICY "prefs insert mine" ON public.technician_preferences FOR INSERT TO authenticated
  WITH CHECK (technicien = public.current_technicien());
CREATE POLICY "prefs update mine" ON public.technician_preferences FOR UPDATE TO authenticated
  USING (technicien = public.current_technicien())
  WITH CHECK (technicien = public.current_technicien());
CREATE POLICY "prefs delete mine" ON public.technician_preferences FOR DELETE TO authenticated
  USING (technicien = public.current_technicien());

-- Technician presence: read all, write own
CREATE POLICY "presence read all" ON public.technician_presence FOR SELECT TO authenticated USING (public.is_ficam_tech());
CREATE POLICY "presence insert mine" ON public.technician_presence FOR INSERT TO authenticated
  WITH CHECK (technicien = public.current_technicien());
CREATE POLICY "presence update mine" ON public.technician_presence FOR UPDATE TO authenticated
  USING (technicien = public.current_technicien())
  WITH CHECK (technicien = public.current_technicien());

-- Storage: drop old public bucket policies, restrict to authenticated FICAM techs
DROP POLICY IF EXISTS "Public read chat-files" ON storage.objects;
DROP POLICY IF EXISTS "Public upload chat-files" ON storage.objects;
DROP POLICY IF EXISTS "Public delete chat-files" ON storage.objects;
DROP POLICY IF EXISTS "Public read ticket-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public upload ticket-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public delete ticket-attachments" ON storage.objects;

CREATE POLICY "tech read chat-files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-files' AND public.is_ficam_tech());
CREATE POLICY "tech upload chat-files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-files' AND public.is_ficam_tech());
CREATE POLICY "tech delete chat-files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-files' AND public.is_ficam_tech());

CREATE POLICY "tech read ticket-attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments' AND public.is_ficam_tech());
CREATE POLICY "tech upload ticket-attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments' AND public.is_ficam_tech());
CREATE POLICY "tech delete ticket-attachments" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ticket-attachments' AND public.is_ficam_tech());
