import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Trash2, CheckCircle2, Edit2 } from "lucide-react";
import { MOTIFS, PRIORITES, STATUTS, STATUT_COLORS, CLOSED_STATUTS, Motif, Priorite, Statut } from "@/lib/constants";
import { technicianInitials, launchTeamViewer } from "@/lib/ficam";
import { useTechnician } from "@/hooks/useTechnician";
import { formatSeconds } from "@/lib/contractStatus";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import TicketDialog from "@/components/TicketDialog";
import tvLogo from "@/assets/teamviewer.png";

const computeDuration = (open: string | null, close: string | null) => {
  if (!open || !close) return 0;
  const d = Math.floor((new Date(close).getTime() - new Date(open).getTime()) / 1000);
  return d > 0 ? d : 0;
};

export default function Tickets() {
  const { technicien } = useTechnician();
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const isCimcoOnly = technicien === "Michael DERLON";

  const load = async () => {
    let list: any[] = [];
    try {
      list = await fetchAll<any>("tickets", (q) => q.order("date_ouverture", { ascending: false }));
    } catch (e: any) {
      toast.error(e.message ?? "Erreur de chargement");
      return;
    }
    if (isCimcoOnly) {
      // On filtre côté client : motif=cimco OU client lié à un contrat CIMCO
      const clientIds = list.map((t) => t.client_id).filter(Boolean);
      if (clientIds.length) {
        const { data: cs } = await supabase.from("clients").select("id, contract_type").in("id", clientIds);
        const cimcoIds = new Set((cs ?? []).filter((c) => c.contract_type === "cimco").map((c) => c.id));
        list = list.filter((t) => t.motif === "cimco" || cimcoIds.has(t.client_id));
      } else {
        list = list.filter((t) => t.motif === "cimco");
      }
    }
    setTickets(list);
  };

  useEffect(() => { load(); }, [technicien]);

  const filtered = useMemo(() => tickets.filter((t) => {
    if (statutFilter !== "all" && t.statut !== statutFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [t.ticket_number, t.client_nom, t.contact_client, t.telephone_client, t.teamviewer_id, t.description, t.technicien]
      .some((v) => v?.toLowerCase().includes(q));
  }), [tickets, statutFilter, search]);

  const updateStatut = async (ticket: any, statut: Statut) => {
    const patch: any = { statut };
    if ((CLOSED_STATUTS as readonly string[]).includes(statut)) {
      const now = new Date().toISOString();
      patch.date_cloture = now;
      if (!ticket.heure_fin_effectif) patch.heure_fin_effectif = now;
      // Calcul auto de la durée : date_ouverture → maintenant
      patch.duree_secondes = computeDuration(ticket.date_ouverture, now);
    }
    const { error } = await supabase.from("tickets").update(patch).eq("id", ticket.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce ticket ?")) return;
    await supabase.from("tickets").delete().eq("id", id);
    load();
  };

  const openTV = (t: any) => {
    const mode = launchTeamViewer(t.teamviewer_id, t.teamviewer_password);
    if (mode === "auto") toast.success("Connexion TeamViewer automatique");
    else if (mode === "id-only") toast.info("TeamViewer ouvert (ID pré-rempli, pas de mot de passe)");
    else toast.info("TeamViewer ouvert");
  };

  const openEdit = (id: string) => { setEditId(id); setOpen(true); };
  const openNew = () => { setEditId(null); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">
            {tickets.length} tickets {isCimcoOnly && <Badge variant="outline" className="ml-2">Vue CIMCO</Badge>}
          </p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4" /> Nouveau ticket</Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher ticket, client, téléphone, TeamViewer..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {Object.entries(STATUTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filtered.map((t) => {
              // Durée affichée : si terminé → duree_secondes ; sinon en cours = now - date_ouverture
              const closed = (CLOSED_STATUTS as readonly string[]).includes(t.statut);
              const total = closed
                ? (t.duree_secondes ?? computeDuration(t.date_ouverture, t.heure_fin_effectif))
                : computeDuration(t.date_ouverture, new Date().toISOString());
              const sc = STATUT_COLORS[t.statut];
              return (
                <div key={t.id} className="border rounded-lg p-4 hover:bg-accent/30 border-l-4" style={{ borderLeftColor: sc?.bg }}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openEdit(t.id)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono">{t.ticket_number}</Badge>
                        <Badge style={{ background: sc?.bg, color: sc?.fg }}>{sc?.label ?? t.statut}</Badge>
                        <Badge variant={t.priorite === "critique" ? "destructive" : t.priorite === "haute" ? "default" : "secondary"}>{PRIORITES[t.priorite as Priorite]}</Badge>
                        {t.hors_contrat && <Badge variant="destructive">⚠ Facturable</Badge>}
                        <span className="font-semibold">{t.client_nom}</span>
                        <span className="text-xs text-muted-foreground">— {MOTIFS[t.motif as Motif] ?? t.motif}</span>
                      </div>
                      {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                      <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
                        <span>{technicianInitials(t.technicien)} • {t.technicien}</span>
                        <span>{format(new Date(t.date_ouverture), "dd MMM yyyy HH:mm", { locale: fr })}</span>
                        <span className="font-mono">⏱ {formatSeconds(total)}</span>
                        <span>👤 {t.contact_client || "—"}</span>
                        <span>📞 {t.telephone_client || "—"}</span>
                        {t.teamviewer_id && <span className="font-mono">TV: {t.teamviewer_id}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <Button size="sm" variant="outline" onClick={() => openTV(t)} title="Lancer TeamViewer">
                        <img src={tvLogo} alt="TeamViewer" className="w-4 h-4" /> TeamViewer
                      </Button>
                      <Select value={t.statut} onValueChange={(v) => updateStatut(t, v as Statut)}>
                        <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(STATUTS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            <span className="inline-flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: STATUT_COLORS[k]?.bg }} />
                              {v}
                            </span>
                          </SelectItem>
                        ))}</SelectContent>
                      </Select>
                      <Button size="sm" variant="secondary" onClick={() => updateStatut(t, "traite")} disabled={closed}><CheckCircle2 className="w-3 h-3" /> Traité</Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t.id)}><Edit2 className="w-4 h-4" /></Button>
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

      <TicketDialog open={open} onOpenChange={setOpen} ticketId={editId} onSaved={load} />
    </div>
  );
}
