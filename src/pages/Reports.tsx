import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { MOTIFS, PRIORITES, STATUTS, TECHNICIENS } from "@/lib/constants";
import { formatSeconds } from "@/lib/contractStatus";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const [tickets, setTickets] = useState<any[]>([]);
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(format(monthStart, "yyyy-MM-dd"));
  const [to, setTo] = useState(format(today, "yyyy-MM-dd"));
  const [tech, setTech] = useState("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("tickets").select("*").limit(5000);
      setTickets(data ?? []);
    })();
  }, []);

  const filtered = tickets.filter((t) => {
    const d = new Date(t.date_ouverture);
    if (d < new Date(from) || d > new Date(to + "T23:59:59")) return false;
    if (tech !== "all" && t.technicien !== tech) return false;
    return true;
  });

  const total = filtered.reduce((acc, t) => acc + (t.duree_secondes ?? 0), 0);
  const byMotif = Object.entries(MOTIFS).map(([k, v]) => ({
    label: v, count: filtered.filter((t) => t.motif === k).length,
  }));
  const byTech = TECHNICIENS.map((t) => ({
    label: t,
    count: filtered.filter((x) => x.technicien === t).length,
    duree: filtered.filter((x) => x.technicien === t).reduce((a, b) => a + (b.duree_secondes ?? 0), 0),
  })).filter((x) => x.count > 0);

  const exportExcel = () => {
    const rows = filtered.map((t) => ({
      Date: format(new Date(t.date_ouverture), "dd/MM/yyyy HH:mm"),
      Client: t.client_nom,
      Technicien: t.technicien,
      Motif: MOTIFS[t.motif as keyof typeof MOTIFS],
      Priorité: PRIORITES[t.priorite as keyof typeof PRIORITES],
      Statut: STATUTS[t.statut as keyof typeof STATUTS],
      "Durée (s)": t.duree_secondes ?? 0,
      "Hors contrat": t.hors_contrat ? "Oui" : "Non",
      Description: t.description ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tickets");
    XLSX.writeFile(wb, `rapport-hotline-${from}-${to}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Rapport Hotline FICAM", 14, 18);
    doc.setFontSize(10); doc.text(`Période : ${from} au ${to}`, 14, 26);
    doc.text(`${filtered.length} tickets — Temps total : ${formatSeconds(total)}`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [["Date", "Client", "Technicien", "Motif", "Priorité", "Statut", "Durée"]],
      body: filtered.map((t) => [
        format(new Date(t.date_ouverture), "dd/MM/yy HH:mm"),
        t.client_nom,
        t.technicien,
        MOTIFS[t.motif as keyof typeof MOTIFS],
        PRIORITES[t.priorite as keyof typeof PRIORITES],
        STATUTS[t.statut as keyof typeof STATUTS],
        formatSeconds(t.duree_secondes ?? 0),
      ]),
      styles: { fontSize: 8 },
    });
    doc.save(`rapport-hotline-${from}-${to}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rapports</h1>
        <p className="text-muted-foreground">Analyse de l'activité hotline</p>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div><Label>Technicien</Label>
            <Select value={tech} onValueChange={setTech}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {TECHNICIENS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={exportExcel} className="flex-1"><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
            <Button onClick={exportPdf} variant="outline" className="flex-1"><FileDown className="w-4 h-4" /> PDF</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Tickets</div><div className="text-2xl font-bold">{filtered.length}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Temps total</div><div className="text-2xl font-bold">{formatSeconds(total)}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Hors contrat</div><div className="text-2xl font-bold">{filtered.filter((t) => t.hors_contrat).length}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">Critiques</div><div className="text-2xl font-bold text-critical">{filtered.filter((t) => t.priorite === "critique").length}</div></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Par motif</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {byMotif.map((m) => (
              <div key={m.label} className="flex items-center justify-between">
                <span className="text-sm">{m.label}</span>
                <div className="flex items-center gap-3 flex-1 max-w-xs ml-4">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${filtered.length ? (m.count / filtered.length) * 100 : 0}%` }} />
                  </div>
                  <span className="text-sm font-mono w-8 text-right">{m.count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Par technicien</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {byTech.map((t) => (
              <div key={t.label} className="flex items-center justify-between text-sm">
                <span className="truncate">{t.label}</span>
                <span className="text-muted-foreground font-mono">{t.count} • {formatSeconds(t.duree)}</span>
              </div>
            ))}
            {byTech.length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
