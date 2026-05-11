import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, AlertTriangle, Clock, TrendingUp, PhoneCall, Hourglass, Users } from "lucide-react";
import { getContractStatus } from "@/lib/contractStatus";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MOTIFS, PRIORITES, STATUTS, STATUT_COLORS, ACTIVE_STATUTS } from "@/lib/constants";
import { useTechnician } from "@/hooks/useTechnician";
import { fetchAll } from "@/lib/fetchAll";

export default function Dashboard() {
  const { technicien } = useTechnician();
  const [tickets, setTickets] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const isCimcoOnly = technicien === "Michael DERLON";

  useEffect(() => {
    (async () => {
      try {
        const [tick0, cli0] = await Promise.all([
          fetchAll<any>("tickets", (q) => q.order("date_ouverture", { ascending: false })),
          fetchAll<any>("clients"),
        ]);
        let tick = tick0;
        let cli = cli0;
        if (isCimcoOnly) {
          const cimcoIds = new Set(cli.filter((x) => x.contract_type === "cimco").map((x) => x.id));
          cli = cli.filter((x) => x.contract_type === "cimco");
          tick = tick.filter((x) => x.motif === "cimco" || cimcoIds.has(x.client_id));
        }
        setTickets(tick);
        setClients(cli);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [technicien]);

  // Compteurs par statut
  const countByStatut = (s: string) => tickets.filter((t) => t.statut === s).length;
  const compteurs = [
    { label: "Ouverts",          value: countByStatut("ouvert"),          color: STATUT_COLORS.ouvert.bg,         icon: Ticket },
    { label: "En cours",          value: countByStatut("en_cours"),        color: STATUT_COLORS.en_cours.bg,       icon: Clock },
    { label: "À rappeler",        value: countByStatut("a_rappeler") + countByStatut("a_appeler"), color: STATUT_COLORS.a_rappeler.bg, icon: PhoneCall },
    { label: "En attente client", value: countByStatut("attente_client"),  color: STATUT_COLORS.attente_client.bg, icon: Hourglass },
  ];

  // Flux de tickets ACTIFS uniquement (pas d'historique)
  const activeTickets = tickets.filter((t) => (ACTIVE_STATUTS as readonly string[]).includes(t.statut));

  // Alertes contrats : on précise le type
  type Alert = { client: any; type: string; expiry: string | null; level: "expired" | "expiring" };
  const alerts: Alert[] = [];
  for (const c of clients) {
    const checks: { type: string; date: string | null }[] = [];
    if (c.contract_type === "hotline" || c.contract_type === "maintenance_hotline") {
      checks.push({ type: "Hotline", date: c.date_echeance_hotline });
    }
    if (c.contract_type === "maintenance" || c.contract_type === "maintenance_hotline") {
      checks.push({ type: "Maintenance", date: c.date_echeance_maintenance });
    }
    if (c.contract_type === "cimco") {
      checks.push({ type: "CIMCO", date: c.date_echeance_maintenance || c.date_echeance_hotline });
    }
    for (const ck of checks) {
      const s = getContractStatus(ck.date);
      if (s === "expired" || s === "expiring") {
        alerts.push({ client: c, type: ck.type, expiry: ck.date, level: s });
      }
    }
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de l'activité hotline
          {isCimcoOnly && <Badge variant="outline" className="ml-2">Vue CIMCO</Badge>}
        </p>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {compteurs.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                  <div className="text-3xl font-bold mt-1">{s.value}</div>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: s.color }}>
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compteur clients secondaire */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Clients</div>
              <div className="text-2xl font-bold mt-1">{clients.length}</div>
            </div>
            <Users className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Tickets actifs</div>
              <div className="text-2xl font-bold mt-1">{activeTickets.length}</div>
            </div>
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>
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
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun contrat à surveiller.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto">
                {alerts.slice(0, 30).map((a, i) => (
                  <Link key={a.client.id + a.type + i} to="/clients" className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent">
                    <div>
                      <div className="font-medium text-sm">{a.client.entreprise}</div>
                      <div className="text-xs text-muted-foreground">
                        Contrat {a.type} {a.level === "expired" ? "expiré" : "expire bientôt"}
                        {a.expiry && ` — ${format(new Date(a.expiry), "dd MMM yyyy", { locale: fr })}`}
                      </div>
                    </div>
                    <Badge variant={a.level === "expired" ? "destructive" : "secondary"} className={a.level === "expiring" ? "bg-warning text-warning-foreground" : ""}>
                      Contrat {a.type} {a.level === "expired" ? "expiré" : "< 30 j"}
                    </Badge>
                  </Link>
                ))}
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
                    : a.motif === "cimco" ? "→ Suggérer Souscription CIMCO"
                    : "→ Suggérer Prestation de service";
                  return (
                    <div key={a.client_id + a.motif} className="p-3 rounded-lg border bg-accent/30">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{a.client}</div>
                        <Badge>{a.count} appels</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {MOTIFS[a.motif as keyof typeof MOTIFS] ?? a.motif} — <span className="font-medium text-primary">{sugg}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Flux de tickets actifs uniquement */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets en cours</CardTitle>
        </CardHeader>
        <CardContent>
          {activeTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun ticket actif. <Link to="/tickets" className="text-primary underline">Créer un ticket</Link>.</p>
          ) : (
            <div className="space-y-1">
              {activeTickets.slice(0, 15).map((t) => {
                const sc = STATUT_COLORS[t.statut];
                return (
                  <Link key={t.id} to="/tickets" className="flex items-center justify-between p-3 rounded-lg hover:bg-accent">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge style={{ background: sc?.bg, color: sc?.fg }}>{sc?.label ?? t.statut}</Badge>
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
                        <div className="text-xs text-muted-foreground">{MOTIFS[t.motif as keyof typeof MOTIFS] ?? t.motif} • {t.technicien}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono">{t.ticket_number}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
