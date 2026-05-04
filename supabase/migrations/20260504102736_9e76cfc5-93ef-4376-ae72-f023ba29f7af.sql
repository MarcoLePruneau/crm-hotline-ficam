-- Table des messages directs entre techniciens
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  content TEXT,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_dm_pair ON public.direct_messages (sender, recipient, created_at DESC);
CREATE INDEX idx_dm_recipient ON public.direct_messages (recipient, read_at);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read direct_messages" ON public.direct_messages FOR SELECT USING (true);
CREATE POLICY "Public insert direct_messages" ON public.direct_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update direct_messages" ON public.direct_messages FOR UPDATE USING (true);
CREATE POLICY "Public delete direct_messages" ON public.direct_messages FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;

-- Table de présence des techniciens
CREATE TABLE public.technician_presence (
  technicien TEXT NOT NULL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'offline',
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.technician_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read presence" ON public.technician_presence FOR SELECT USING (true);
CREATE POLICY "Public insert presence" ON public.technician_presence FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update presence" ON public.technician_presence FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.technician_presence;
ALTER TABLE public.technician_presence REPLICA IDENTITY FULL;

CREATE TRIGGER update_technician_presence_updated_at
  BEFORE UPDATE ON public.technician_presence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket de stockage pour les fichiers de chat
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read chat-files" ON storage.objects FOR SELECT USING (bucket_id = 'chat-files');
CREATE POLICY "Public upload chat-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-files');
CREATE POLICY "Public delete chat-files" ON storage.objects FOR DELETE USING (bucket_id = 'chat-files');