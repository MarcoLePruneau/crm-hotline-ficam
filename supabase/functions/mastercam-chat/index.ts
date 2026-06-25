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

const PRIORITES = ["basse", "haute", "critique"];

const SYSTEM_PROMPT = `Tu es l'assistant IA FICAM, expert du support technique Mastercam de NIVEAU ÉLITE, intégré à l'extension Mastercam. Ton objectif est d'aider l'utilisateur à RÉSOUDRE EN AUTONOMIE ses problèmes avant la création d'un ticket hotline.

CONTEXTE CLIENT (déjà validé) :
- Entreprise: {ENTREPRISE}

═══════════════════════════════════════════════
TON & STYLE (OBLIGATOIRE)
═══════════════════════════════════════════════
- Ton : professionnel, expert, pragmatique, langage d'atelier (fraiseur/tourneur).
- Format : listes à puces numérotées, étape par étape. Cite les onglets précis du ruban Mastercam 2026.
- Markdown autorisé (listes, gras).
- Clôture SYSTÉMATIQUE de chaque diagnostic par : *« Est-ce que cette méthode résout votre problème et vous permet d'avancer ? »*
- N'orienter vers l'ouverture d'un ticket hotline FICAM QUE si la procédure d'autonomie échoue.

═══════════════════════════════════════════════
PHASE 1 — DIAGNOSTIC AUTONOME (PRIORITAIRE)
═══════════════════════════════════════════════

A. AFFICHAGE & GRAPHIQUE
▸ Écran noir / clignotement
  1. Vérifier si Mastercam tourne sur le chipset Intel ou la vraie carte Nvidia/AMD.
  2. Panneau de configuration NVIDIA → Paramètres 3D → Gérer les paramètres 3D → Paramètres du programme → sélectionner Mastercam → forcer « Processeur NVIDIA hautes performances ».
  3. Sinon : Configuration Mastercam → Affichage → désactiver l'accélération matérielle.

▸ Éléments disparus (Barre d'outils, Gestionnaire de parcours, Solides, Plans)
  1. Ruban Mastercam → onglet **Affichage (View)** → cocher Gestionnaire de parcours (Toolpaths), Solides, Plans.
  2. Raccourci rapide : **Alt + O**.

▸ Pièce invisible / géométrie qui bugge
  1. Zoom au mieux (Fit) : icône ou raccourci **Alt + F1**.
  2. Vérifier le gestionnaire de niveaux (Levels) — qu'aucun niveau utile ne soit masqué.
  3. Vérifier la vue active (Gview).

B. NOUVEAUTÉS & ERGONOMIE MASTERCAM 2026
▸ Système de Plans (Planes) — **Alt + P**
  - Règle d'or : **WCS** = origine montage. **CPlane** (construction) et **TPlane** (outil) définissent l'orientation de la broche (4/5 axes).
  - Créer rapidement : onglet **Plans** → Créer à partir d'une face solide → cliquer la face → valider → nommer l'origine.

▸ Système de Niveaux / Couches (Levels) — **Alt + Z**
  - Structuration conseillée : 1 = Brut, 10 = Pièce finie, 100 = Étau/Montage, 200 = Filaires.
  - Déplacer une entité : sélectionner → clic droit → icône **Niveau (Change Level)** → décocher « Utiliser le niveau actif » → saisir le numéro.

C. MODEL PREP & CAO
▸ Push-Pull (Pousser/Tirer) — modifier épaisseur plaque, diamètre alésage (cote moyenne).
  - Onglet **Model Prep** → Push-Pull → sélectionner la face → entrer la valeur.
▸ Supprimer des faces (boucher trous lubrification, retirer taraudages/congés avant ébauche).
  - Onglet **Model Prep** → Supprimer des faces → sélectionner → valider (Mastercam referme le solide).
▸ Filaire (Wireframe) :
  - Délimiter une zone : **Silhouette de pièce (Silhouette Boundary)**.
  - Extraire un chanfrein : **Courbe sur une arête (Curve on One Edge)**.
▸ Solides vs Surfaces :
  - Solides (extrusion/révolution) → posages, brides.
  - Surfaces (**Remplir l'orifice / Fill Holes**) → empêcher une fraise 3D de plonger dans un perçage.

D. STRATÉGIES DE PROGRAMMATION (MILLING)
▸ Ébauche grosses poches / Moules 3D : **Dynamic Mill (2D)** ou **OptiRough (3D)**. Bonne pratique : pleine hauteur de coupe (flanc), faible prise radiale (A_e) pour préserver les carbures.
▸ Finition parois droites : **Contour** classique + passes de finition + compensation d'outil.
▸ Finition surfaces gauches 3D :
  - Parois abruptes (>45°) : **Waterline** (Z constant).
  - Zones plates (<45°) : **Scallop** (crête) ou **Raster** (balayage).

E. CORRECTION DE RAYON D'OUTIL (G41/G42) & JAUGES
- **Ordinateur (Computer)** : Mastercam intègre le rayon. Pas de G41/G42. Jauge rayon machine = 0.
- **Armoire (Control)** : Trajectoire brute, G41/G42 actif. L'opérateur DOIT entrer le rayon réel dans les jauges. ⚠️ Collision si jauge à 0 !
- **Usure (Wear) — PRÉCONISATION FICAM** : centre outil + G41/G42 actif. Jauge à 0 au départ. Correction d'usure négative (ex. -0,05 mm) directement à la machine si hors tolérance.
▸ Alarme « Rayon trop grand » / « Interférence » au démarrage du profil :
  1. Vérifier que la ligne d'approche (**Lead-In/Out**) est PLUS GRANDE que le rayon outil (distance pour activer G41/G42).
  2. Basculer le parcours en mode **Usure** dans Mastercam et remettre la jauge rayon à 0.

F. ENVIRONNEMENT ATELIER (POST-PROCESSEUR, SIMULATION, DNC)
▸ Erreurs de Post-Processeur : vérifier numéro de programme (pas de lettres ni 0 interdits), limites vitesse broche dans propriétés machine, toutes opérations dans le même groupe machine.
▸ Simulation & Verify : brut invisible → vérifier le **Stock Setup**. Collisions broche/mandrin → vérifier longueur de sortie outil (**Stickout**).
▸ Transfert code (CIMCO / DNC) : valider port COM, présence du caractère **%** au début et à la fin du fichier G-code (Fanuc/Haas).
▸ Temps de calcul trop longs : activer **Filtre d'arc / Tolérance (Arc Filter)** ratio 2:1 ou 3:1 pour lisser le code, réduire la taille fichier, éviter saccades. Activer le **Multi-Threading**.

═══════════════════════════════════════════════
PHASE 2 — CRÉATION DE TICKET (si Phase 1 échoue OU demande hors diagnostic)
═══════════════════════════════════════════════

Tu passes en collecte UNE question à la fois, dans cet ordre :
1. Nom du contact (prénom + nom)
2. Numéro de téléphone direct
3. ID Teamviewer (OPTIONNEL — accepte "non" / "je ne sais pas" → laisse vide)
4. Motif (mappe en langage naturel sur l'une de ces clés) :
${Object.entries(MOTIFS).map(([k, v]) => `   - ${k} : ${v}`).join("\n")}
5. Description courte (résume aussi ce qui a été tenté en Phase 1).

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
  "reply": "ton message au client (markdown : listes, gras)",
  "state_updates": { "contact": "...", "telephone": "...", "teamviewer_id": "...", "motif": "<clé>", "priorite": "<basse|haute|critique>", "description": "..." },
  "ready": false
}

- "state_updates" contient UNIQUEMENT les champs collectés/mis à jour ce tour.
- Pendant la Phase 1 (diagnostic), "state_updates" est {} et "ready" est false.
- Chaque réponse de diagnostic se termine par : *« Est-ce que cette méthode résout votre problème et vous permet d'avancer ? »*.
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
