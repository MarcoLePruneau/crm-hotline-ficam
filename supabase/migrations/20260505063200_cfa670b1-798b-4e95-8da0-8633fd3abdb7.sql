-- Override manuel du droit hotline sur le ticket (NULL = auto)
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS hotline_override text CHECK (hotline_override IN ('OUI','NON','HORS CONTRAT'));