// Edge function: upload d'un fichier client vers le bucket privé `mastercam-uploads`.
// Public (verify_jwt = false). Limite à 25 Mo.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const MAX_BYTES = 25 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const clientId = String(form.get("client_id") ?? "anon");
    if (!file) return Response.json({ error: "no_file" }, { status: 400, headers: corsHeaders });
    if (file.size > MAX_BYTES) return Response.json({ error: "file_too_large" }, { status: 400, headers: corsHeaders });

    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
    const path = `mastercam/${clientId}/${crypto.randomUUID()}_${safe}`;

    const buf = new Uint8Array(await file.arrayBuffer());
    const { error } = await admin.storage.from("ticket-attachments").upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw error;

    return Response.json({ ok: true, path, name: file.name, size: file.size }, { headers: corsHeaders });
  } catch (e: any) {
    console.error("mastercam-upload", e);
    return Response.json({ error: e.message ?? String(e) }, { status: 500, headers: corsHeaders });
  }
});
