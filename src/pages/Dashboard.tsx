import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, AlertTriangle, Clock, TrendingUp, Users } from "lucide-react";
import { getContractStatus, formatSeconds } from "@/lib/contractStatus";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MOTIFS, PRIORITES, STATUTS } from "@/lib/constants";

export default function Dashboard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [t, c] = await Promise.all([
        supabase.from("tickets").select("*").order("date_ouverture", { ascending: false }).limit(500),
        supabase.from("clients").select("*").limit(2000),
      ]);
      setTickets(t.data ?? []);
      setClients(c.data ?? []);
    })();
  }, []);

  const today = new Date(); today.setHours(0,0,0,0);
  const ticketsToday = tickets.filter((t) => new Date(t.date_ouverture) >= today);
  const ticketsOuverts = tickets.filter((t) => !["resolu", "ferme"].includes(t.statut));
  const tempsTotal = tickets.reduce((acc, t) => acc + (t.duree_secondes ?? 0), 0);

  const expiringClients = clients.filter((c) => {
    const s = getContractStatus(c.date_echeance_maintenance);
    return s === "expired" || s === "expiring";
  });

  // Alertes commerciales : >3 appels même motif ce mois
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const ticketsMois = tickets.filter((t) => new Date(t.date_ouverture) >= monthStart);
  const counter = new Map<string, { count: number; client: string; client_id: string; motif: string }>();
  ticketsMois.forEach((t) => {
    const key = `${t.client_id}__${t.motif}`;
    const cur = counter.get(key);
    if (cur) cur.count++;
    else counter.set(key, { count: 1, client: t.client_nom, client_id: t.client_id, motif: t.motif });
  });
  const alertesCo = Array.from(counter.values()).filter((v) => v.count > 3);

  const stats = [
    { label: "Tickets aujourd'hui", value: ticketsToday.length, icon: Ticket, color: "bg-primary" },
    { label: "Tickets ouverts", value: ticketsOuverts.length, icon: Clock, color: "bg-warning" },
    { label: "Temps total cumulé", value: formatSeconds(tempsTotal), icon: TrendingUp, color: "bg-success" },
    { label: "Clients", value: clients.length, icon: Users, color: "bg-accent-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de l'activité hotline</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                  <div className="text-2xl font-bold mt-1">{s.value}</div>
                </div>
                <div className={`w-10 h-10 rounded-lg ${s.color} text-primary-foreground flex items-center justify-center`}>
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Alertes contrats
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun contrat à surveiller.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto">
                {expiringClients.slice(0, 30).map((c) => {
                  const s = getContractStatus(c.date_echeance_maintenance);
                  return (
                    <Link key={c.id} to="/clients" className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent">
                      <div>
                        <div className="font-medium text-sm">{c.entreprise}</div>
                        <div className="text-xs text-muted-foreground">
                          Échéance : {c.date_echeance_maintenance && format(new Date(c.date_echeance_maintenance), "dd MMM yyyy", { locale: fr })}
                        </div>
                      </div>
                      <Badge variant={s === "expired" ? "destructive" : "secondary"} className={s === "expiring" ? "bg-warning text-warning-foreground" : ""}>
                        {s === "expired" ? "Expiré" : "< 30 jours"}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Alertes commerciales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertesCo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune alerte ce mois-ci.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto">
                {alertesCo.map((a) => {
                  const sugg = a.motif === "aide_programmation" ? "→ Suggérer Formation"
                    : a.motif === "modification_pp" ? "→ Suggérer Intégration PP"
                    : "→ Suggérer Prestation de service";
                  return (
                    <div key={a.client_id + a.motif} className="p-3 rounded-lg border bg-accent/30">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{a.client}</div>
                        <Badge>{a.count} appels</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {MOTIFS[a.motif as keyof typeof MOTIFS]} — <span className="font-medium text-primary">{sugg}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Derniers tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun ticket. <Link to="/tickets" className="text-primary underline">Créer le premier</Link>.</p>
          ) : (
            <div className="space-y-1">
              {tickets.slice(0, 10).map((t) => (
                <Link key={t.id} to="/tickets" className="flex items-center justify-between p-3 rounded-lg hover:bg-accent">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge
                      className={
                        t.priorite === "critique" ? "bg-critical text-critical-foreground"
                        : t.priorite === "haute" ? "bg-warning text-warning-foreground"
                        : ""
                      }
                      variant={t.priorite === "basse" ? "secondary" : "default"}
                    >
                      {PRIORITES[t.priorite as keyof typeof PRIORITES]}
                    </Badge>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{t.client_nom}</div>
                      <div className="text-xs text-muted-foreground">{MOTIFS[t.motif as keyof typeof MOTIFS]} • {t.technicien}</div>
                    </div>
                  </div>
                  <Badge variant="outline">{STATUTS[t.statut as keyof typeof STATUTS]}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
