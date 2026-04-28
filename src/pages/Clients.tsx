import { useEffect, useRef, useState } from "react";
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
import * as XLSX from "xlsx";
import { Upload, Plus, Search, AlertTriangle, Trash2, Edit2 } from "lucide-react";
import { CONTRACT_TYPES, ContractType } from "@/lib/constants";
import { getContractStatus } from "@/lib/contractStatus";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const empty = {
  entreprise: "", contact_nom: "", contact_fonction: "", telephone: "", email: "",
  ville: "", numero_serie_mastercam: "", contract_type: "hors_contrat" as ContractType,
  date_echeance_maintenance: "", date_echeance_hotline: "", notes: "",
};

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("clients").select("*").order("entreprise");
    setClients(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = clients.filter((c) => {
    if (filter !== "all" && c.contract_type !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [c.entreprise, c.contact_nom, c.email, c.telephone, c.numero_serie_mastercam]
      .some((v) => v?.toLowerCase().includes(q));
  });

  const submit = async () => {
    if (!form.entreprise) return toast.error("L'entreprise est obligatoire");
    const payload = {
      ...form,
      date_echeance_maintenance: form.date_echeance_maintenance || null,
      date_echeance_hotline: form.date_echeance_hotline || null,
    };
    const res = editId
      ? await supabase.from("clients").update(payload).eq("id", editId)
      : await supabase.from("clients").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editId ? "Client modifié" : "Client créé");
    setOpen(false); setForm(empty); setEditId(null); load();
  };

  const editClient = (c: any) => {
    setForm({
      ...empty, ...c,
      date_echeance_maintenance: c.date_echeance_maintenance ?? "",
      date_echeance_hotline: c.date_echeance_hotline ?? "",
    });
    setEditId(c.id);
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce client ?")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Client supprimé"); load();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
    const mapped = rows.map((r) => ({
      entreprise: String(r.entreprise || r.Entreprise || r.Société || r.Nom || "").trim(),
      contact_nom: String(r.contact_nom || r.Contact || "").trim() || null,
      telephone: String(r.telephone || r.Téléphone || r.Tel || "").trim() || null,
      email: String(r.email || r.Email || "").trim() || null,
      ville: String(r.ville || r.Ville || "").trim() || null,
      numero_serie_mastercam: String(r.numero_serie_mastercam || r["N° série"] || r.SN || "").trim() || null,
      contract_type: (r.contract_type || "hors_contrat") as ContractType,
      date_echeance_maintenance: r.date_echeance_maintenance ? String(r.date_echeance_maintenance) : null,
      notes: String(r.notes || r.Notes || "").trim() || null,
    })).filter((r) => r.entreprise);

    if (!mapped.length) { toast.error("Aucune ligne valide"); return; }
    const { error } = await supabase.from("clients").insert(mapped);
    if (error) return toast.error(error.message);
    toast.success(`${mapped.length} clients importés`);
    load();
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">{clients.length} clients en base</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" /> Importer
          </Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(empty); setEditId(null); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4" /> Nouveau client</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editId ? "Modifier client" : "Nouveau client"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Entreprise *</Label><Input value={form.entreprise} onChange={(e) => setForm({ ...form, entreprise: e.target.value })} /></div>
                <div><Label>Contact</Label><Input value={form.contact_nom} onChange={(e) => setForm({ ...form, contact_nom: e.target.value })} /></div>
                <div><Label>Fonction</Label><Input value={form.contact_fonction} onChange={(e) => setForm({ ...form, contact_fonction: e.target.value })} /></div>
                <div><Label>Téléphone</Label><Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Ville</Label><Input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} /></div>
                <div><Label>N° série Mastercam</Label><Input value={form.numero_serie_mastercam} onChange={(e) => setForm({ ...form, numero_serie_mastercam: e.target.value })} /></div>
                <div className="col-span-2"><Label>Type de contrat</Label>
                  <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTRACT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Échéance maintenance</Label><Input type="date" value={form.date_echeance_maintenance} onChange={(e) => setForm({ ...form, date_echeance_maintenance: e.target.value })} /></div>
                <div><Label>Échéance hotline</Label><Input type="date" value={form.date_echeance_hotline} onChange={(e) => setForm({ ...form, date_echeance_hotline: e.target.value })} /></div>
                <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <Button onClick={submit} className="w-full">{editId ? "Enregistrer" : "Créer"}</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher entreprise, contact, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les contrats</SelectItem>
                {Object.entries(CONTRACT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Entreprise</th>
                  <th className="px-4 py-2 font-medium">Contact</th>
                  <th className="px-4 py-2 font-medium">Contrat</th>
                  <th className="px-4 py-2 font-medium">Échéance maintenance</th>
                  <th className="px-4 py-2 font-medium">N° série</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 500).map((c) => {
                  const s = getContractStatus(c.date_echeance_maintenance);
                  const horsContrat = c.contract_type === "hors_contrat" || c.contract_type === "maintenance";
                  return (
                    <tr key={c.id} className={
                      "border-b hover:bg-accent/50 " +
                      (s === "expired" ? "text-destructive font-semibold" : s === "expiring" ? "text-warning" : "")
                    }>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {c.entreprise}
                          {horsContrat && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="w-3 h-3" /> Facturable</Badge>}
                        </div>
                        {c.ville && <div className="text-xs text-muted-foreground font-normal">{c.ville}</div>}
                      </td>
                      <td className="px-4 py-2">
                        <div>{c.contact_nom || "—"}</div>
                        <div className="text-xs text-muted-foreground">{c.telephone}</div>
                      </td>
                      <td className="px-4 py-2"><Badge variant="outline">{CONTRACT_TYPES[c.contract_type as ContractType]}</Badge></td>
                      <td className="px-4 py-2">
                        {c.date_echeance_maintenance ? format(new Date(c.date_echeance_maintenance), "dd MMM yyyy", { locale: fr }) : "—"}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{c.numero_serie_mastercam || "—"}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => editClient(c)}><Edit2 className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Aucun client</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 500 && <p className="text-xs text-muted-foreground text-center">Affichage limité à 500 lignes — affinez la recherche.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
