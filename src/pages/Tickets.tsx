import { useEffect, useState } from "react";
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
import { Plus, Search, Play, Square, Trash2 } from "lucide-react";
import { MOTIFS, PRIORITES, STATUTS, Motif, Priorite, Statut } from "@/lib/constants";
import { useTechnician } from "@/hooks/useTechnician";
import { formatSeconds } from "@/lib/contractStatus";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Tickets() {
  const { technicien } = useTechnician();
  const [tickets, setTickets] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [activeTimer, setActiveTimer] = useState<{ ticket_id: string; log_id: string; started_at: number } | null>(null);
  const [, force] = useState(0);

  const [form, setForm] = useState({
    client_id: "", client_nom: "", motif: "autre" as Motif, motif_detail: "",
    priorite: "basse" as Priorite, description: "", statut: "ouvert" as Statut,
  });

  const load = async () => {
    const [t, c] = await Promise.all([
      supabase.from("tickets").select("*").order("date_ouverture", { ascending: false }).limit(500),
      supabase.from("clients").select("id, entreprise, contract_type, date_echeance_hotline").order("entreprise"),
    ]);
    setTickets(t.data ?? []);
    setClients(c.data ?? []);
  };

  useEffect(() => { load(); }, []);

  // Tick timer
  useEffect(() => {
    if (!activeTimer) return;
    const i = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [activeTimer]);

  const filtered = tickets.filter((t) => {
    if (statutFilter !== "all" && t.statut !== statutFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [t.client_nom, t.description, t.technicien].some((v) => v?.toLowerCase().includes(q));
  });

  const create = async () => {
    if (!form.client_nom) return toast.error("Sélectionnez un client");
    const client = clients.find((c) => c.id === form.client_id);
    const horsContrat = !client || client.contract_type === "hors_contrat" || client.contract_type === "maintenance";
    const { error } = await supabase.from("tickets").insert({
      ...form,
      client_id: form.client_id || null,
      technicien: technicien!,
      hors_contrat: horsContrat,
    });
    if (error) return toast.error(error.message);
    toast.success("Ticket créé");
    setOpen(false);
    setForm({ client_id: "", client_nom: "", motif: "autre", motif_detail: "", priorite: "basse", description: "", statut: "ouvert" });
    load();
  };

  const startTimer = async (ticketId: string) => {
    if (activeTimer) return toast.error("Un chrono est déjà en cours");
    const { data, error } = await supabase.from("ticket_time_logs").insert({
      ticket_id: ticketId, technicien: technicien!,
    }).select().single();
    if (error) return toast.error(error.message);
    setActiveTimer({ ticket_id: ticketId, log_id: data.id, started_at: Date.now() });
    await supabase.from("tickets").update({ statut: "en_cours" }).eq("id", ticketId);
    load();
  };

  const stopTimer = async () => {
    if (!activeTimer) return;
    const dur = Math.floor((Date.now() - activeTimer.started_at) / 1000);
    await supabase.from("ticket_time_logs").update({
      ended_at: new Date().toISOString(), duree_secondes: dur,
    }).eq("id", activeTimer.log_id);
    const t = tickets.find((x) => x.id === activeTimer.ticket_id);
    await supabase.from("tickets").update({
      duree_secondes: (t?.duree_secondes ?? 0) + dur,
    }).eq("id", activeTimer.ticket_id);
    setActiveTimer(null);
    toast.success(`Temps ajouté : ${formatSeconds(dur)}`);
    load();
  };

  const updateStatut = async (id: string, statut: Statut) => {
    const patch: any = { statut };
    if (statut === "ferme" || statut === "resolu") patch.date_cloture = new Date().toISOString();
    if (activeTimer?.ticket_id === id && (statut === "ferme" || statut === "resolu")) await stopTimer();
    const { error } = await supabase.from("tickets").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce ticket ?")) return;
    await supabase.from("tickets").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">{tickets.length} tickets enregistrés</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4" /> Nouveau ticket</Button></DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouveau ticket</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={(v) => {
                  const c = clients.find((x) => x.id === v);
                  setForm({ ...form, client_id: v, client_nom: c?.entreprise ?? "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {clients.slice(0, 200).map((c) => <SelectItem key={c.id} value={c.id}>{c.entreprise}</SelectItem>)}
                  </SelectContent>
                </Select>
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
              <div><Label>Description</Label>
                <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <Button onClick={create} className="w-full">Créer le ticket</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                        <Badge className={
                          t.priorite === "critique" ? "bg-critical text-critical-foreground"
                          : t.priorite === "haute" ? "bg-warning text-warning-foreground" : ""
                        } variant={t.priorite === "basse" ? "secondary" : "default"}>
                          {PRIORITES[t.priorite as Priorite]}
                        </Badge>
                        {t.hors_contrat && <Badge variant="destructive">⚠ Facturable</Badge>}
                        <span className="font-semibold">{t.client_nom}</span>
                        <span className="text-xs text-muted-foreground">— {MOTIFS[t.motif as Motif]}</span>
                      </div>
                      {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                      <div className="text-xs text-muted-foreground mt-2 flex gap-3">
                        <span>{t.technicien}</span>
                        <span>{format(new Date(t.date_ouverture), "dd MMM yyyy HH:mm", { locale: fr })}</span>
                        <span className="font-mono">⏱ {formatSeconds(total)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <Button size="sm" variant="destructive" onClick={stopTimer}><Square className="w-3 h-3" /> Stop</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => startTimer(t.id)} disabled={!!activeTimer || ["resolu", "ferme"].includes(t.statut)}>
                          <Play className="w-3 h-3" /> Start
                        </Button>
                      )}
                      <Select value={t.statut} onValueChange={(v) => updateStatut(t.id, v as Statut)}>
                        <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(STATUTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
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
    </div>
  );
}
