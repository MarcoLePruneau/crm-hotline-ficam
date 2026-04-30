import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileDown, FileSpreadsheet, ChevronRight } from "lucide-react";
import { MOTIFS, PRIORITES, STATUTS, Motif } from "@/lib/constants";
import { formatSeconds } from "@/lib/contractStatus";
import { format, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const [tickets, setTickets] = useState<any[]>([]);
  const today = new Date();
  const [from, setFrom] = useState(format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(today, "yyyy-MM-dd"));
  const [drillClient, setDrillClient] = useState<{ client_id: string; client_nom: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("tickets").select("*").limit(10000);
      setTickets(data ?? []);
    })();
  }, []);

  const filtered = useMemo(() => tickets.filter((t) => {
    const d = new Date(t.date_ouverture);
    return d >= new Date(from) && d <= new Date(to + "T23:59:59");
  }), [tickets, from, to]);

  // Stats par CLIENT
  const byClient = useMemo(() => {
    const m = new Map<string, { client_id: string; client_nom: string; count: number; duree: number; motifs: Record<string, number> }>();
    filtered.forEach((t) => {
      const key = t.client_id || t.client_nom;
      const cur = m.get(key) ?? { client_id: t.client_id ?? "", client_nom: t.client_nom, count: 0, duree: 0, motifs: {} };
      cur.count++;
      cur.duree += t.duree_secondes ?? 0;
      cur.motifs[t.motif] = (cur.motifs[t.motif] ?? 0) + 1;
      m.set(key, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.count - a.count);
  }, [filtered]);

  // Stats par MOTIF
  const byMotif = useMemo(() => {
    return Object.entries(MOTIFS).map(([k, label]) => {
      const list = filtered.filter((t) => t.motif === k);
      return {
        key: k, label,
        count: list.length,
        duree: list.reduce((a, t) => a + (t.duree_secondes ?? 0), 0),
      };
    }).sort((a, b) => b.count - a.count);
  }, [filtered]);

  const total = filtered.reduce((acc, t) => acc + (t.duree_secondes ?? 0), 0);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byClient.map((c) => ({
      Client: c.client_nom,
      "Nb appels": c.count,
      "Durée totale": formatSeconds(c.duree),
      "Motif principal": Object.entries(c.motifs).sort((a, b) => b[1] - a[1])[0]?.[0]
        ? MOTIFS[Object.entries(c.motifs).sort((a, b) => b[1] - a[1])[0][0] as Motif] : "—",
    }))), "Par client");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byMotif.map((m) => ({
      Motif: m.label, "Nb appels": m.count, "Durée totale": formatSeconds(m.duree),
    }))), "Par motif");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filtered.map((t) => ({
      Ticket: t.ticket_number,
      Date: format(new Date(t.date_ouverture), "dd/MM/yyyy HH:mm"),
      Client: t.client_nom,
      Contact: t.contact_client ?? "",
      Motif: MOTIFS[t.motif as Motif],
      Statut: STATUTS[t.statut as keyof typeof STATUTS],
      Durée: formatSeconds(t.duree_secondes ?? 0),
    }))), "Détails");
    XLSX.writeFile(wb, `rapport-hotline-${from}-${to}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Rapport Hotline FICAM", 14, 18);
    doc.setFontSize(10); doc.text(`Période : ${from} au ${to} — ${filtered.length} tickets — ${formatSeconds(total)}`, 14, 26);
    autoTable(doc, {
      startY: 32, head: [["Client", "Appels", "Durée", "Motif principal"]],
      body: byClient.slice(0, 50).map((c) => [
        c.client_nom, c.count, formatSeconds(c.duree),
        MOTIFS[Object.entries(c.motifs).sort((a, b) => b[1] - a[1])[0]?.[0] as Motif] ?? "—",
      ]),
      styles: { fontSize: 8 },
    });
    doc.save(`rapport-hotline-${from}-${to}.pdf`);
  };

  const drillTickets = drillClient
    ? filtered.filter((t) => (t.client_id || t.client_nom) === (drillClient.client_id || drillClient.client_nom))
    : [];
  const monthStart = startOfMonth(today).toISOString();
  const drillMonthDuree = drillClient
    ? tickets.filter((t) =>
        (t.client_id || t.client_nom) === (drillClient.client_id || drillClient.client_nom) &&
        t.date_ouverture >= monthStart,
      ).reduce((a, t) => a + (t.duree_secondes ?? 0), 0)
    : 0;
  const drillMotifs = drillClient
    ? Object.entries(
        drillTickets.reduce<Record<string, number>>((acc, t) => {
          acc[t.motif] = (acc[t.motif] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rapports</h1>
        <p className="text-muted-foreground">Analyse par client et par motif d'appel</p>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="md:col-span-2 flex items-end gap-2">
            <Button onClick={exportExcel} className="flex-1"><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
            <Button onClick={exportPdf} variant="outline" className="flex-1"><FileDown className="w-4 h-4" /> PDF</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Tickets</div><div className="text-2xl font-bold">{filtered.length}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Temps total</div><div className="text-2xl font-bold">{formatSeconds(total)}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Clients distincts</div><div className="text-2xl font-bold">{byClient.length}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Hors contrat</div><div className="text-2xl font-bold">{filtered.filter((t) => t.hors_contrat).length}</div></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Par client (Top 30)</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-[600px] overflow-auto">
            {byClient.slice(0, 30).map((c) => {
              const topMotif = Object.entries(c.motifs).sort((a, b) => b[1] - a[1])[0];
              return (
                <button
                  key={c.client_id || c.client_nom}
                  onClick={() => setDrillClient({ client_id: c.client_id, client_nom: c.client_nom })}
                  className="w-full text-left flex items-center justify-between p-2 rounded hover:bg-accent"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{c.client_nom}</div>
                    <div className="text-xs text-muted-foreground">
                      {topMotif ? MOTIFS[topMotif[0] as Motif] : "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{c.count}</Badge>
                    <span className="text-xs font-mono text-muted-foreground">{formatSeconds(c.duree)}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
            {byClient.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Aucune donnée</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Par motif d'appel</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {byMotif.map((m) => (
              <div key={m.key} className="flex items-center justify-between gap-3">
                <span className="text-sm w-44">{m.label}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${filtered.length ? (m.count / filtered.length) * 100 : 0}%` }} />
                </div>
                <div className="w-32 text-right text-xs font-mono text-muted-foreground">
                  {m.count} • {formatSeconds(m.duree)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Drill-down client */}
      <Dialog open={!!drillClient} onOpenChange={(o) => !o && setDrillClient(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drillClient?.client_nom}</DialogTitle>
          </DialogHeader>
          {drillClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Tickets (période)</div><div className="text-xl font-bold">{drillTickets.length}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Temps ce mois-ci</div><div className="text-xl font-bold">{formatSeconds(drillMonthDuree)}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Top motif</div><div className="text-sm font-semibold mt-1">{drillMotifs[0] ? MOTIFS[drillMotifs[0][0] as Motif] : "—"}</div></CardContent></Card>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Motifs récurrents</h3>
                <div className="space-y-1">
                  {drillMotifs.map(([k, count]) => (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <span>{MOTIFS[k as Motif]}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Historique complet</h3>
                <div className="space-y-1 max-h-80 overflow-auto">
                  {drillTickets.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded border text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="font-mono text-[10px]">{t.ticket_number}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(t.date_ouverture), "dd/MM/yy HH:mm")}</span>
                        <span className="truncate">{MOTIFS[t.motif as Motif]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={t.priorite === "critique" ? "destructive" : "secondary"} className="text-[10px]">{PRIORITES[t.priorite as keyof typeof PRIORITES]}</Badge>
                        <span className="text-xs font-mono text-muted-foreground">{formatSeconds(t.duree_secondes ?? 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
