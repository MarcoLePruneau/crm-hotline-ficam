DROP POLICY IF EXISTS "dm read mine" ON public.direct_messages;
DROP POLICY IF EXISTS "dm send mine" ON public.direct_messages;
DROP POLICY IF EXISTS "dm update mine" ON public.direct_messages;
DROP POLICY IF EXISTS "dm delete mine" ON public.direct_messages;

CREATE POLICY "dm read mine" ON public.direct_messages
FOR SELECT TO authenticated
USING (public.is_ficam_tech() AND (sender = public.current_technicien() OR recipient = public.current_technicien()));

CREATE POLICY "dm send mine" ON public.direct_messages
FOR INSERT TO authenticated
WITH CHECK (public.is_ficam_tech() AND sender = public.current_technicien());

CREATE POLICY "dm update mine" ON public.direct_messages
FOR UPDATE TO authenticated
USING (public.is_ficam_tech() AND (sender = public.current_technicien() OR recipient = public.current_technicien()))
WITH CHECK (public.is_ficam_tech() AND (sender = public.current_technicien() OR recipient = public.current_technicien()));

CREATE POLICY "dm delete mine" ON public.direct_messages
FOR DELETE TO authenticated
USING (public.is_ficam_tech() AND sender = public.current_technicien());