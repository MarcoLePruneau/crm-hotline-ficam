// Edge function: agent IA conversationnel pour la création de tickets via l'extension Mastercam.
// Public (verify_jwt = false). Utilise le rôle service pour écrire dans Supabase, bypass RLS.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const MOTIFS: Record<string, string> = {
  aide_prog_tournage: "Aide programmation tournage",
  aide_prog_fraisage: "Aide programmation fraisage",
  aide_prog_millturn: "Aide programmation MillTurn",
  mod_pp_tournage: "Modification PP tournage",
  mod_pp_fraisage_3_4: "Modification PP fraisage 3-4 axes",
  mod_pp_fraisage_5: "Modification PP fraisage 5 axes",
  mod_pp_millturn: "Modification PP MillTurn",
  install_mastercam: "Installation Mastercam",
  mise_a_jour_licence: "Mise à jour de licence",
  migration_pp: "Migration PP",
  cimco: "CIMCO",
  autre: "Autre",
};

const PRIORITES = ["basse", "haute", "critique"];

const SYSTEM_PROMPT = `Tu es l'assistant IA FICAM, intégré dans l'extension Mastercam. Tu aides les clients à créer un ticket de hotline.

CONTEXTE CLIENT (déjà validé) :
- Entreprise: {ENTREPRISE}

TON OBJECTIF : collecter dans l'ordre, une question à la fois, les informations suivantes :
1. Nom du contact (prénom + nom)
2. Numéro de téléphone direct
3. ID Teamviewer (OPTIONNEL — accepte "non" / "je ne sais pas" → laisse vide)
4. Motif de la demande (en langage naturel, tu dois mapper sur l'une de ces clés) :
${Object.entries(MOTIFS).map(([k, v]) => `   - ${k} : ${v}`).join("\n")}
5. Description courte du problème.

RÈGLES :
- Sois bref, chaleureux, professionnel, en français.
- UNE seule question par message.
- Quand le client mentionne MillTurn → motif "mod_pp_millturn" ou "aide_prog_millturn" selon le contexte.
- Quand le client mentionne "5 axes", "tournage", "fraisage 3 axes" → mappe sur le motif PP correspondant.
- Quand le client mentionne "machine arrêtée" / "production bloquée" → priorité "critique".
- Sinon priorité "haute" par défaut (hotline).
- Si un fichier a été déposé, tu le mentionnes simplement (ne pose pas de question dessus).

FORMAT DE RÉPONSE : tu DOIS répondre UNIQUEMENT en JSON valide avec cette structure :
{
  "reply": "ton message au client",
  "state_updates": { "contact": "...", "telephone": "...", "teamviewer_id": "...", "motif": "<clé>", "priorite": "<basse|haute|critique>", "description": "..." },
  "ready": false
}

Mets dans "state_updates" UNIQUEMENT les champs que tu viens de recueillir/mettre à jour dans ce tour.
Quand TOUS les champs requis (contact, telephone, motif, description) sont collectés, mets "ready": true et dans "reply" écris exactement :
"Parfait, je crée votre ticket…"`;

async function callAI(messages: any[], entreprise: string): Promise<any> {
  const sys = SYSTEM_PROMPT.replace("{ENTREPRISE}", entreprise);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: sys }, ...messages],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI ${res.status}: ${t}`);
  }
  const j = await res.json();
  const content = j.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(content); } catch { return { reply: content, state_updates: {}, ready: false }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = body.action as string;

    if (action === "validate_company") {
      const q = String(body.entreprise ?? "").trim();
      if (!q) return Response.json({ ok: false, error: "Nom d'entreprise requis" }, { headers: corsHeaders });
      const { data, error } = await admin
        .from("clients")
        .select("id, entreprise, contract_type")
        .ilike("entreprise", `%${q}%`)
        .limit(5);
      if (error) throw error;
      if (!data || data.length === 0) {
        return Response.json({ ok: false, error: "not_found" }, { headers: corsHeaders });
      }
      // exact match priority
      const exact = data.find((c) => c.entreprise.toLowerCase() === q.toLowerCase());
      const client = exact ?? data[0];
      return Response.json({ ok: true, client_id: client.id, entreprise: client.entreprise }, { headers: corsHeaders });
    }

    if (action === "chat") {
      const messages = (body.messages ?? []) as any[];
      const entreprise = String(body.entreprise ?? "");
      const ai = await callAI(messages, entreprise);
      return Response.json(ai, { headers: corsHeaders });
    }

    if (action === "finalize") {
      const { client_id, entreprise, state, file_path, file_name } = body;
      if (!client_id || !entreprise || !state?.contact || !state?.telephone || !state?.motif) {
        return Response.json({ ok: false, error: "missing_fields" }, { status: 400, headers: corsHeaders });
      }
      const motif = MOTIFS[state.motif] ? state.motif : "autre";
      const priorite = PRIORITES.includes(state.priorite) ? state.priorite : "haute";

      const insertPayload: any = {
        client_id,
        client_nom: entreprise,
        technicien: "Non assigné",
        contact_client: state.contact,
        telephone_client: state.telephone,
        teamviewer_id: state.teamviewer_id || null,
        motif,
        priorite,
        statut: "attente_client",
        description: state.description || "(via Agent IA Mastercam)",
        source: "ia_mastercam",
      };

      const { data: ticket, error: tErr } = await admin
        .from("tickets")
        .insert(insertPayload)
        .select("id, ticket_number")
        .single();
      if (tErr) throw tErr;

      if (file_path) {
        await admin.from("ticket_attachments").insert({
          ticket_id: ticket.id,
          file_path,
          file_name: file_name ?? file_path.split("/").pop(),
          uploaded_by: "Agent IA Mastercam",
        });
      }

      return Response.json({ ok: true, ticket_number: ticket.ticket_number }, { headers: corsHeaders });
    }

    return Response.json({ error: "unknown_action" }, { status: 400, headers: corsHeaders });
  } catch (e: any) {
    console.error("mastercam-chat error", e);
    return Response.json({ error: e.message ?? String(e) }, { status: 500, headers: corsHeaders });
  }
});
