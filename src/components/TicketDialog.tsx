import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, UserPlus, Search, Paperclip, Trash2, Lightbulb, AlertTriangle, Mail, Pencil } from "lucide-react";
import { toast } from "sonner";
import { MOTIFS, PRIORITES, STATUTS, STATUT_COLORS, Motif, Priorite, Statut } from "@/lib/constants";
import { hotlineRight, technicianInitials, launchTeamViewer, formatTicketBlock } from "@/lib/ficam";
import { useTechnician } from "@/hooks/useTechnician";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import tvLogo from "@/assets/teamviewer.png";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticketId?: string | null;
  defaultScheduledAt?: string | null;
  onSaved?: () => void;
};

const emptyForm = {
  client_id: "",
  client_nom: "",
  contact_id: "",
  contact_client: "",
  telephone_client: "",
  teamviewer_id: "",
  teamviewer_password: "",
  motif: "autre" as Motif,
  motif_detail: "",
  priorite: "basse" as Priorite,
  statut: "ouvert" as Statut,
  description: "",
  compte_rendu: "",
  scheduled_at: "",
  hotline_override: "" as "" | "OUI" | "NON",
};

export default function TicketDialog({ open, onOpenChange, ticketId, defaultScheduledAt, onSaved }: Props) {
  const { technicien } = useTechnician();
  const [client, setClient] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [ticket, setTicket] = useState<any>(null);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({ nom: "", telephone: "", teamviewer_id: "", fonction: "" });
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [editContact, setEditContact] = useState({ telephone: "", teamviewer_id: "" });
  const [savingContact, setSavingContact] = useState(false);
  const [recurrence, setRecurrence] = useState<{ count: number; motifLabel: string } | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // === Recherche client globale (combobox autonome) ===
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const q = clientSearch.trim();
      if (!q) { setClientResults([]); return; }
      const { data } = await supabase
        .from("clients")
        .select("id, entreprise, contact_nom, telephone, contract_type, date_echeance_hotline, date_echeance_maintenance, teamviewer_id, ville")
        .ilike("entreprise", `%${q}%`)
        .order("entreprise")
        .limit(200);
      setClientResults(data ?? []);
    }, 150);
    return () => clearTimeout(t);
  }, [clientSearch, open]);

  const loadContacts = async (clientId: string) => {
    const { data } = await supabase.from("client_contacts").select("*").eq("client_id", clientId).order("nom");
    setContacts(data ?? []);
    return data ?? [];
  };

  const loadAttachments = async (id: string) => {
    const { data } = await supabase.from("ticket_attachments").select("*").eq("ticket_id", id).order("created_at");
    setAttachments(data ?? []);
  };

  useEffect(() => {
    if (!open) {
      setClient(null); setContacts([]); setClientSearch(""); setClientResults([]);
      setAttachments([]); setRecurrence(null); setForm(emptyForm);
      return;
    }
    if (!ticketId) {
      setTicket(null);
      setForm({
        ...emptyForm,
        scheduled_at: defaultScheduledAt
          ? format(new Date(defaultScheduledAt), "yyyy-MM-dd'T'HH:mm")
          : "",
      });
      return;
    }
    (async () => {
      const { data } = await supabase.from("tickets").select("*").eq("id", ticketId).maybeSingle();
      if (!data) return;
      setTicket(data);
      setForm({
        client_id: data.client_id ?? "",
        client_nom: data.client_nom ?? "",
        contact_id: data.contact_id ?? "",
        contact_client: data.contact_client ?? "",
        telephone_client: data.telephone_client ?? "",
        teamviewer_id: data.teamviewer_id ?? "",
        teamviewer_password: data.teamviewer_password ?? "",
        motif: data.motif,
        motif_detail: data.motif_detail ?? "",
        priorite: data.priorite,
        statut: data.statut,
        description: data.description ?? "",
        compte_rendu: data.compte_rendu ?? "",
        hotline_override: data.hotline_override ?? "",
        scheduled_at: data.scheduled_at
          ? format(new Date(data.scheduled_at), "yyyy-MM-dd'T'HH:mm")
          : data.date_ouverture
            ? format(new Date(data.date_ouverture), "yyyy-MM-dd'T'HH:mm")
            : "",
      });
      if (data.client_id) {
        const { data: cl } = await supabase.from("clients").select("*").eq("id", data.client_id).maybeSingle();
        setClient(cl);
        setClientSearch(cl?.entreprise ?? "");
        await loadContacts(data.client_id);
      }
      await loadAttachments(data.id);
    })();
  }, [open, ticketId, defaultScheduledAt]);

  const chooseClient = async (c: any) => {
    setClient(c);
    setClientSearch(c.entreprise);
    setShowResults(false);
    const cs = await loadContacts(c.id);
    const primary = cs.find((x: any) => x.is_primary) || cs[0];
    setForm((f: any) => ({
      ...f,
      client_id: c.id,
      client_nom: c.entreprise,
      contact_id: primary?.id ?? "",
      contact_client: primary?.nom ?? c.contact_nom ?? "",
      telephone_client: primary?.telephone ?? c.telephone ?? "",
      teamviewer_id: primary?.teamviewer_id ?? c.teamviewer_id ?? "",
    }));
  };

  const chooseContact = (contactId: string) => {
    const ct = contacts.find((x) => x.id === contactId);
    if (!ct) return;
    setForm((f: any) => ({
      ...f,
      contact_id: contactId,
      contact_client: ct.nom,
      telephone_client: ct.telephone || f.telephone_client,
      teamviewer_id: ct.teamviewer_id || f.teamviewer_id,
    }));
  };

  const createContact = async () => {
    if (!form.client_id) return toast.error("Sélectionnez d'abord un client");
    if (!newContact.nom.trim()) return toast.error("Nom du contact requis");
    const { data, error } = await supabase
      .from("client_contacts")
      .insert({
        client_id: form.client_id,
        nom: newContact.nom.trim(),
        telephone: newContact.telephone || null,
        teamviewer_id: newContact.teamviewer_id || null,
        fonction: newContact.fonction || null,
        is_primary: false,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setContacts([...contacts, data]);
    // Sélection automatique + injection téléphone & ID TeamViewer dans le ticket
    setForm((f: any) => ({
      ...f,
      contact_id: data.id,
      contact_client: data.nom,
      telephone_client: data.telephone || f.telephone_client,
      teamviewer_id: data.teamviewer_id || f.teamviewer_id,
    }));
    setNewContact({ nom: "", telephone: "", teamviewer_id: "", fonction: "" });
    setNewContactOpen(false);
    toast.success("Contact créé et sélectionné");
  };

  // === Détection récurrence client + même motif (4-5 sur le mois) ===
  useEffect(() => {
    if (!form.client_id || !form.motif) { setRecurrence(null); return; }
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("client_id", form.client_id)
        .eq("motif", form.motif)
        .gte("date_ouverture", since.toISOString());
      if (count && count >= 4) {
        setRecurrence({ count, motifLabel: MOTIFS[form.motif as Motif] ?? form.motif });
      } else setRecurrence(null);
    })();
  }, [form.client_id, form.motif]);

  // === Upload pièces jointes ===
  const uploadFiles = async (files: FileList) => {
    let ticketRowId = ticketId;
    if (!ticketRowId) {
      toast.message("Enregistrez le ticket avant d'ajouter des pièces jointes");
      return;
    }
    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) { toast.error(`${file.name} > 25 Mo`); continue; }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${ticketRowId}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage.from("ticket-attachments").upload(path, file);
      if (upErr) { toast.error(`Upload échoué : ${file.name}`); continue; }
      await supabase.from("ticket_attachments").insert({
        ticket_id: ticketRowId, file_path: path, file_name: file.name,
        file_size: file.size, file_type: file.type, uploaded_by: technicien!,
      });
    }
    await loadAttachments(ticketRowId);
    toast.success("Pièces jointes ajoutées");
  };

  const removeAttachment = async (a: any) => {
    await supabase.storage.from("ticket-attachments").remove([a.file_path]);
    await supabase.from("ticket_attachments").delete().eq("id", a.id);
    if (ticketId) loadAttachments(ticketId);
  };

  const fileUrl = (p: string) => supabase.storage.from("ticket-attachments").getPublicUrl(p).data.publicUrl;

  const save = async () => {
    if (!form.client_id || !form.client_nom) return toast.error("Sélectionnez un client");

    const auto = hotlineRight(client?.contract_type, client?.date_echeance_hotline);
    const finalRight = form.hotline_override || auto;
    const horsContrat = finalRight !== "OUI";

    const scheduled = form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null;

    if (form.contact_id && form.teamviewer_id) {
      const ct = contacts.find((x) => x.id === form.contact_id);
      if (ct && ct.teamviewer_id !== form.teamviewer_id) {
        await supabase.from("client_contacts").update({ teamviewer_id: form.teamviewer_id }).eq("id", ct.id);
      }
    }

    const payload: any = {
      client_id: form.client_id,
      client_nom: form.client_nom,
      contact_id: form.contact_id || null,
      contact_client: form.contact_client || null,
      telephone_client: form.telephone_client || null,
      teamviewer_id: form.teamviewer_id || null,
      teamviewer_password: form.teamviewer_password || null,
      motif: form.motif,
      motif_detail: form.motif_detail || null,
      priorite: form.priorite,
      statut: form.statut,
      description: form.description || null,
      compte_rendu: form.compte_rendu || null,
      scheduled_at: scheduled,
      hors_contrat: horsContrat,
      hotline_override: form.hotline_override || null,
    };

    let res;
    if (ticketId) {
      res = await supabase.from("tickets").update(payload).eq("id", ticketId);
    } else {
      res = await supabase.from("tickets").insert({
        ...payload,
        technicien: technicien!,
        heure_debut_effectif: scheduled ?? new Date().toISOString(),
      });
    }
    if (res.error) return toast.error(res.error.message);
    toast.success(ticketId ? "Ticket mis à jour" : "Ticket créé");
    onOpenChange(false);
    onSaved?.();
  };

  const auto = client ? hotlineRight(client.contract_type, client.date_echeance_hotline) : null;
  const right = form.hotline_override || auto;

  const motifLabel = (MOTIFS as any)[form.motif] ?? form.motif;
  const showFormation = /aide/i.test(motifLabel);
  const showInterventionPP = /modification pp/i.test(motifLabel);

  const mailtoRecurrence = () => {
    const subject = encodeURIComponent(`Récurrence client ${form.client_nom} — ${recurrence?.motifLabel}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nLe client ${form.client_nom} a ouvert ${recurrence?.count} tickets sur les 30 derniers jours pour le motif "${recurrence?.motifLabel}".\n\nIl serait pertinent de proposer une formation ou intervention PP.\n\nCordialement,\n${technicien ?? ""}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ticketId ? `Ticket ${ticket?.ticket_number ?? ""}` : "Nouveau ticket"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client — recherche globale */}
          <div>
            <Label>Client (recherche dans toute la base)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Tapez le nom (ex: Sofrapi)…"
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
              />
              {showResults && clientResults.length > 0 && (
                <div className="absolute z-30 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-72 overflow-auto">
                  {clientResults.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => chooseClient(c)}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between items-center"
                    >
                      <span className="font-medium">{c.entreprise}</span>
                      <span className="text-xs text-muted-foreground">{c.ville || ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {client && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {auto === "OUI" && <Badge className="bg-success text-success-foreground">HOTLINE</Badge>}
                {(client.contract_type === "maintenance" || client.contract_type === "maintenance_hotline") && (
                  <Badge variant="secondary">MAINTENANCE</Badge>
                )}
                {auto === "HORS CONTRAT" && <Badge variant="destructive">HORS CONTRAT</Badge>}
                {client.date_echeance_hotline && (
                  <span className="text-xs text-muted-foreground">
                    Hotline jusqu'au {format(new Date(client.date_echeance_hotline), "dd MMM yyyy", { locale: fr })}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Contact */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Contact</Label>
              <Button type="button" size="sm" variant="ghost"
                onClick={() => setNewContactOpen((o) => !o)} disabled={!form.client_id}>
                <UserPlus className="w-3 h-3" /> Nouveau contact
              </Button>
            </div>
            <Select value={form.contact_id} onValueChange={chooseContact} disabled={!form.client_id}>
              <SelectTrigger><SelectValue placeholder="Choisir un contact..." /></SelectTrigger>
              <SelectContent>
                {contacts.map((ct) => (
                  <SelectItem key={ct.id} value={ct.id}>
                    {ct.nom}{ct.fonction ? ` — ${ct.fonction}` : ""}
                  </SelectItem>
                ))}
                {contacts.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">Aucun contact enregistré</div>}
              </SelectContent>
            </Select>

            {newContactOpen && (
              <div className="mt-2 p-3 border rounded-lg bg-accent/30 grid grid-cols-2 gap-2">
                <div className="col-span-2"><Label className="text-xs">Nom *</Label>
                  <Input value={newContact.nom} onChange={(e) => setNewContact({ ...newContact, nom: e.target.value })} />
                </div>
                <div><Label className="text-xs">Fonction</Label>
                  <Input value={newContact.fonction} onChange={(e) => setNewContact({ ...newContact, fonction: e.target.value })} />
                </div>
                <div><Label className="text-xs">Téléphone</Label>
                  <Input value={newContact.telephone} onChange={(e) => setNewContact({ ...newContact, telephone: e.target.value })} />
                </div>
                <div className="col-span-2"><Label className="text-xs">ID TeamViewer</Label>
                  <Input value={newContact.teamviewer_id} onChange={(e) => setNewContact({ ...newContact, teamviewer_id: e.target.value })} />
                </div>
                <div className="col-span-2 flex gap-2">
                  <Button size="sm" onClick={createContact}><Plus className="w-3 h-3" /> Créer & Sélectionner</Button>
                  <Button size="sm" variant="ghost" onClick={() => setNewContactOpen(false)}>Annuler</Button>
                </div>
              </div>
            )}
          </div>

          {/* Coordonnées */}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Téléphone</Label>
              <Input value={form.telephone_client} onChange={(e) => setForm({ ...form, telephone_client: e.target.value })} /></div>
            <div>
              <Label>ID TeamViewer</Label>
              <div className="flex gap-2">
                <Input className="font-mono" value={form.teamviewer_id} onChange={(e) => setForm({ ...form, teamviewer_id: e.target.value })} />
                <Button type="button" size="icon" variant="outline"
                  onClick={() => launchTeamViewer(form.teamviewer_id, form.teamviewer_password)}
                  title={form.teamviewer_id && form.teamviewer_password ? "Connexion auto" : "Ouvrir TeamViewer"}>
                  <img src={tvLogo} alt="TeamViewer" className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div><Label>MDP TeamViewer</Label>
              <Input value={form.teamviewer_password} onChange={(e) => setForm({ ...form, teamviewer_password: e.target.value })} /></div>
            <div><Label>Planifier (calendrier)</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
          </div>

          {/* Motif / priorité / statut */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Motif</Label>
              <Select value={form.motif} onValueChange={(v) => setForm({ ...form, motif: v as Motif })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MOTIFS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorité</Label>
              <Select value={form.priorite} onValueChange={(v) => setForm({ ...form, priorite: v as Priorite })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v as Statut })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUTS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUT_COLORS[k]?.bg }} />
                        {v}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Droit Hotline auto + override manuel */}
          <div className="grid grid-cols-3 gap-3 items-end">
            <div className="col-span-1">
              <Label>Droit Hotline (auto)</Label>
              <div className="h-10 px-3 flex items-center rounded-md border bg-muted/30 text-sm">
                {auto ?? "—"}
              </div>
            </div>
            <div className="col-span-2">
              <Label>Forçage manuel</Label>
              <Select value={form.hotline_override || "auto"}
                onValueChange={(v) => setForm({ ...form, hotline_override: v === "auto" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatique ({auto ?? "—"})</SelectItem>
                  <SelectItem value="OUI">Forcer OUI</SelectItem>
                  <SelectItem value="NON">Forcer NON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Suggestions commerciales */}
          {(showFormation || showInterventionPP) && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              <span>Suggestion : {showFormation ? "Proposer une formation" : "Proposer une intervention PP"}</span>
            </div>
          )}

          {/* Alerte récurrence */}
          {recurrence && (
            <div className="rounded-lg border border-warning bg-warning/10 p-3 text-sm flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <div className="flex-1">
                <strong>Récurrence détectée :</strong> {recurrence.count} tickets sur 30 jours pour "{recurrence.motifLabel}".
              </div>
              <Button size="sm" variant="outline" onClick={mailtoRecurrence}>
                <Mail className="w-3 h-3" /> Mailto Outlook
              </Button>
            </div>
          )}

          <div><Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Compte rendu</Label>
            <Textarea rows={3} value={form.compte_rendu} onChange={(e) => setForm({ ...form, compte_rendu: e.target.value })} /></div>

          {/* Pièces jointes */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Pièces jointes (.msg, .zip, post-pro, images, PDF)</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={!ticketId}>
                <Paperclip className="w-3 h-3" /> Ajouter
              </Button>
              <input
                ref={fileRef} type="file" multiple className="hidden"
                accept=".msg,.zip,.pdf,image/*,.txt,.pst,.nc,.tap,.h,.cnc,.mcam,.mcx,.eia,.ppr,.pst"
                onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }}
              />
            </div>
            {!ticketId && <p className="text-xs text-muted-foreground mt-1">Enregistrez d'abord le ticket pour activer les pièces jointes.</p>}
            {attachments.length > 0 && (
              <div className="mt-2 border rounded-lg divide-y">
                {attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                    <a href={fileUrl(a.file_path)} target="_blank" rel="noreferrer" className="flex-1 truncate hover:underline">
                      {a.file_name}
                    </a>
                    <span className="text-xs text-muted-foreground">{a.file_size ? `${(a.file_size / 1024).toFixed(0)} Ko` : ""}</span>
                    <Button size="icon" variant="ghost" onClick={() => removeAttachment(a)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Aperçu format de sortie FICAM */}
          {form.client_nom && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap">
{formatTicketBlock(
  {
    ticket_number: ticket?.ticket_number,
    client_nom: form.client_nom,
    contact_client: form.contact_client,
    telephone_client: form.telephone_client,
    motif: form.motif,
    technicien: ticket?.technicien ?? technicien ?? "",
    teamviewer_id: form.teamviewer_id,
    teamviewer_password: form.teamviewer_password,
    compte_rendu: form.compte_rendu,
    description: form.description,
    date_ouverture: ticket?.date_ouverture,
    heure_debut_effectif: ticket?.heure_debut_effectif,
    heure_fin_effectif: ticket?.heure_fin_effectif,
  } as any,
  client ? { ...client, contract_type: form.hotline_override === "OUI" ? "hotline" : form.hotline_override === "NON" ? "hors_contrat" : client.contract_type } : null,
)}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={save}>{ticketId ? "Enregistrer" : "Créer le ticket"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
