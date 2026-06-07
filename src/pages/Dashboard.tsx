import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  CalendarDays, Ticket, MessageSquare, StickyNote, Link as LinkIcon,
  TrendingUp, AlertTriangle, Settings as SettingsIcon, Plus, Trash2, ExternalLink,
} from "lucide-react";
import { useTechnician } from "@/hooks/useTechnician";
import { useDashboardPrefs, type WidgetKey, type Shortcut, type Note } from "@/hooks/useDashboardPrefs";
import { fetchAll } from "@/lib/fetchAll";
import { getContractStatus } from "@/lib/contractStatus";
import { MOTIFS, PRIORITES, STATUT_COLORS, ACTIVE_STATUTS } from "@/lib/constants";
import { technicianInitials } from "@/lib/ficam";

type WidgetMeta = { key: WidgetKey; label: string; icon: any; description: string };

const CATALOG: WidgetMeta[] = [
  { key: "calendar", label: "Calendrier", icon: CalendarDays, description: "Planning et rendez-vous personnels" },
  { key: "tickets", label: "Tickets en cours", icon: Ticket, description: "Mes tickets actifs avec priorité et statut" },
  { key: "messages", label: "Messagerie interne", icon: MessageSquare, description: "Aperçu des dernières conversations" },
  { key: "notes", label: "Pense-bête", icon: StickyNote, description: "To-do list privée" },
  { key: "shortcuts", label: "Raccourcis utiles", icon: LinkIcon, description: "Liens rapides personnalisables" },
  { key: "recurrence", label: "Top récurrence", icon: TrendingUp, description: "Clients qui ouvrent le plus de tickets" },
  { key: "contracts", label: "Suivi de contrats", icon: AlertTriangle, description: "Contrats expirés ou à renouveler" },
];

export default function Dashboard() {
  const { technicien } = useTechnician();
  const { prefs, save, loaded } = useDashboardPrefs();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const [tickets, setTickets] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    if (!technicien) return;
    (async () => {
      try {
        const [tick, cli] = await Promise.all([
          fetchAll<any>("tickets", (q) => q.order("date_ouverture", { ascending: false })),
          fetchAll<any>("clients"),
        ]);
        setTickets(tick);
        setClients(cli);
      } catch (e) { console.error(e); }
    })();
  }, [technicien]);

  const enabled = useMemo(() => new Set(prefs.widgets), [prefs.widgets]);

  const toggleWidget = (k: WidgetKey, on: boolean) => {
    const set = new Set(prefs.widgets);
    if (on) set.add(k); else set.delete(k);
    // garder l'ordre du catalogue
    const next = CATALOG.map((c) => c.key).filter((k2) => set.has(k2));
    save({ widgets: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">Bonjour {technicien} — vue personnalisée</p>
        </div>
        <Button variant="outline" onClick={() => setCustomizeOpen(true)}>
          <SettingsIcon className="w-4 h-4" /> Personnaliser ma vue
        </Button>
      </div>

      {!loaded ? (
        <div className="text-sm text-muted-foreground">Chargement de vos préférences…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {enabled.has("calendar") && <CalendarWidget tickets={tickets} me={technicien!} />}
          {enabled.has("tickets") && <TicketsWidget tickets={tickets} me={technicien!} />}
          {enabled.has("messages") && <MessagesWidget me={technicien!} />}
          {enabled.has("notes") && <NotesWidget notes={prefs.pense_betes} onChange={(n) => save({ pense_betes: n })} />}
          {enabled.has("shortcuts") && <ShortcutsWidget shortcuts={prefs.shortcuts} onChange={(s) => save({ shortcuts: s })} />}
          {enabled.has("recurrence") && <RecurrenceWidget tickets={tickets} />}
          {enabled.has("contracts") && <ContractsWidget clients={clients} />}
          {enabled.size === 0 && (
            <Card className="lg:col-span-2">
              <CardContent className="p-10 text-center text-muted-foreground">
                Aucun widget actif. Cliquez sur <strong>Personnaliser ma vue</strong> pour en activer.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Personnaliser ma vue</DialogTitle>
            <DialogDescription>Activez ou désactivez les widgets. Vos préférences sont sauvegardées.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {CATALOG.map((w) => (
              <div key={w.key} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div className="flex items-start gap-3 min-w-0">
                  <w.icon className="w-5 h-5 mt-0.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{w.label}</div>
                    <div className="text-xs text-muted-foreground">{w.description}</div>
                  </div>
                </div>
                <Switch checked={enabled.has(w.key)} onCheckedChange={(v) => toggleWidget(w.key, v)} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =================== Widgets =================== */

function CalendarWidget({ tickets, me }: { tickets: any[]; me: string }) {
  const upcoming = tickets
    .filter((t) => t.technicien === me && t.scheduled_at && new Date(t.scheduled_at) >= new Date(Date.now() - 86400000))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 8);
  const labelDay = (d: Date) =>
    isToday(d) ? "Aujourd'hui" : isTomorrow(d) ? "Demain" : isThisWeek(d, { locale: fr }) ? format(d, "EEEE", { locale: fr }) : format(d, "dd MMM", { locale: fr });

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> Mon calendrier</CardTitle></CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun rendez-vous planifié.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-auto">
            {upcoming.map((t) => {
              const d = new Date(t.scheduled_at);
              return (
                <Link key={t.id} to="/calendar" className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-accent">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{t.client_nom}</div>
                    <div className="text-xs text-muted-foreground">{MOTIFS[t.motif as keyof typeof MOTIFS] ?? t.motif}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-medium capitalize">{labelDay(d)}</div>
                    <div className="text-muted-foreground">{format(d, "HH:mm")}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TicketsWidget({ tickets, me }: { tickets: any[]; me: string }) {
  const mine = tickets.filter((t) => t.technicien === me && (ACTIVE_STATUTS as readonly string[]).includes(t.statut)).slice(0, 10);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Ticket className="w-5 h-5 text-primary" /> Mes tickets en cours <Badge variant="secondary" className="ml-auto">{mine.length}</Badge></CardTitle>
      </CardHeader>
      <CardContent>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun ticket actif. <Link to="/tickets" className="text-primary underline">Créer un ticket</Link>.</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-auto">
            {mine.map((t) => {
              const sc = STATUT_COLORS[t.statut];
              return (
                <Link key={t.id} to="/tickets" className="flex items-center justify-between gap-2 p-2.5 rounded-lg hover:bg-accent">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge style={{ background: sc?.bg, color: sc?.fg }}>{sc?.label ?? t.statut}</Badge>
                    <Badge
                      variant={t.priorite === "basse" ? "secondary" : "default"}
                      className={
                        t.priorite === "critique" ? "bg-critical text-critical-foreground"
                        : t.priorite === "haute" ? "bg-warning text-warning-foreground" : ""
                      }
                    >
                      {PRIORITES[t.priorite as keyof typeof PRIORITES]}
                    </Badge>
                    <span className="text-sm font-medium truncate">{t.client_nom}</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">{t.ticket_number}</Badge>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MessagesWidget({ me }: { me: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender.eq.${me},recipient.eq.${me}`)
        .order("created_at", { ascending: false })
        .limit(50);
      // garder le plus récent par peer
      const seen = new Set<string>();
      const out: any[] = [];
      (data ?? []).forEach((m: any) => {
        const peer = m.sender === me ? m.recipient : m.sender;
        if (seen.has(peer)) return;
        seen.add(peer);
        out.push({ ...m, peer });
      });
      setItems(out.slice(0, 6));
    })();
  }, [me]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Messagerie interne</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun message. <Link to="/messages" className="text-primary underline">Démarrer une conversation</Link>.</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-auto">
            {items.map((m) => (
              <Link key={m.id} to="/messages" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent">
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                  {technicianInitials(m.peer)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{m.peer}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {m.sender === me ? "Vous : " : ""}{m.content || (m.file_name ? `📎 ${m.file_name}` : "")}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground shrink-0">{format(new Date(m.created_at), "HH:mm")}</div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotesWidget({ notes, onChange }: { notes: Note[]; onChange: (n: Note[]) => void }) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (!v) return;
    onChange([...notes, { id: crypto.randomUUID(), text: v, done: false }]);
    setText("");
  };
  const toggle = (id: string) => onChange(notes.map((n) => (n.id === id ? { ...n, done: !n.done } : n)));
  const remove = (id: string) => onChange(notes.filter((n) => n.id !== id));

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><StickyNote className="w-5 h-5 text-primary" /> Pense-bête</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Nouvelle note…" value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button onClick={add} size="icon"><Plus className="w-4 h-4" /></Button>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune note pour l'instant.</p>
        ) : (
          <ul className="space-y-1 max-h-56 overflow-auto">
            {notes.map((n) => (
              <li key={n.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent group">
                <Checkbox checked={n.done} onCheckedChange={() => toggle(n.id)} />
                <span className={"flex-1 text-sm " + (n.done ? "line-through text-muted-foreground" : "")}>{n.text}</span>
                <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100" onClick={() => remove(n.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ShortcutsWidget({ shortcuts, onChange }: { shortcuts: Shortcut[]; onChange: (s: Shortcut[]) => void }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const add = () => {
    const l = label.trim(); let u = url.trim();
    if (!l || !u) return;
    if (!/^https?:\/\//i.test(u) && !u.startsWith("/") && !u.startsWith("file:")) u = "https://" + u;
    onChange([...shortcuts, { id: crypto.randomUUID(), label: l, url: u }]);
    setLabel(""); setUrl("");
  };
  const remove = (id: string) => onChange(shortcuts.filter((s) => s.id !== id));

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><LinkIcon className="w-5 h-5 text-primary" /> Raccourcis utiles</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
          <Input placeholder="Libellé" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input placeholder="https://… ou \\\\serveur\\dossier" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button onClick={add} size="icon"><Plus className="w-4 h-4" /></Button>
        </div>
        {shortcuts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ajoutez vos liens : Post-Processeurs, téléchargements Mastercam…</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-auto">
            {shortcuts.map((s) => (
              <li key={s.id} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent group">
                <a href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 flex-1 min-w-0 text-sm">
                  <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate font-medium">{s.label}</span>
                </a>
                <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100" onClick={() => remove(s.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecurrenceWidget({ tickets }: { tickets: any[] }) {
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const ticketsMois = tickets.filter((t) => new Date(t.date_ouverture) >= monthStart);
  const counter = new Map<string, { count: number; client: string; motifs: Set<string> }>();
  ticketsMois.forEach((t) => {
    const cur = counter.get(t.client_id);
    if (cur) { cur.count++; cur.motifs.add(t.motif); }
    else counter.set(t.client_id, { count: 1, client: t.client_nom, motifs: new Set([t.motif]) });
  });
  const top = Array.from(counter.values())
    .filter((v) => v.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Top récurrence (ce mois)</CardTitle></CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun client récurrent ce mois-ci.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-auto">
            {top.map((v) => (
              <div key={v.client} className="flex items-center justify-between p-2.5 rounded-lg border bg-accent/30">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{v.client}</div>
                  <div className="text-xs text-muted-foreground">
                    {Array.from(v.motifs).map((m) => MOTIFS[m as keyof typeof MOTIFS] ?? m).join(" • ")}
                  </div>
                </div>
                <Badge>{v.count} tickets</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContractsWidget({ clients }: { clients: any[] }) {
  type Alert = { client: any; type: string; expiry: string | null; level: "expired" | "expiring" };
  const alerts: Alert[] = [];
  for (const c of clients) {
    const checks: { type: string; date: string | null }[] = [];
    if (c.contract_type === "hotline" || c.contract_type === "maintenance_hotline") checks.push({ type: "Hotline", date: c.date_echeance_hotline });
    if (c.contract_type === "maintenance" || c.contract_type === "maintenance_hotline") checks.push({ type: "Maintenance", date: c.date_echeance_maintenance });
    if (c.contract_type === "cimco") checks.push({ type: "CIMCO", date: c.date_echeance_maintenance || c.date_echeance_hotline });
    for (const ck of checks) {
      const s = getContractStatus(ck.date);
      if (s === "expired" || s === "expiring") alerts.push({ client: c, type: ck.type, expiry: ck.date, level: s });
    }
  }
  alerts.sort((a, b) => (a.level === "expired" ? -1 : 1) - (b.level === "expired" ? -1 : 1));

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-warning" /> Suivi de contrats</CardTitle></CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun contrat à surveiller.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-auto">
            {alerts.slice(0, 30).map((a, i) => (
              <Link key={a.client.id + a.type + i} to="/settings" className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-accent">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{a.client.entreprise}</div>
                  <div className="text-xs text-muted-foreground">
                    Contrat {a.type} {a.level === "expired" ? "expiré" : "expire bientôt"}
                    {a.expiry && ` — ${format(new Date(a.expiry), "dd MMM yyyy", { locale: fr })}`}
                  </div>
                </div>
                <Badge variant={a.level === "expired" ? "destructive" : "secondary"} className={a.level === "expiring" ? "bg-warning text-warning-foreground" : ""}>
                  {a.level === "expired" ? "Expiré" : "< 30 j"}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
