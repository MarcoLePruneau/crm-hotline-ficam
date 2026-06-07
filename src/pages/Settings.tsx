import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTechnician } from "@/hooks/useTechnician";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun, Calendar, AlertTriangle, Users, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Settings() {
  const { technicien, clear } = useTechnician();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const wipeAll = async () => {
    if (!confirm("⚠ Étape 1/2 — Supprimer DÉFINITIVEMENT tous les clients, contacts, contrats et tickets ?")) return;
    const phrase = prompt('Étape 2/2 — Tapez exactement SUPPRIMER pour confirmer :');
    if (phrase !== "SUPPRIMER") return toast.error("Annulé");
    const NIL = "00000000-0000-0000-0000-000000000000";
    await supabase.from("ticket_attachments").delete().neq("id", NIL);
    await supabase.from("tickets").delete().neq("id", NIL);
    await supabase.from("contracts").delete().neq("id", NIL);
    await supabase.from("client_contacts").delete().neq("id", NIL);
    const { error } = await supabase.from("clients").delete().neq("id", NIL);
    if (error) return toast.error(error.message);
    toast.success("Base de données entièrement vidée");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">Préférences et intégrations</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profil</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Connecté en tant que</div>
              <div className="font-semibold">{technicien}</div>
            </div>
            <Button variant="outline" onClick={() => { clear(); navigate("/login"); }}>
              <LogOut className="w-4 h-4" /> Changer d'utilisateur
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Apparence</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Mode {theme === "dark" ? "sombre" : "clair"}</div>
              <div className="text-sm text-muted-foreground">Préférence mémorisée</div>
            </div>
            <Button variant="outline" onClick={toggle}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              Basculer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Base de données Clients & Contacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">Accès complet à la base : recherche globale sur l'intégralité des clients et contacts, sans limitation.</p>
          <Button onClick={() => navigate("/clients")}>
            Ouvrir la base Clients / Contacts <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Synchronisation calendrier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Le calendrier partagé <code className="px-1.5 py-0.5 rounded bg-muted">hot-line@ficam.com</code> est en mode simulation.
          </p>
          <Button variant="outline" disabled>Microsoft Graph / Entra ID : à brancher en phase finale</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" /> Zone dangereuse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">Vide intégralement la base : clients, contacts, contrats, tickets et pièces jointes. Double confirmation requise.</p>
          <Button variant="destructive" onClick={wipeAll}>Supprimer toute la base de données</Button>
        </CardContent>
      </Card>
    </div>
  );
}
