import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTechnician } from "@/hooks/useTechnician";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun, Calendar } from "lucide-react";

export default function Settings() {
  const { technicien, clear } = useTechnician();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">Préférences et intégrations</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
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
          <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Synchronisation calendrier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Le calendrier partagé <code className="px-1.5 py-0.5 rounded bg-muted">hot-line@ficam.com</code> est actuellement en mode simulation complète.
          </p>
          <p className="text-muted-foreground">
            Les tickets créent déjà des événements simulés au format FICAM, et la page Calendrier permet de tester le flux Outlook → App sans connexion Microsoft Entra ID.
          </p>
          <Button variant="outline" disabled>Microsoft Graph / Entra ID : à brancher en phase finale</Button>
        </CardContent>
      </Card>
    </div>
  );
}
