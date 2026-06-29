// Gestion sécurisée du mot de passe POP3 de hot-line@ficam.com.
// - GET  : indique si un mot de passe est configuré (jamais la valeur).
// - POST : met à jour le mot de passe (réservé aux techniciens @ficam.com).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

async function requireFicamTech(req: Request): Promise<{ ok: true; email: string } | { ok: false; res: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, res: Response.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders }) };
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await userClient.auth.getClaims(token);
  const email = String(data?.claims?.email ?? "").toLowerCase();
  if (error || !email.endsWith("@ficam.com")) {
    return { ok: false, res: Response.json({ error: "forbidden" }, { status: 403, headers: corsHeaders }) };
  }
  return { ok: true, email };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireFicamTech(req);
  if (!auth.ok) return auth.res;

  try {
    if (req.method === "GET") {
      const { data } = await admin
        .from("hotline_credentials")
        .select("login, updated_by, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return Response.json(
        { ok: true, configured: !!data, login: data?.login ?? "hot-line@ficam.com", updated_by: data?.updated_by ?? null, updated_at: data?.updated_at ?? null },
        { headers: corsHeaders },
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      const password = String(body.password ?? "");
      if (password.length < 4) {
        return Response.json({ ok: false, error: "password_too_short" }, { status: 400, headers: corsHeaders });
      }
      // On garde une seule ligne active : suppression puis insert
      await admin.from("hotline_credentials").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await admin.from("hotline_credentials").insert({
        login: "hot-line@ficam.com",
        password,
        updated_by: auth.email,
      });
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    return Response.json({ error: "method_not_allowed" }, { status: 405, headers: corsHeaders });
  } catch (e: any) {
    console.error("hotline-credentials error", e);
    return Response.json({ error: e.message ?? String(e) }, { status: 500, headers: corsHeaders });
  }
});
