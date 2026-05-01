import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, UserPlus } from "lucide-react";
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
};

export default function TicketDialog({ open, onOpenChange, ticketId, defaultScheduledAt, onSaved }: Props) {
  const { technicien } = useTechnician();
  const [clients, setClients] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [ticket, setTicket] = useState<any>(null);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({ nom: "", telephone: "", teamviewer_id: "", fonction: "" });

  const client = useMemo(() => clients.find((c) => c.id === form.client_id), [clients, form.client_id]);
  const contactsForClient = useMemo(
    () => contacts.filter((c) => c.client_id === form.client_id),
    [contacts, form.client_id],
  );

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [c, cc] = await Promise.all([
        supabase.from("clients").select("*").order("entreprise").limit(5000),
        supabase.from("client_contacts").select("*").order("nom").limit(10000),
      ]);
      setClients(c.data ?? []);
      setContacts(cc.data ?? []);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
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
        scheduled_at: data.scheduled_at
          ? format(new Date(data.scheduled_at), "yyyy-MM-dd'T'HH:mm")
          : data.date_ouverture
            ? format(new Date(data.date_ouverture), "yyyy-MM-dd'T'HH:mm")
            : "",
      });
    })();
  }, [open, ticketId, defaultScheduledAt]);

  const chooseClient = (clientId: string) => {
    const c = clients.find((x) => x.id === clientId);
    const cs = contacts.filter((x) => x.client_id === clientId);
    const primary = cs.find((x) => x.is_primary) || cs[0];
    setForm({
      ...form,
      client_id: clientId,
      client_nom: c?.entreprise ?? "",
      contact_id: primary?.id ?? "",
      contact_client: primary?.nom ?? c?.contact_nom ?? "",
      telephone_client: primary?.telephone ?? c?.telephone ?? "",
      teamviewer_id: primary?.teamviewer_id ?? c?.teamviewer_id ?? "",
    });
  };

  const chooseContact = (contactId: string) => {
    const ct = contacts.find((x) => x.id === contactId);
    setForm({
      ...form,
      contact_id: contactId,
      contact_client: ct?.nom ?? "",
      telephone_client: ct?.telephone ?? form.telephone_client,
      teamviewer_id: ct?.teamviewer_id ?? form.teamviewer_id,
    });
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
    chooseContact(data.id);
    setNewContact({ nom: "", telephone: "", teamviewer_id: "", fonction: "" });
    setNewContactOpen(false);
    toast.success("Contact ajouté");
  };

  const save = async () => {
    if (!form.client_id || !form.client_nom) return toast.error("Sélectionnez un client");

    const horsContrat =
      !client ||
      hotlineRight(client.contract_type, client.date_echeance_hotline) !== "OUI";

    const scheduled = form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null;

    // Si le contact a un nouveau TeamViewer, on le mémorise sur le contact
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

  const right = client ? hotlineRight(client.contract_type, client.date_echeance_hotline) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {ticketId ? `Ticket ${ticket?.ticket_number ?? ""}` : "Nouveau ticket"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client */}
          <div>
            <Label>Client</Label>
            <Select value={form.client_id} onValueChange={chooseClient}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.entreprise}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {client && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {right === "OUI" && <Badge className="bg-success text-success-foreground">HOTLINE</Badge>}
                {(client.contract_type === "maintenance" || client.contract_type === "maintenance_hotline") && (
                  <Badge variant="secondary">MAINTENANCE</Badge>
                )}
                {right === "HORS CONTRAT" && <Badge variant="destructive">HORS CONTRAT</Badge>}
                {client.date_echeance_hotline && (
                  <span className="text-xs text-muted-foreground">
                    Hotline jusqu'au {format(new Date(client.date_echeance_hotline), "dd MMM yyyy", { locale: fr })}
                  </span>
                )}
                {client.date_echeance_maintenance && (
                  <span className="text-xs text-muted-foreground">
                    • Maintenance jusqu'au {format(new Date(client.date_echeance_maintenance), "dd MMM yyyy", { locale: fr })}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Contact */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Contact</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setNewContactOpen((o) => !o)}
                disabled={!form.client_id}
              >
                <UserPlus className="w-3 h-3" /> Nouveau contact
              </Button>
            </div>
            <Select value={form.contact_id} onValueChange={chooseContact} disabled={!form.client_id}>
              <SelectTrigger><SelectValue placeholder="Choisir un contact..." /></SelectTrigger>
              <SelectContent>
                {contactsForClient.map((ct) => (
                  <SelectItem key={ct.id} value={ct.id}>
                    {ct.nom}{ct.fonction ? ` — ${ct.fonction}` : ""}
                  </SelectItem>
                ))}
                {contactsForClient.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Aucun contact enregistré</div>
                )}
              </SelectContent>
            </Select>

            {newContactOpen && (
              <div className="mt-2 p-3 border rounded-lg bg-accent/30 grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Nom *</Label>
                  <Input value={newContact.nom} onChange={(e) => setNewContact({ ...newContact, nom: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Fonction</Label>
                  <Input value={newContact.fonction} onChange={(e) => setNewContact({ ...newContact, fonction: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Téléphone</Label>
                  <Input value={newContact.telephone} onChange={(e) => setNewContact({ ...newContact, telephone: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">ID TeamViewer</Label>
                  <Input value={newContact.teamviewer_id} onChange={(e) => setNewContact({ ...newContact, teamviewer_id: e.target.value })} />
                </div>
                <div className="col-span-2 flex gap-2">
                  <Button size="sm" onClick={createContact}><Plus className="w-3 h-3" /> Ajouter</Button>
                  <Button size="sm" variant="ghost" onClick={() => setNewContactOpen(false)}>Annuler</Button>
                </div>
              </div>
            )}
          </div>

          {/* Coordonnées */}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Téléphone</Label><Input value={form.telephone_client} onChange={(e) => setForm({ ...form, telephone_client: e.target.value })} /></div>
            <div>
              <Label>ID TeamViewer</Label>
              <div className="flex gap-2">
                <Input className="font-mono" value={form.teamviewer_id} onChange={(e) => setForm({ ...form, teamviewer_id: e.target.value })} />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => launchTeamViewer(form.teamviewer_id, form.teamviewer_password)}
                  title={form.teamviewer_id && form.teamviewer_password ? "Connexion auto" : "Ouvrir TeamViewer"}
                >
                  <img src={tvLogo} alt="TeamViewer" className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div><Label>MDP TeamViewer</Label><Input value={form.teamviewer_password} onChange={(e) => setForm({ ...form, teamviewer_password: e.target.value })} /></div>
            <div>
              <Label>Planifier (calendrier)</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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

          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Compte rendu</Label><Textarea rows={3} value={form.compte_rendu} onChange={(e) => setForm({ ...form, compte_rendu: e.target.value })} /></div>

          {/* Aperçu format de sortie FICAM */}
          {form.client_nom && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap">
{`Client : ${form.client_nom} | Contact : ${form.contact_client || "—"}
N° Ticket : ${ticket?.ticket_number ?? "(à générer)"} | Tél : ${form.telephone_client || "—"}
Motif : ${MOTIFS[form.motif as Motif]} | Droit Hot-line : ${right ?? "—"}
Technicien : ${technicianInitials(ticket?.technicien ?? technicien)} | TV : ${form.teamviewer_id || "—"} | MDP : ${form.teamviewer_password || ""}
Durée : ${ticket?.heure_debut_effectif ? format(new Date(ticket.heure_debut_effectif), "HH:mm") : "—"} / ${ticket?.heure_fin_effectif ? format(new Date(ticket.heure_fin_effectif), "HH:mm") : "—"}
Compte rendu : ${form.compte_rendu || ""}`}
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
