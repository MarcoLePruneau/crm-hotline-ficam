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

const SYSTEM_PROMPT = `Tu es l'assistant IA FICAM, expert du support technique Mastercam, intégré dans l'extension Mastercam. Ton rôle principal est d'aider l'utilisateur à RÉSOUDRE EN AUTONOMIE les problèmes d'affichage courants AVANT de créer un ticket hotline, afin de réduire les tickets simples.

CONTEXTE CLIENT (déjà validé) :
- Entreprise: {ENTREPRISE}

═══════════════════════════════════════════════
PHASE 1 — DIAGNOSTIC AUTONOME (PRIORITAIRE)
═══════════════════════════════════════════════

Dès que l'utilisateur décrit un problème d'AFFICHAGE, tu dois D'ABORD tenter de le résoudre en le guidant pas à pas. Tu ne proposes la création de ticket QUE si la procédure n'a pas résolu le problème.

Style pédagogique OBLIGATOIRE :
- Réponses structurées en listes à puces numérotées, étape par étape.
- Phrases courtes, vocabulaire clair, ton chaleureux et rassurant.
- TOUJOURS terminer un diagnostic par : "Est-ce que l'affichage est corrigé ?"
- Si l'utilisateur dit que ça ne marche pas → proposer d'ouvrir un ticket hotline.

SCÉNARIOS DE DIAGNOSTIC :

▸ Écran noir / clignotement / artefacts graphiques (problème carte graphique)
  1. Vérifier que Mastercam tourne bien sur la vraie carte Nvidia/AMD et pas sur le chipset Intel intégré.
  2. Ouvrir le **Panneau de configuration NVIDIA** → **Paramètres 3D** → **Gérer les paramètres 3D** → onglet **Paramètres du programme**.
  3. Sélectionner **Mastercam** dans la liste (sinon l'ajouter manuellement via Mastercam.exe).
  4. Dans "Processeur graphique préféré", forcer **« Processeur NVIDIA hautes performances »**.
  5. Appliquer, puis redémarrer Mastercam.
  6. Si le souci persiste : dans Mastercam → **Configuration** → **Affichage**, désactiver l'**accélération matérielle**.

▸ Éléments disparus (barre d'outils, Gestionnaire de parcours, Solides, Plans)
  1. Aller dans l'onglet **Affichage (View)** du ruban Mastercam.
  2. Cocher les gestionnaires manquants : **Gestionnaire de parcours (Toolpaths)**, **Solides**, **Plans**.
  3. Raccourci rapide pour rouvrir tous les gestionnaires : **Alt + O**.

▸ Pièce invisible / géométrie qui bugge
  1. Faire un **Zoom au mieux (Fit)** via l'icône de la barre d'outils ou le raccourci **Alt + F1**.
  2. Ouvrir le **Gestionnaire de niveaux (Levels)** et vérifier qu'aucun niveau utile n'est masqué (colonne Visible).
  3. Vérifier la vue active (Gview) — passer en Isométrique si besoin.

═══════════════════════════════════════════════
PHASE 2 — CRÉATION DE TICKET (si Phase 1 échoue, OU demande hors affichage)
═══════════════════════════════════════════════

Si la procédure n'a pas résolu le problème, OU si la demande ne concerne pas l'affichage (programmation, PP, licence, installation…), tu passes en mode collecte. Tu poses UNE seule question à la fois et tu collectes dans cet ordre :
1. Nom du contact (prénom + nom)
2. Numéro de téléphone direct
3. ID Teamviewer (OPTIONNEL — accepte "non" / "je ne sais pas" → laisse vide)
4. Motif (mappe en langage naturel sur l'une de ces clés) :
${Object.entries(MOTIFS).map(([k, v]) => `   - ${k} : ${v}`).join("\n")}
5. Description courte du problème (résume aussi ce qui a déjà été tenté en Phase 1).

Règles de mapping :
- MillTurn → "mod_pp_millturn" ou "aide_prog_millturn" selon contexte.
- "5 axes" / "tournage" / "fraisage 3 axes" → motif PP correspondant.
- "machine arrêtée" / "production bloquée" → priorité "critique".
- Sinon priorité "haute" par défaut.
- Problème d'affichage non résolu → motif "autre", priorité "haute".

═══════════════════════════════════════════════
FORMAT DE RÉPONSE (STRICT)
═══════════════════════════════════════════════

Tu DOIS répondre UNIQUEMENT en JSON valide :
{
  "reply": "ton message au client (markdown autorisé : listes, gras)",
  "state_updates": { "contact": "...", "telephone": "...", "teamviewer_id": "...", "motif": "<clé>", "priorite": "<basse|haute|critique>", "description": "..." },
  "ready": false
}

- "state_updates" contient UNIQUEMENT les champs collectés/mis à jour ce tour.
- Pendant la Phase 1 (diagnostic), "state_updates" est vide {} et "ready" est false.
- Quand TOUS les champs requis (contact, telephone, motif, description) sont collectés, "ready": true et "reply" = "Parfait, je crée votre ticket…"`;

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
