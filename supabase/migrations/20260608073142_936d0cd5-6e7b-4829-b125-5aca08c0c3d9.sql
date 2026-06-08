
ALTER FUNCTION public.current_technicien() SECURITY INVOKER;
ALTER FUNCTION public.is_ficam_tech() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.current_technicien() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_ficam_tech() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_technicien() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_ficam_tech() TO authenticated, service_role;
