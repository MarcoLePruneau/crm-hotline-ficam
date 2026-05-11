import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Upload, Plus, Search, AlertTriangle, Trash2, Edit2, Monitor, Users, FileText, UserPlus } from "lucide-react";
import { CLIENT_FILTER_TYPES, CONTRACT_TYPES, ContractType, HOTLINE_ELIGIBLE_TYPES } from "@/lib/constants";
import { contractLabel } from "@/lib/ficam";
import { getContractStatus } from "@/lib/contractStatus";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const empty = {
  entreprise: "", contact_nom: "", contact_fonction: "", telephone: "", email: "",
  ville: "", adresse: "", code_postal: "", numero_serie_mastercam: "", teamviewer_id: "",
  contract_type: "hors_contrat" as ContractType,
  date_echeance_maintenance: "", date_echeance_hotline: "", notes: "",
};

const norm = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ").toUpperCase();
const clean = (v: unknown) => { const s = String(v ?? "").trim().replace(/\s+/g, " "); return s || null; };
const upperName = (v: unknown) => { const s = clean(v); return s ? s.toUpperCase() : null; };
const titleName = (v: unknown) => { const s = clean(v); return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : null; };
const toIsoDate = (v: unknown) => {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const asNum = typeof v === "number" ? XLSX.SSF.parse_date_code(v) : null;
  if (asNum) return new Date(asNum.y, asNum.m - 1, asNum.d).toISOString().slice(0, 10);
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
const rowsFromFile = async (file: File) => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });
  return XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
};

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailContacts, setDetailContacts] = useState<any[]>([]);
  const [detailContracts, setDetailContracts] = useState<any[]>([]);
  const [newContact, setNewContact] = useState({ nom: "", fonction: "", telephone: "", email: "" });
  const clientsFileRef = useRef<HTMLInputElement>(null);
  const contactsFileRef = useRef<HTMLInputElement>(null);
  const contractsFileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    // Pagination par tranches de 1000 pour contourner la limite Supabase et charger TOUS les clients
    try {
      const data = await fetchAll<any>("clients", (q) => q.order("entreprise"));
      setClients(data);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur de chargement");
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = clients.filter((c) => {
    if (filter !== "all" && c.contract_type !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [c.entreprise, c.contact_nom, c.email, c.telephone, c.ville, c.numero_serie_mastercam, c.teamviewer_id]
      .some((v) => v?.toLowerCase().includes(q));
  });

  const submit = async () => {
    if (!form.entreprise) return toast.error("L'entreprise est obligatoire");
    const payload = {
      ...form,
      external_ref: norm(form.entreprise),
      date_echeance_maintenance: form.date_echeance_maintenance || null,
      date_echeance_hotline: form.date_echeance_hotline || null,
      teamviewer_id: form.teamviewer_id || null,
    };
    const res = editId
      ? await supabase.from("clients").update(payload).eq("id", editId)
      : await supabase.from("clients").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editId ? "Client modifié" : "Client créé");
    setOpen(false); setForm(empty); setEditId(null); load();
  };

  const editClient = (c: any) => {
    setForm({ ...empty, ...c, date_echeance_maintenance: c.date_echeance_maintenance ?? "", date_echeance_hotline: c.date_echeance_hotline ?? "", teamviewer_id: c.teamviewer_id ?? "" });
    setEditId(c.id); setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce client ? (Cascade : contrats supprimés)")) return;
    await supabase.from("contracts").delete().eq("client_id", id);
    await supabase.from("client_contacts").delete().eq("client_id", id);
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Client supprimé"); load();
  };

  // ===== Vue détaillée =====
  const openDetail = async (id: string) => {
    setDetailId(id);
    const [{ data: cts }, { data: ctr }] = await Promise.all([
      supabase.from("client_contacts").select("*").eq("client_id", id).order("nom"),
      supabase.from("contracts").select("*").eq("client_id", id).order("date_commande", { ascending: false }),
    ]);
    setDetailContacts(cts ?? []);
    setDetailContracts(ctr ?? []);
  };
  const detailClient = clients.find((c) => c.id === detailId);

  const addContactInDetail = async () => {
    if (!detailId || !newContact.nom.trim()) return toast.error("Nom du contact requis");
    const payload = {
      client_id: detailId,
      nom: [upperName(newContact.nom.split(" ")[0]), titleName(newContact.nom.split(" ").slice(1).join(" "))].filter(Boolean).join(" ") || newContact.nom,
      fonction: newContact.fonction || null,
      telephone: newContact.telephone || null,
      email: newContact.email || null,
    };
    const { data, error } = await supabase.from("client_contacts").insert(payload).select().single();
    if (error) return toast.error(error.message);
    setDetailContacts([...detailContacts, data]);
    setNewContact({ nom: "", fonction: "", telephone: "", email: "" });
    toast.success("Contact ajouté — disponible immédiatement dans les tickets");
  };

  // ===== Imports Excel : 3 boutons (Clients, Contacts, Contrats) avec UPSERT =====
  const importClients = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const rows = await rowsFromFile(file);
    const mapped = rows.map((r) => {
      const entreprise = clean(r["Nom du Client "] || r["Nom du Client"] || r.entreprise || r.Nom);
      if (!entreprise) return null;
      return {
        entreprise, external_ref: norm(entreprise),
        adresse: clean(r.Adresse), code_postal: clean(r["Code postal"]), ville: clean(r.Ville),
        telephone: clean(r.Standard || r.Téléphone), date_echeance_hotline: toIsoDate(r["Fin de Hotline"]),
        notes: `Commercial: ${clean(r.Commercial) || "—"} | Mastercam: ${clean(r.Mastercam) || "—"}`,
      };
    }).filter(Boolean) as any[];
    if (!mapped.length) return toast.error("Aucune ligne valide");
    const { error } = await supabase.from("clients").upsert(mapped, { onConflict: "external_ref" });
    if (error) return toast.error(error.message);
    toast.success(`${mapped.length} clients importés (fusion sur le nom)`);
    load(); if (clientsFileRef.current) clientsFileRef.current.value = "";
  };

  const importContacts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const rows = await rowsFromFile(file);
    const { data: cs } = await supabase.from("clients").select("id, external_ref");
    const map = new Map<string, string>(); (cs ?? []).forEach((c: any) => c.external_ref && map.set(c.external_ref, c.id));
    const mapped = rows.map((r) => {
      const ext = norm(r.Client);
      const id = map.get(ext); if (!id) return null;
      const nom = [upperName(r.Nom), titleName(r.Prénom)].filter(Boolean).join(" ");
      if (!nom) return null;
      return {
        client_id: id, nom,
        fonction: clean(r.Fonction || r.Qualité),
        telephone: clean(r["Ligne directe"] || r.Portable || r.Standard),
        email: clean(r["E-mail"]),
      };
    }).filter(Boolean) as any[];
    if (!mapped.length) return toast.error("Aucun contact rattaché à un client connu");
    const { error } = await supabase.from("client_contacts").insert(mapped);
    if (error) return toast.error(error.message);
    toast.success(`${mapped.length} contacts importés`);
    if (contactsFileRef.current) contactsFileRef.current.value = "";
  };

  const importContracts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const rows = await rowsFromFile(file);
    const { data: cs } = await supabase.from("clients").select("id, external_ref");
    const map = new Map<string, string>(); (cs ?? []).forEach((c: any) => c.external_ref && map.set(c.external_ref, c.id));
    const fname = file.name.toLowerCase();
    const type = fname.includes("hotline") ? "hotline" : fname.includes("maintenance") ? "maintenance" : fname.includes("souscription") ? "souscription" : "autre";
    const mapped = rows.map((r) => {
      const nom = clean(r["Nom du Client "] || r["Nom du Client"]); if (!nom) return null;
      const ext = norm(nom);
      return {
        client_id: map.get(ext) || null, client_nom: nom, external_ref: ext,
        numero_commande: clean(r["Numéro de commande"]),
        date_commande: toIsoDate(r["Date Commande"]),
        type_abonnement: type,
        affaire: clean(r.Affaire || r["Type d'abonnement"]),
        date_debut: toIsoDate(r["Date Début"]),
        date_fin: toIsoDate(r["Date Fin"]),
        source_file: file.name,
      };
    }).filter(Boolean) as any[];
    if (!mapped.length) return toast.error("Aucune ligne valide");
    const { error } = await supabase.from("contracts").insert(mapped);
    if (error) return toast.error(error.message);
    toast.success(`${mapped.length} contrats importés (${type})`);
    if (contractsFileRef.current) contractsFileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">{clients.length} clients en base — croisement automatique par nom</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={clientsFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importClients} />
          <Button variant="outline" onClick={() => clientsFileRef.current?.click()}>
            <Users className="w-4 h-4" /> Import Clients
          </Button>
          <input ref={contactsFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importContacts} />
          <Button variant="outline" onClick={() => contactsFileRef.current?.click()}>
            <UserPlus className="w-4 h-4" /> Import Contacts
          </Button>
          <input ref={contractsFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importContracts} />
          <Button variant="outline" onClick={() => contractsFileRef.current?.click()}>
            <FileText className="w-4 h-4" /> Import Contrats
          </Button>
          <Button onClick={() => { setForm(empty); setEditId(null); setOpen(true); }}>
            <Plus className="w-4 h-4" /> Nouveau client
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher entreprise, contact, téléphone…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les contrats</SelectItem>
                {Object.entries(CLIENT_FILTER_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
                  <th className="px-4 py-2 font-medium">Échéance</th>
                  <th className="px-4 py-2 font-medium">Ville</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const s = getContractStatus(c.date_echeance_maintenance ?? c.date_echeance_hotline);
                  const horsContrat = !(HOTLINE_ELIGIBLE_TYPES as readonly string[]).includes(c.contract_type);
                  return (
                    <tr key={c.id} className={"border-b hover:bg-accent/50 cursor-pointer " + (s === "expired" ? "text-destructive font-semibold" : s === "expiring" ? "text-warning" : "")} onClick={() => openDetail(c.id)}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {c.entreprise}
                          {horsContrat && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="w-3 h-3" /> Facturable</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div>{c.contact_nom || "—"}</div>
                        <div className="text-xs text-muted-foreground">{c.telephone}</div>
                      </td>
                      <td className="px-4 py-2"><Badge variant="outline">{contractLabel(c.contract_type)}</Badge></td>
                      <td className="px-4 py-2">
                        {c.date_echeance_hotline ? format(new Date(c.date_echeance_hotline), "dd MMM yyyy", { locale: fr }) : "—"}
                      </td>
                      <td className="px-4 py-2">{c.ville || "—"}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" onClick={() => editClient(c)}><Edit2 className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Aucun client</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground text-center">{filtered.length} client(s) affiché(s) — recherche globale sur toute la base</p>
        </CardContent>
      </Card>

      {/* Édition / création */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(empty); setEditId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Modifier client" : "Nouveau client"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Entreprise *</Label><Input value={form.entreprise} onChange={(e) => setForm({ ...form, entreprise: e.target.value })} /></div>
            <div><Label>Adresse</Label><Input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} /></div>
            <div><Label>Code postal</Label><Input value={form.code_postal} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} /></div>
            <div><Label>Ville</Label><Input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} /></div>
            <div><Label>Téléphone</Label><Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>ID TeamViewer</Label><Input value={form.teamviewer_id} onChange={(e) => setForm({ ...form, teamviewer_id: e.target.value })} /></div>
            <div className="col-span-2"><Label>Type de contrat</Label>
              <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CONTRACT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Échéance maintenance</Label><Input type="date" value={form.date_echeance_maintenance} onChange={(e) => setForm({ ...form, date_echeance_maintenance: e.target.value })} /></div>
            <div><Label>Échéance hotline</Label><Input type="date" value={form.date_echeance_hotline} onChange={(e) => setForm({ ...form, date_echeance_hotline: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <Button onClick={submit} className="w-full">{editId ? "Enregistrer" : "Créer"}</Button>
        </DialogContent>
      </Dialog>

      {/* Vue fiche détaillée */}
      <Dialog open={!!detailId} onOpenChange={(o) => { if (!o) { setDetailId(null); setDetailContacts([]); setDetailContracts([]); } }}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detailClient?.entreprise}</DialogTitle></DialogHeader>
          {detailClient && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Adresse :</span> {[detailClient.adresse, detailClient.code_postal, detailClient.ville].filter(Boolean).join(", ") || "—"}</div>
                <div><span className="text-muted-foreground">Téléphone :</span> {detailClient.telephone || "—"}</div>
                <div><span className="text-muted-foreground">Type de contrat :</span> <Badge variant="outline">{contractLabel(detailClient.contract_type)}</Badge></div>
                <div><span className="text-muted-foreground">TeamViewer :</span> <span className="font-mono">{detailClient.teamviewer_id || "—"}</span></div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Contacts ({detailContacts.length})</h3>
                <div className="space-y-1.5 max-h-60 overflow-auto border rounded-lg p-2">
                  {detailContacts.length === 0 && <p className="text-xs text-muted-foreground p-2">Aucun contact enregistré</p>}
                  {detailContacts.map((ct) => (
                    <div key={ct.id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-accent/40 text-sm">
                      <span className="font-medium">{ct.nom}</span>
                      {ct.fonction && <span className="text-xs text-muted-foreground">— {ct.fonction}</span>}
                      <span className="ml-auto text-xs">{ct.telephone || ct.email || ""}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <Input placeholder="Nom complet" value={newContact.nom} onChange={(e) => setNewContact({ ...newContact, nom: e.target.value })} />
                  <Input placeholder="Fonction" value={newContact.fonction} onChange={(e) => setNewContact({ ...newContact, fonction: e.target.value })} />
                  <Input placeholder="Téléphone" value={newContact.telephone} onChange={(e) => setNewContact({ ...newContact, telephone: e.target.value })} />
                  <Button onClick={addContactInDetail}><Plus className="w-4 h-4" /> Ajouter</Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Historique des contrats ({detailContracts.length})</h3>
                <div className="space-y-1 max-h-60 overflow-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50"><tr>
                      <th className="px-2 py-1 text-left">N° commande</th>
                      <th className="px-2 py-1 text-left">Type</th>
                      <th className="px-2 py-1 text-left">Affaire</th>
                      <th className="px-2 py-1 text-left">Début</th>
                      <th className="px-2 py-1 text-left">Fin</th>
                    </tr></thead>
                    <tbody>
                      {detailContracts.map((ct) => (
                        <tr key={ct.id} className="border-t">
                          <td className="px-2 py-1 font-mono">{ct.numero_commande || "—"}</td>
                          <td className="px-2 py-1"><Badge variant="outline" className="text-[10px]">{ct.type_abonnement}</Badge></td>
                          <td className="px-2 py-1">{ct.affaire || "—"}</td>
                          <td className="px-2 py-1">{ct.date_debut ? format(new Date(ct.date_debut), "dd/MM/yyyy") : "—"}</td>
                          <td className="px-2 py-1">{ct.date_fin ? format(new Date(ct.date_fin), "dd/MM/yyyy") : "—"}</td>
                        </tr>
                      ))}
                      {detailContracts.length === 0 && <tr><td colSpan={5} className="px-2 py-3 text-center text-muted-foreground">Aucun contrat enregistré</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
