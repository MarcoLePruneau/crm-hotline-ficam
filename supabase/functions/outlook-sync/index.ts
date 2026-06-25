// Edge function: synchronisation bidirectionnelle Outlook (hot-line@ficam.com).
//
// Actions :
//   - action="outbound"  -> appelée par l'app après création d'un ticket. Pousse l'événement
//                           vers le webhook OUTLOOK_WEBHOOK_URL (Power Automate / Logic App)
//                           puis stocke l'outlook_event_id retourné.
//   - action="inbound"   -> appelée par Power Automate quand un évènement est créé/mis à jour
//                           dans Outlook. Classe le motif via IA puis insère un ticket.
//
// Sécurité :
//   - outbound : nécessite un JWT utilisateur (vérifié via Supabase Auth).
//   - inbound  : header X-Outlook-Secret == OUTLOOK_INBOUND_SECRET (verify_jwt = false).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-outlook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const OUTLOOK_WEBHOOK_URL = Deno.env.get("OUTLOOK_WEBHOOK_URL") ?? "";
const OUTLOOK_INBOUND_SECRET = Deno.env.get("OUTLOOK_INBOUND_SECRET") ?? "";
const OUTLOOK_MAILBOX = "hot-line@ficam.com";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const MOTIFS: Record<string, string> = {
  aide_prog_fraisage: "Aide programmation fraisage",
  aide_prog_tournage: "Aide programmation tournage",
  aide_prog_millturn: "Aide programmation MillTurn",
  mod_pp_fraisage_3_4: "Modification PP fraisage 3-4 axes",
  mod_pp_fraisage_5: "Modification PP fraisage 5 axes",
  mod_pp_tournage: "Modification PP tournage",
  mod_pp_millturn: "Modification PP MillTurn",
  migration_pp: "Migration PP",
  install_mastercam: "Installation Mastercam",
  mise_a_jour_licence: "Mise à jour de licences",
  cimco: "CIMCO",
  bug_graphique: "Bug graphique / Affichage",
  autre: "Autres",
};

const CLASSIFIER_PROMPT = `Tu es un classifieur de tickets hotline FICAM (Mastercam / CIMCO).
À partir d'un texte libre (sujet + description d'un événement Outlook), tu DOIS retourner UNIQUEMENT un JSON :
{ "motif": "<cle>", "priorite": "<basse|haute|critique>" }

Liste OFFICIELLE des clés de motif autorisées (n'en invente JAMAIS d'autres) :
${Object.entries(MOTIFS).map(([k, v]) => `- ${k} : ${v}`).join("\n")}

RÈGLES STRICTES :

▸ Aide programmation
  - gravure, surfaçage, poche 2D/3D, Dynamic Mill, OptiRough → aide_prog_fraisage
  - chariotage, dressage, gorge, filetage, tour simple → aide_prog_tournage
  - synchronisation broche/tourelle, machine combinée fraisage+tournage → aide_prog_millturn

▸ Modifications de Post-Processeurs (PP)
  - 3 axes ou 4 axes (axe rotatif A/B, table de division) → mod_pp_fraisage_3_4
  - 5 axes continus ou indexés → mod_pp_fraisage_5
  - tour simple (X, Z, éventuellement C) → mod_pp_tournage
  - environnement MillTurn complexe → mod_pp_millturn
  - changement de version globale (ex. passage Mastercam 2026) → migration_pp

▸ Affichage / graphique
  - écran noir, boutons perdus, fenêtres disparues, gestionnaire absent,
    capture qui n'apparaît plus, problème de zoom/vue → bug_graphique

▸ Licences / installation
  - clé HASP, activation, codes, premier déploiement, installation → install_mastercam ou mise_a_jour_licence
    (préfère mise_a_jour_licence si le client parle de renouvellement, de mise à jour annuelle, de SIM)

▸ CIMCO
  - transfert atelier, éditeur G-code, ports COM, DNC, NC-Base → cimco

▸ Fallback (OBLIGATOIRE)
  - Si rien ne matche clairement → motif = "autre"

PRIORITÉ :
- "machine arrêtée", "production bloquée", "urgent" → critique
- Sinon → haute par défaut, basse si purement informatif.`;

async function classifyMotif(subject: string, body: string): Promise<{ motif: string; priorite: string }> {
  const text = `Sujet: ${subject}\n\nDescription:\n${body}`.slice(0, 4000);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: CLASSIFIER_PROMPT },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`AI ${res.status}`);
    const j = await res.json();
    const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
    const motif = MOTIFS[parsed.motif] ? parsed.motif : "autre";
    const priorite = ["basse", "haute", "critique"].includes(parsed.priorite) ? parsed.priorite : "haute";
    return { motif, priorite };
  } catch (e) {
    console.error("classifyMotif failed", e);
    return { motif: "autre", priorite: "haute" };
  }
}

async function findClientByName(name: string): Promise<{ id: string; entreprise: string } | null> {
  if (!name) return null;
  const q = name.trim();
  const { data } = await admin
    .from("clients")
    .select("id, entreprise")
    .ilike("entreprise", `%${q}%`)
    .limit(5);
  if (!data || data.length === 0) return null;
  const exact = data.find((c) => c.entreprise.toLowerCase() === q.toLowerCase());
  return exact ?? data[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = body.action as string;

    // ─────────────────────────────────────────── OUTBOUND : App → Outlook
    if (action === "outbound") {
      if (!OUTLOOK_WEBHOOK_URL) {
        return Response.json(
          { ok: false, error: "OUTLOOK_WEBHOOK_URL not configured" },
          { status: 200, headers: corsHeaders },
        );
      }
      const ticketId = body.ticket_id as string;
      if (!ticketId) {
        return Response.json({ ok: false, error: "ticket_id required" }, { status: 400, headers: corsHeaders });
      }
      const { data: ticket, error } = await admin
        .from("tickets")
        .select("*")
        .eq("id", ticketId)
        .maybeSingle();
      if (error || !ticket) {
        return Response.json({ ok: false, error: "ticket not found" }, { status: 404, headers: corsHeaders });
      }

      if (ticket.outlook_event_id) {
        return Response.json({ ok: true, skipped: "already_synced", outlook_event_id: ticket.outlook_event_id }, { headers: corsHeaders });
      }

      const start = ticket.scheduled_at ?? ticket.heure_debut_effectif ?? new Date().toISOString();
      const end = new Date(new Date(start).getTime() + 30 * 60 * 1000).toISOString();
      const motifLabel = MOTIFS[ticket.motif] ?? ticket.motif;

      const payload = {
        mailbox: OUTLOOK_MAILBOX,
        action: "create",
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        subject: `[Ticket ${ticket.ticket_number ?? ""}] ${ticket.client_nom} — ${motifLabel}`,
        client: ticket.client_nom,
        contact: ticket.contact_client,
        telephone: ticket.telephone_client,
        teamviewer_id: ticket.teamviewer_id,
        technicien: ticket.technicien,
        motif: motifLabel,
        priorite: ticket.priorite,
        description: ticket.description ?? "",
        start, end,
        body_html: `
          <b>Ticket #${ticket.ticket_number ?? ""}</b><br/>
          Client : ${ticket.client_nom}<br/>
          Contact : ${ticket.contact_client ?? ""} — ${ticket.telephone_client ?? ""}<br/>
          TeamViewer : ${ticket.teamviewer_id ?? ""}<br/>
          Technicien : ${ticket.technicien}<br/>
          Motif : ${motifLabel}<br/>
          Priorité : ${ticket.priorite}<br/><br/>
          ${(ticket.description ?? "").replace(/\n/g, "<br/>")}
        `.trim(),
      };

      const r = await fetch(OUTLOOK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let outlookEventId: string | null = null;
      const respText = await r.text();
      try {
        const j = JSON.parse(respText);
        outlookEventId = j.outlook_event_id ?? j.id ?? j.eventId ?? null;
      } catch { /* webhook peut répondre vide */ }

      if (outlookEventId) {
        await admin.from("tickets").update({ outlook_event_id: outlookEventId }).eq("id", ticket.id);
      }

      return Response.json(
        { ok: r.ok, status: r.status, outlook_event_id: outlookEventId, raw: respText.slice(0, 200) },
        { headers: corsHeaders },
      );
    }

    // ─────────────────────────────────────────── INBOUND : Outlook → App
    if (action === "inbound") {
      const provided = req.headers.get("x-outlook-secret") ?? body.secret ?? "";
      if (!OUTLOOK_INBOUND_SECRET || provided !== OUTLOOK_INBOUND_SECRET) {
        return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: corsHeaders });
      }

      const outlookEventId = String(body.outlook_event_id ?? body.event_id ?? "").trim();
      const subject = String(body.subject ?? "");
      const description = String(body.body ?? body.description ?? "");
      const clientNameHint = String(body.client ?? body.organizer ?? "");
      const technicien = String(body.technicien ?? body.organizer ?? "Non assigné");
      const contact = body.contact ?? null;
      const telephone = body.telephone ?? null;
      const scheduledAt = body.start ?? body.scheduled_at ?? null;

      if (!outlookEventId) {
        return Response.json({ ok: false, error: "outlook_event_id required" }, { status: 400, headers: corsHeaders });
      }

      // Déduplication
      const { data: existing } = await admin
        .from("tickets")
        .select("id, ticket_number")
        .eq("outlook_event_id", outlookEventId)
        .maybeSingle();
      if (existing) {
        return Response.json({ ok: true, skipped: "duplicate", ticket_id: existing.id, ticket_number: existing.ticket_number }, { headers: corsHeaders });
      }

      // Classification IA
      const { motif, priorite } = await classifyMotif(subject, description);

      // Recherche client par nom (best-effort)
      const client = await findClientByName(clientNameHint || subject);

      const { data: ticket, error } = await admin
        .from("tickets")
        .insert({
          client_id: client?.id ?? null,
          client_nom: client?.entreprise ?? clientNameHint ?? "Client inconnu",
          technicien,
          contact_client: contact,
          telephone_client: telephone,
          motif,
          priorite,
          statut: "ouvert",
          description: `[Outlook] ${subject}\n\n${description}`.slice(0, 8000),
          scheduled_at: scheduledAt,
          source: "outlook",
          outlook_event_id: outlookEventId,
        })
        .select("id, ticket_number")
        .single();
      if (error) throw error;

      return Response.json({ ok: true, ticket_id: ticket.id, ticket_number: ticket.ticket_number, motif, priorite }, { headers: corsHeaders });
    }

    return Response.json({ error: "unknown_action" }, { status: 400, headers: corsHeaders });
  } catch (e: any) {
    console.error("outlook-sync error", e);
    return Response.json({ error: e.message ?? String(e) }, { status: 500, headers: corsHeaders });
  }
});
