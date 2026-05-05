import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { MOTIFS, PRIORITES, STATUTS, STATUT_COLORS, Motif, Priorite, Statut } from "@/lib/constants";
import { hotlineRight, technicianInitials, launchTeamViewer, formatTicketBlock, normalizeContactName, cleanText } from "@/lib/ficam";
import { useTechnician } from "@/hooks/useTechnician";
import { cn } from "@/lib/utils";
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
  hotline_override: "" as "" | "OUI" | "NON" | "HORS CONTRAT",
};

export default function TicketDialog({ open, onOpenChange, ticketId, defaultScheduledAt, onSaved }: Props) {
  const { technicien } = useTechnician();
  const [clients, setClients] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [ticket, setTicket] = useState<any>(null);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({ nom: "", telephone: "", teamviewer_id: "", fonction: "" });
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);

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
        supabase.from("client_contacts").select("*").order("nom").limit(20000),
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
        hotline_override: (data as any).hotline_override ?? "",
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
    setClientPickerOpen(false);
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
    setContactPickerOpen(false);
  };

  const createContact = async () => {
    if (!form.client_id) return toast.error("Sélectionnez d'abord un client existant pour créer un contact persistant");
    const nom = normalizeContactName(newContact.nom);
    if (!nom) return toast.error("Nom du contact requis");
    const { data, error } = await supabase
      .from("client_contacts")
      .insert({
        client_id: form.client_id,
        nom,
        telephone: cleanText(newContact.telephone) || null,
        teamviewer_id: cleanText(newContact.teamviewer_id) || null,
        fonction: cleanText(newContact.fonction) || null,
        is_primary: false,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setContacts([...contacts, data]);
    chooseContact(data.id);
    setNewContact({ nom: "", telephone: "", teamviewer_id: "", fonction: "" });
    setNewContactOpen(false);
    toast.success(`Contact "${nom}" enregistré dans la base`);
  };

  const persistAdHocContact = async () => {
    // Si un nom de contact a été tapé manuellement (pas via la liste) et qu'un client existe en base,
    // on le persiste pour les futurs tickets.
    const nom = normalizeContactName(form.contact_client);
    if (!nom || !form.client_id) return null;
    const exists = contactsForClient.find((c) => c.nom.toLowerCase() === nom.toLowerCase());
    if (exists) return exists.id;
    const { data, error } = await supabase
      .from("client_contacts")
      .insert({
        client_id: form.client_id,
        nom,
        telephone: cleanText(form.telephone_client) || null,
        teamviewer_id: cleanText(form.teamviewer_id) || null,
        is_primary: false,
      })
      .select()
      .single();
    if (error) {
      console.warn("persist contact failed", error);
      return null;
    }
    setContacts([...contacts, data]);
    return data.id;
  };

  const save = async () => {
    if (!form.client_nom?.trim()) return toast.error("Saisissez un nom de client");

    // Calcul du droit hotline final (override prioritaire)
    const calcDroit = client
      ? hotlineRight(client.contract_type, client.date_echeance_hotline, client.date_echeance_maintenance)
      : "HORS CONTRAT";
    const droitFinal = form.hotline_override || calcDroit;
    const horsContrat = droitFinal !== "OUI";

    const scheduled = form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null;

    // Mémorise un nouveau TV sur le contact existant
    if (form.contact_id && form.teamviewer_id) {
      const ct = contacts.find((x) => x.id === form.contact_id);
      if (ct && ct.teamviewer_id !== form.teamviewer_id) {
        await supabase.from("client_contacts").update({ teamviewer_id: form.teamviewer_id }).eq("id", ct.id);
      }
    }

    // Persiste un contact saisi à la volée
    let contactId = form.contact_id || null;
    if (!contactId && form.contact_client) {
      contactId = await persistAdHocContact();
    }

    const payload: any = {
      client_id: form.client_id || null,
      client_nom: cleanText(form.client_nom),
      contact_id: contactId,
      contact_client: normalizeContactName(form.contact_client) || null,
      telephone_client: cleanText(form.telephone_client) || null,
      teamviewer_id: cleanText(form.teamviewer_id) || null,
      teamviewer_password: form.teamviewer_password || null,
      motif: form.motif,
      motif_detail: cleanText(form.motif_detail) || null,
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

  const calcDroit = client
    ? hotlineRight(client.contract_type, client.date_echeance_hotline, client.date_echeance_maintenance)
    : "HORS CONTRAT";
  const droitAffiche = form.hotline_override || calcDroit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {ticketId ? `Ticket ${ticket?.ticket_number ?? ""}` : "Nouveau ticket"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client : recherche + saisie libre */}
          <div>
            <Label>Client</Label>
            <div className="flex gap-2">
              <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="flex-1 justify-between">
                    {form.client_nom || "Rechercher un client..."}
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[420px]" align="start">
                  <Command>
                    <CommandInput placeholder="Tapez le nom du client..." />
                    <CommandList>
                      <CommandEmpty>Aucun client trouvé. Vous pouvez saisir un nom libre ci-dessous.</CommandEmpty>
                      <CommandGroup>
                        {clients.slice(0, 200).map((c) => (
                          <CommandItem key={c.id} value={c.entreprise} onSelect={() => chooseClient(c.id)}>
                            <Check className={cn("mr-2 h-4 w-4", form.client_id === c.id ? "opacity-100" : "opacity-0")} />
                            {c.entreprise}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Input
              className="mt-2"
              placeholder="Nom du client (modifiable)"
              value={form.client_nom}
              onChange={(e) => setForm({ ...form, client_nom: e.target.value })}
            />
            {client && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {droitAffiche === "OUI" && <Badge className="bg-success text-success-foreground">HOTLINE OUI</Badge>}
                {droitAffiche === "NON" && <Badge variant="secondary">HOTLINE NON</Badge>}
                {droitAffiche === "HORS CONTRAT" && <Badge variant="destructive">HORS CONTRAT</Badge>}
                {form.hotline_override && <Badge variant="outline">Forcé manuellement</Badge>}
                {(client.contract_type === "maintenance" || client.contract_type === "maintenance_hotline") && (
                  <Badge variant="secondary">MAINTENANCE</Badge>
                )}
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
            <div className="flex gap-2">
              <Popover open={contactPickerOpen} onOpenChange={setContactPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="flex-1 justify-between" disabled={!form.client_id}>
                    {form.contact_client || "Choisir un contact..."}
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[420px]" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un contact..." />
                    <CommandList>
                      <CommandEmpty>Aucun contact. Tapez un nom dans le champ ci-dessous, il sera enregistré.</CommandEmpty>
                      <CommandGroup>
                        {contactsForClient.map((ct) => (
                          <CommandItem key={ct.id} value={ct.nom} onSelect={() => chooseContact(ct.id)}>
                            <Check className={cn("mr-2 h-4 w-4", form.contact_id === ct.id ? "opacity-100" : "opacity-0")} />
                            {ct.nom}{ct.fonction ? ` — ${ct.fonction}` : ""}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Input
              className="mt-2"
              placeholder="Nom du contact (sera enregistré automatiquement)"
              value={form.contact_client}
              onChange={(e) => setForm({ ...form, contact_client: e.target.value, contact_id: "" })}
            />

            {newContactOpen && (
              <div className="mt-2 p-3 border rounded-lg bg-accent/30 grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Nom *</Label>
                  <Input value={newContact.nom} onChange={(e) => setNewContact({ ...newContact, nom: e.target.value })} placeholder="ex: jean dupont → Jean DUPONT" />
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
                  <Button size="sm" onClick={createContact}><Plus className="w-3 h-3" /> Enregistrer dans la base</Button>
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

          {/* Droit Hotline : auto + override */}
          <div>
            <Label>Droit Hot-line</Label>
            <Select
              value={form.hotline_override || "auto"}
              onValueChange={(v) => setForm({ ...form, hotline_override: v === "auto" ? "" : v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto ({calcDroit})</SelectItem>
                <SelectItem value="OUI">Forcer OUI</SelectItem>
                <SelectItem value="NON">Forcer NON</SelectItem>
                <SelectItem value="HORS CONTRAT">Forcer HORS CONTRAT</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Auto = calculé depuis le contrat client. Choisir une valeur pour forcer manuellement.
            </p>
          </div>

          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Compte rendu</Label><Textarea rows={3} value={form.compte_rendu} onChange={(e) => setForm({ ...form, compte_rendu: e.target.value })} /></div>

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
    hotline_override: form.hotline_override,
  } as any,
  client,
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
