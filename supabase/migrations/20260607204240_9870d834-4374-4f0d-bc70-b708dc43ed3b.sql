
CREATE TABLE IF NOT EXISTS public.technician_preferences (
  technicien text PRIMARY KEY,
  widgets jsonb NOT NULL DEFAULT '["calendar","tickets","messages","notes","shortcuts","recurrence","contracts"]'::jsonb,
  shortcuts jsonb NOT NULL DEFAULT '[]'::jsonb,
  pense_betes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.technician_preferences TO anon, authenticated;
GRANT ALL ON public.technician_preferences TO service_role;

ALTER TABLE public.technician_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read technician_preferences" ON public.technician_preferences FOR SELECT USING (true);
CREATE POLICY "Public insert technician_preferences" ON public.technician_preferences FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update technician_preferences" ON public.technician_preferences FOR UPDATE USING (true);
CREATE POLICY "Public delete technician_preferences" ON public.technician_preferences FOR DELETE USING (true);

CREATE TRIGGER update_technician_preferences_updated_at
BEFORE UPDATE ON public.technician_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
