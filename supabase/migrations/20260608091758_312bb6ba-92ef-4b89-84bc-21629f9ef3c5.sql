CREATE POLICY "tech read mastercam-uploads" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'mastercam-uploads' AND public.is_ficam_tech());

CREATE POLICY "tech delete mastercam-uploads" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'mastercam-uploads' AND public.is_ficam_tech());