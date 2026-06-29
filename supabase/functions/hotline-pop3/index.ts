// Relève POP3 directe de hot-line@ficam.com (Hosteam : webmail19.hosteam.fr:995 SSL).
// - Connexion TLS native Deno (pas de dépendance POP3 externe).
// - Parsing MIME via npm:mailparser.
// - Classification IA du motif (Lovable AI Gateway).
// - Création d'un ticket par mail, déduplication via Message-ID.
// - Mot de passe : table hotline_credentials > fallback env HOTLINE_EMAIL_PASSWORD.
//
// Déclenchement :
//   - Manuel (UI admin) ou cron pg_cron toutes les N minutes.

import { createClient } from "npm:@supabase/supabase-js@2";
import { simpleParser } from "npm:mailparser@3.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const POP3_HOST = "webmail19.hosteam.fr";
const POP3_PORT = 995;
const POP3_USER = "hot-line@ficam.com";

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

// ─────────────────────────────────────────── POP3 client minimal (USER/PASS/STAT/LIST/RETR/DELE/QUIT)

class Pop3Client {
  private conn!: Deno.TlsConn;
  private buf = "";
  private decoder = new TextDecoder("latin1");
  private encoder = new TextEncoder();

  async connect(host: string, port: number) {
    this.conn = await Deno.connectTls({ hostname: host, port });
    await this.readLine(); // greeting +OK
  }

  private async readLine(): Promise<string> {
    while (!this.buf.includes("\r\n")) {
      const chunk = new Uint8Array(8192);
      const n = await this.conn.read(chunk);
      if (n === null) throw new Error("POP3 connection closed");
      this.buf += this.decoder.decode(chunk.subarray(0, n));
    }
    const idx = this.buf.indexOf("\r\n");
    const line = this.buf.slice(0, idx);
    this.buf = this.buf.slice(idx + 2);
    return line;
  }

  private async readMultiline(): Promise<string> {
    const first = await this.readLine();
    if (!first.startsWith("+OK")) throw new Error("POP3: " + first);
    const lines: string[] = [];
    while (true) {
      const l = await this.readLine();
      if (l === ".") break;
      lines.push(l.startsWith("..") ? l.slice(1) : l);
    }
    return lines.join("\r\n");
  }

  private async cmd(line: string): Promise<string> {
    await this.conn.write(this.encoder.encode(line + "\r\n"));
    const resp = await this.readLine();
    if (!resp.startsWith("+OK")) throw new Error("POP3 cmd failed: " + resp);
    return resp;
  }

  async login(user: string, pass: string) {
    await this.cmd("USER " + user);
    await this.cmd("PASS " + pass);
  }

  async stat(): Promise<{ count: number; size: number }> {
    const r = await this.cmd("STAT");
    const [, count, size] = r.split(" ");
    return { count: parseInt(count, 10), size: parseInt(size, 10) };
  }

  async retr(n: number): Promise<string> {
    await this.conn.write(this.encoder.encode(`RETR ${n}\r\n`));
    return await this.readMultiline();
  }

  async dele(n: number) {
    await this.cmd("DELE " + n);
  }

  async quit() {
    try { await this.cmd("QUIT"); } catch { /* ignore */ }
    try { this.conn.close(); } catch { /* ignore */ }
  }
}

// ─────────────────────────────────────────── Récupération du mot de passe (DB > env)

async function getPassword(): Promise<string | null> {
  const { data } = await admin
    .from("hotline_credentials")
    .select("password")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.password) return data.password as string;
  return Deno.env.get("HOTLINE_EMAIL_PASSWORD") ?? null;
}

// ─────────────────────────────────────────── Classification IA

const CLASSIFIER_PROMPT = `Tu es un classifieur de tickets hotline FICAM (Mastercam / CIMCO).
Retourne UNIQUEMENT : { "motif": "<cle>", "priorite": "<basse|haute|critique>", "client_hint": "<nom>", "contact_hint": "<nom>", "telephone_hint": "<num>" }

Clés autorisées :
${Object.entries(MOTIFS).map(([k, v]) => `- ${k} : ${v}`).join("\n")}

Règles motif :
- fraisage/poche/dynamic mill/optirough → aide_prog_fraisage
- tournage/chariotage/gorge → aide_prog_tournage
- millturn → aide_prog_millturn ou mod_pp_millturn
- PP 3-4 axes → mod_pp_fraisage_3_4 ; 5 axes → mod_pp_fraisage_5 ; tour → mod_pp_tournage
- migration version → migration_pp
- affichage/écran noir/boutons disparus → bug_graphique
- HASP/licence/activation → install_mastercam ou mise_a_jour_licence
- DNC/NC-Base/éditeur G-code → cimco
- sinon → autre

Priorité :
- "machine arrêtée"/"urgent"/"production bloquée" → critique
- info simple → basse
- défaut → haute`;

async function classify(subject: string, body: string, from: string) {
  const text = `De: ${from}\nSujet: ${subject}\n\n${body}`.slice(0, 4000);
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
    if (!r.ok) throw new Error("AI " + r.status);
    const j = await r.json();
    const p = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
    return {
      motif: MOTIFS[p.motif] ? p.motif : "autre",
      priorite: ["basse", "haute", "critique"].includes(p.priorite) ? p.priorite : "haute",
      client_hint: String(p.client_hint ?? "").trim(),
      contact_hint: String(p.contact_hint ?? "").trim(),
      telephone_hint: String(p.telephone_hint ?? "").trim(),
    };
  } catch (e) {
    console.error("classify failed", e);
    return { motif: "autre", priorite: "haute", client_hint: "", contact_hint: "", telephone_hint: "" };
  }
}

async function findClient(hint: string, fromAddr: string) {
  const candidates = [hint, fromAddr.split("@")[1]?.split(".")[0] ?? ""].filter(Boolean);
  for (const c of candidates) {
    const { data } = await admin
      .from("clients")
      .select("id, entreprise")
      .ilike("entreprise", `%${c}%`)
      .limit(3);
    if (data && data.length > 0) {
      const exact = data.find((x) => x.entreprise.toLowerCase() === c.toLowerCase());
      return exact ?? data[0];
    }
  }
  return null;
}

// ─────────────────────────────────────────── Handler

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const password = await getPassword();
  if (!password) {
    return Response.json(
      { ok: false, error: "no_password", hint: "Configurer le mot de passe dans Paramètres > Boîte hotline" },
      { status: 400, headers: corsHeaders },
    );
  }

  const pop = new Pop3Client();
  const created: any[] = [];
  const skipped: string[] = [];
  let errorMsg: string | null = null;

  try {
    await pop.connect(POP3_HOST, POP3_PORT);
    await pop.login(POP3_USER, password);
    const { count } = await pop.stat();
    console.log(`POP3: ${count} messages en boîte`);

    for (let i = 1; i <= count; i++) {
      try {
        const raw = await pop.retr(i);
        const parsed = await simpleParser(raw);
        const messageId = parsed.messageId ?? `pop3-${POP3_USER}-${Date.now()}-${i}`;

        // Déduplication
        const { data: existing } = await admin
          .from("hotline_email_log")
          .select("id")
          .eq("message_id", messageId)
          .maybeSingle();
        if (existing) {
          skipped.push(messageId);
          await pop.dele(i); // déjà traité : on purge la boîte
          continue;
        }

        const subject = parsed.subject ?? "(sans objet)";
        const fromAddr = parsed.from?.value?.[0]?.address ?? "";
        const fromName = parsed.from?.value?.[0]?.name ?? "";
        const bodyText = parsed.text ?? (parsed.html ? parsed.html.replace(/<[^>]+>/g, " ") : "");

        const cls = await classify(subject, bodyText, fromAddr);
        const client = await findClient(cls.client_hint || fromName, fromAddr);

        const { data: ticket, error } = await admin
          .from("tickets")
          .insert({
            client_id: client?.id ?? null,
            client_nom: client?.entreprise ?? cls.client_hint ?? fromName ?? fromAddr ?? "Client inconnu",
            technicien: "Non assigné",
            contact_client: cls.contact_hint || fromName || null,
            telephone_client: cls.telephone_hint || null,
            motif: cls.motif,
            priorite: cls.priorite,
            statut: "ouvert",
            description: `[Email hotline] De: ${fromName} <${fromAddr}>\nSujet: ${subject}\n\n${bodyText}`.slice(0, 8000),
            source: "email",
          })
          .select("id, ticket_number")
          .single();
        if (error) throw error;

        await admin.from("hotline_email_log").insert({
          message_id: messageId,
          ticket_id: ticket.id,
          subject,
          from_address: fromAddr,
        });

        created.push({ ticket_number: ticket.ticket_number, subject, from: fromAddr });
        await pop.dele(i); // succès : on retire de la boîte
      } catch (e: any) {
        console.error(`POP3 msg #${i} failed`, e);
      }
    }
  } catch (e: any) {
    errorMsg = e.message ?? String(e);
    console.error("POP3 session error", e);
  } finally {
    await pop.quit();
  }

  return Response.json(
    { ok: !errorMsg, created: created.length, skipped: skipped.length, tickets: created, error: errorMsg },
    { headers: corsHeaders },
  );
});
