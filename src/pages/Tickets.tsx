import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Play, Square, Trash2, Monitor, CheckCircle2, CalendarPlus } from "lucide-react";
import { MOTIFS, PRIORITES, STATUTS, Motif, Priorite, Statut } from "@/lib/constants";
import { buildFicamCalendarBody, calendarTitle, hotlineRight, simulatedEventRange, technicianInitials } from "@/lib/ficam";
import { useTechnician } from "@/hooks/useTechnician";
import { formatSeconds } from "@/lib/contractStatus";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const initialForm = {
  client_id: "", client_nom: "", contact_client: "", telephone_client: "", teamviewer_id: "", teamviewer_password: "",
  motif: "autre" as Motif, motif_detail: "", priorite: "basse" as Priorite, description: "", statut: "ouvert" as Statut,
};

export default function Tickets() {
  const { technicien } = useTechnician();
  const [tickets, setTickets] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState<any | null>(null);
  const [closeForm, setCloseForm] = useState({ compte_rendu: "", teamviewer_password: "" });
  const [activeTimer, setActiveTimer] = useState<{ ticket_id: string; log_id: string; started_at: number } | null>(null);
  const [, force] = useState(0);
  const [form, setForm] = useState(initialForm);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const eventTicketIds = useMemo(() => new Set(calendarEvents.map((e) => e.ticket_id).filter(Boolean)), [calendarEvents]);

  const load = async () => {
    const [t, c, e] = await Promise.all([
      supabase.from("tickets").select("*").order("date_ouverture", { ascending: false }).limit(500),
      supabase.from("clients").select("*").order("entreprise").limit(5000),
      supabase.from("calendar_events_simulated").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setTickets(t.data ?? []);
    setClients(c.data ?? []);
    setCalendarEvents(e.data ?? []);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!activeTimer) return;
    const i = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [activeTimer]);

  const filtered = tickets.filter((t) => {
    if (statutFilter !== "all" && t.statut !== statutFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [t.ticket_number, t.client_nom, t.contact_client, t.telephone_client, t.teamviewer_id, t.description, t.technicien]
      .some((v) => v?.toLowerCase().includes(q));
  });

  const syncSimulatedCalendar = async (ticket: any, client?: any) => {
    const body = buildFicamCalendarBody(ticket, client);
    const range = simulatedEventRange(ticket);
    const payload = {
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      title: calendarTitle(ticket.client_nom),
      location: technicianInitials(ticket.technicien),
      body,
      start_at: range.start_at,
      end_at: range.end_at,
      technician: ticket.technicien,
      direction: "app_to_calendar",
      status: "simulated",
    };
    const existing = calendarEvents.find((e) => e.ticket_id === ticket.id && e.direction === "app_to_calendar");
    if (existing) await supabase.from("calendar_events_simulated").update(payload).eq("id", existing.id);
    else await supabase.from("calendar_events_simulated").insert(payload);
    await supabase.from("tickets").update({ outlook_location: payload.location, outlook_body_preview: body, outlook_synced_at: new Date().toISOString() }).eq("id", ticket.id);
  };

  const chooseClient = (clientId: string) => {
    const c = clientMap.get(clientId);
    setForm({
      ...form,
      client_id: clientId,
      client_nom: c?.entreprise ?? "",
      contact_client: c?.contact_nom ?? "",
      telephone_client: c?.telephone ?? "",
      teamviewer_id: c?.teamviewer_id ?? "",
    });
  };

  const create = async () => {
    if (!form.client_nom) return toast.error("Sélectionnez un client");
    const client = clientMap.get(form.client_id);
    const horsContrat = !client || client.contract_type === "hors_contrat" || client.contract_type === "maintenance" || hotlineRight(client.contract_type, client.date_echeance_hotline) !== "OUI";
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("tickets").insert({
      ...form,
      client_id: form.client_id || null,
      technicien: technicien!,
      hors_contrat: horsContrat,
      contact_client: form.contact_client || client?.contact_nom || null,
      telephone_client: form.telephone_client || client?.telephone || null,
      teamviewer_id: form.teamviewer_id || null,
      heure_debut_effectif: now,
    }).select().single();
    if (error) return toast.error(error.message);

    if (client?.id && form.teamviewer_id && form.teamviewer_id !== client.teamviewer_id) {
      await supabase.from("clients").update({ teamviewer_id: form.teamviewer_id }).eq("id", client.id);
    }
    await syncSimulatedCalendar(data, { ...client, teamviewer_id: form.teamviewer_id || client?.teamviewer_id });
    toast.success("Ticket créé + événement calendrier simulé");
    setOpen(false);
    setForm(initialForm);
    load();
  };

  const startTimer = async (ticket: any) => {
    if (activeTimer) return toast.error("Un chrono est déjà en cours");
    const { data, error } = await supabase.from("ticket_time_logs").insert({ ticket_id: ticket.id, technicien: technicien! }).select().single();
    if (error) return toast.error(error.message);
    setActiveTimer({ ticket_id: ticket.id, log_id: data.id, started_at: Date.now() });
    await supabase.from("tickets").update({ statut: "en_cours", heure_debut_effectif: ticket.heure_debut_effectif || new Date().toISOString() }).eq("id", ticket.id);
    load();
  };

  const stopTimer = async () => {
    if (!activeTimer) return;
    const dur = Math.floor((Date.now() - activeTimer.started_at) / 1000);
    const end = new Date().toISOString();
    await supabase.from("ticket_time_logs").update({ ended_at: end, duree_secondes: dur }).eq("id", activeTimer.log_id);
    const t = tickets.find((x) => x.id === activeTimer.ticket_id);
    const patch = { duree_secondes: (t?.duree_secondes ?? 0) + dur, heure_fin_effectif: end };
    const { data } = await supabase.from("tickets").update(patch).eq("id", activeTimer.ticket_id).select().single();
    if (data) await syncSimulatedCalendar(data, clientMap.get(data.client_id));
    setActiveTimer(null);
    toast.success(`Temps ajouté : ${formatSeconds(dur)}`);
    load();
  };

  const updateStatut = async (ticket: any, statut: Statut) => {
    if (statut === "ferme" || statut === "resolu") {
      setCloseTarget(ticket);
      setCloseForm({ compte_rendu: ticket.compte_rendu ?? "", teamviewer_password: ticket.teamviewer_password ?? "" });
      return;
    }
    const { data, error } = await supabase.from("tickets").update({ statut }).eq("id", ticket.id).select().single();
    if (error) return toast.error(error.message);
    if (data) await syncSimulatedCalendar(data, clientMap.get(data.client_id));
    load();
  };

  const closeTicket = async (statut: Statut = "resolu") => {
    if (!closeTarget) return;
    if (activeTimer?.ticket_id === closeTarget.id) await stopTimer();
    const end = new Date().toISOString();
    const patch = { statut, date_cloture: end, heure_fin_effectif: end, compte_rendu: closeForm.compte_rendu, teamviewer_password: closeForm.teamviewer_password || null };
    const { data, error } = await supabase.from("tickets").update(patch).eq("id", closeTarget.id).select().single();
    if (error) return toast.error(error.message);
    if (data) await syncSimulatedCalendar(data, clientMap.get(data.client_id));
    setCloseTarget(null);
    toast.success("Ticket clôturé + calendrier simulé mis à jour");
    load();
  };

  const updateTicketTeamViewer = async (ticket: any, value: string) => {
    const patch = { teamviewer_id: value || null };
    await supabase.from("tickets").update(patch).eq("id", ticket.id);
    if (ticket.client_id && value) await supabase.from("clients").update({ teamviewer_id: value }).eq("id", ticket.client_id);
    toast.success("ID TeamViewer mémorisé sur la fiche client");
    load();
  };

  const openTeamViewer = (id?: string | null) => {
    if (!id) return toast.error("Aucun ID TeamViewer enregistré");
    window.location.href = `teamviewerapi://remotecontrol?connectcc=${encodeURIComponent(id.replace(/\s+/g, ""))}`;
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce ticket ?")) return;
    await supabase.from("calendar_events_simulated").delete().eq("ticket_id", id);
    await supabase.from("tickets").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">{tickets.length} tickets enregistrés • calendrier simulé actif</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4" /> Nouveau ticket</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouveau ticket</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Client</Label>
                <Select value={form.client_id} onValueChange={chooseClient}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.entreprise}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Contact client</Label><Input value={form.contact_client} onChange={(e) => setForm({ ...form, contact_client: e.target.value })} /></div>
                <div><Label>Téléphone</Label><Input value={form.telephone_client} onChange={(e) => setForm({ ...form, telephone_client: e.target.value })} /></div>
                <div><Label>TeamViewer</Label><Input value={form.teamviewer_id} onChange={(e) => setForm({ ...form, teamviewer_id: e.target.value })} placeholder="Mémorisé automatiquement" /></div>
                <div><Label>MDP TeamViewer</Label><Input value={form.teamviewer_password} onChange={(e) => setForm({ ...form, teamviewer_password: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Motif</Label>
                  <Select value={form.motif} onValueChange={(v) => setForm({ ...form, motif: v as Motif })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(MOTIFS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Priorité</Label>
                  <Select value={form.priorite} onValueChange={(v) => setForm({ ...form, priorite: v as Priorite })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PRIORITES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Créer le ticket et simuler Outlook</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher ticket, client, téléphone, TeamViewer..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {Object.entries(STATUTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filtered.map((t) => {
              const isActive = activeTimer?.ticket_id === t.id;
              const liveDur = isActive ? Math.floor((Date.now() - activeTimer.started_at) / 1000) : 0;
              const total = (t.duree_secondes ?? 0) + liveDur;
              return (
                <div key={t.id} className="border rounded-lg p-4 hover:bg-accent/30">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono">{t.ticket_number}</Badge>
                        <Badge className={t.priorite === "critique" ? "bg-critical text-critical-foreground" : t.priorite === "haute" ? "bg-warning text-warning-foreground" : ""} variant={t.priorite === "basse" ? "secondary" : "default"}>{PRIORITES[t.priorite as Priorite]}</Badge>
                        {t.hors_contrat && <Badge variant="destructive">⚠ Facturable</Badge>}
                        {eventTicketIds.has(t.id) && <Badge variant="outline"><CalendarPlus className="w-3 h-3" /> Outlook simulé</Badge>}
                        <span className="font-semibold">{t.client_nom}</span>
                        <span className="text-xs text-muted-foreground">— {MOTIFS[t.motif as Motif]}</span>
                      </div>
                      {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                      <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
                        <span>{technicianInitials(t.technicien)} • {t.technicien}</span>
                        <span>{format(new Date(t.date_ouverture), "dd MMM yyyy HH:mm", { locale: fr })}</span>
                        <span className="font-mono">⏱ {formatSeconds(total)}</span>
                        <span>{t.contact_client || "Contact non renseigné"}</span>
                        <span>{t.telephone_client || "Téléphone non renseigné"}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Input className="h-8 w-48 font-mono text-xs" defaultValue={t.teamviewer_id ?? ""} placeholder="ID TeamViewer" onBlur={(e) => e.target.value !== (t.teamviewer_id ?? "") && updateTicketTeamViewer(t, e.target.value)} />
                        <Button size="sm" variant="outline" onClick={() => openTeamViewer(t.teamviewer_id)}><Monitor className="w-3 h-3" /> Prendre la main</Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {isActive ? <Button size="sm" variant="destructive" onClick={stopTimer}><Square className="w-3 h-3" /> Stop</Button> : <Button size="sm" variant="outline" onClick={() => startTimer(t)} disabled={!!activeTimer || ["resolu", "ferme"].includes(t.statut)}><Play className="w-3 h-3" /> Start</Button>}
                      <Select value={t.statut} onValueChange={(v) => updateStatut(t, v as Statut)}>
                        <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(STATUTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="sm" variant="secondary" onClick={() => updateStatut(t, "resolu")} disabled={["resolu", "ferme"].includes(t.statut)}><CheckCircle2 className="w-3 h-3" /> Clôturer</Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun ticket</p>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!closeTarget} onOpenChange={(o) => !o && setCloseTarget(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Clôturer le ticket {closeTarget?.ticket_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>MDP TeamViewer</Label><Input value={closeForm.teamviewer_password} onChange={(e) => setCloseForm({ ...closeForm, teamviewer_password: e.target.value })} /></div>
            <div><Label>Compte rendu</Label><Textarea rows={6} value={closeForm.compte_rendu} onChange={(e) => setCloseForm({ ...closeForm, compte_rendu: e.target.value })} placeholder="Texte repris dans le corps Outlook simulé" /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => closeTicket("ferme")}>Fermer</Button>
              <Button onClick={() => closeTicket("resolu")}>Résoudre</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
