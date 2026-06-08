
CREATE POLICY "chat-files owner can update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'chat-files' AND owner = auth.uid())
WITH CHECK (bucket_id = 'chat-files' AND owner = auth.uid());

CREATE POLICY "ticket-attachments owner can update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ticket-attachments' AND owner = auth.uid())
WITH CHECK (bucket_id = 'ticket-attachments' AND owner = auth.uid());
