import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, Plus, RefreshCw, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useTechnician } from "@/hooks/useTechnician";
import { MOTIFS, Motif, Priorite } from "@/lib/constants";
import { technicianInitials } from "@/lib/ficam";

export default function CalendarSim() {
  const { technicien } = useTechnician();
  const [events, setEvents] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_id: "", motif: "autre" as Motif, priorite: "basse" as Priorite, description: "" });

  const load = async () => {
    const [e, c] = await Promise.all([
      supabase.from("calendar_events_simulated").select("*").order("start_at", { ascending: false }).limit(200),
      supabase.from("clients").select("id, entreprise, contact_nom, telephone").order("entreprise").limit(5000),
    ]);
    setEvents(e.data ?? []);
    setClients(c.data ?? []);
  };

  useEffect(() => { load(); }, []);

  const importAsTicket = async () => {
    const client = clients.find((c) => c.id === form.client_id);
    if (!client) return toast.error("Sélectionnez un client");
    const { data: ticket, error } = await supabase.from("tickets").insert({
      client_id: client.id,
      client_nom: client.entreprise,
      contact_client: client.contact_nom,
      telephone_client: client.telephone,
      motif: form.motif,
      priorite: form.priorite,
      description: form.description || "Ticket importé depuis le calendrier simulé",
      technicien: technicien!,
      statut: "ouvert",
    }).select().single();
    if (error) return toast.error(error.message);

    await supabase.from("calendar_events_simulated").insert({
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      title: `[${client.entreprise.toUpperCase()}]`,
      location: technicianInitials(technicien),
      body: form.description || "Événement simulé importé comme ticket.",
      technician: technicien,
      direction: "calendar_to_app",
      start_at: new Date().toISOString(),
      end_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    toast.success("Événement simulé importé comme ticket");
    setOpen(false);
    setForm({ client_id: "", motif: "autre", priorite: "basse", description: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendrier simulé</h1>
          <p className="text-muted-foreground">Prévisualisation de la future synchronisation Exchange hot-line@ficam.com</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /> Rafraîchir</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4" /> Simuler Outlook → App</Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>Créer un événement Outlook simulé</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Client</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.entreprise}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Motif</Label>
                  <Select value={form.motif} onValueChange={(v) => setForm({ ...form, motif: v as Motif })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(MOTIFS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Note calendrier</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <Button onClick={importAsTicket} className="w-full">Importer comme ticket</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5" /> Événements simulés</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="border rounded-lg p-4 hover:bg-accent/30">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={event.direction === "calendar_to_app" ? "secondary" : "outline"}>
                      {event.direction === "calendar_to_app" ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                      {event.direction === "calendar_to_app" ? "Outlook → App" : "App → Outlook"}
                    </Badge>
                    <span className="font-semibold">{event.title}</span>
                    {event.ticket_number && <span className="text-xs font-mono text-muted-foreground">{event.ticket_number}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(event.start_at), "dd MMM yyyy HH:mm", { locale: fr })} • Lieu : {event.location || "—"}
                  </div>
                </div>
                <Badge>{event.status}</Badge>
              </div>
              {event.body && <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-3 text-xs leading-relaxed overflow-auto max-h-72">{event.body}</pre>}
            </div>
          ))}
          {events.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun événement simulé pour le moment.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
