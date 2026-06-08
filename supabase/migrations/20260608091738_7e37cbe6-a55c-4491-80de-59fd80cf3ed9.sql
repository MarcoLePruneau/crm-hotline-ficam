ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
CREATE INDEX IF NOT EXISTS idx_tickets_source ON public.tickets(source);