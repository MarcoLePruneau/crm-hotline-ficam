import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTechnician } from "@/hooks/useTechnician";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun, AlertTriangle, Users, ArrowRight, Mail, KeyRound, RefreshCw, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Settings() {
  const { technicien, clear } = useTechnician();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [credStatus, setCredStatus] = useState<{ configured: boolean; updated_by: string | null; updated_at: string | null }>({ configured: false, updated_by: null, updated_at: null });
  const [newPassword, setNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [fetchingMail, setFetchingMail] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("hotline-credentials", { method: "GET" });
      if (!error && data?.ok) {
        setCredStatus({ configured: !!data.configured, updated_by: data.updated_by, updated_at: data.updated_at });
      }
    })();
  }, []);

  const savePassword = async () => {
    if (newPassword.length < 4) return toast.error("Mot de passe trop court");
    setSavingPwd(true);
    const { data, error } = await supabase.functions.invoke("hotline-credentials", { body: { password: newPassword } });
    setSavingPwd(false);
    if (error || !data?.ok) return toast.error(data?.error ?? error?.message ?? "Échec");
    toast.success("Mot de passe hotline mis à jour");
    setNewPassword("");
    setCredStatus({ configured: true, updated_by: technicien, updated_at: new Date().toISOString() });
  };

  const fetchMailbox = async () => {
    setFetchingMail(true);
    const { data, error } = await supabase.functions.invoke("hotline-pop3", { body: {} });
    setFetchingMail(false);
    if (error) return toast.error(error.message);
    if (!data?.ok) return toast.error(data?.error ?? "Échec de la relève");
    toast.success(`Relève OK : ${data.created} ticket(s) créé(s), ${data.skipped} déjà traité(s)`);
  };

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
          <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Boîte hotline (Hosteam POP3)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 text-xs font-mono">
            <div><span className="text-muted-foreground">Serveur :</span> webmail19.hosteam.fr</div>
            <div><span className="text-muted-foreground">Port :</span> 995 (SSL)</div>
            <div><span className="text-muted-foreground">Identifiant :</span> hot-line@ficam.com</div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">État :</span>
              {credStatus.configured
                ? <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Configuré</span>
                : <span className="text-amber-600">Non configuré</span>}
            </div>
          </div>

          {credStatus.configured && credStatus.updated_at && (
            <p className="text-xs text-muted-foreground">
              Dernière mise à jour : {new Date(credStatus.updated_at).toLocaleString("fr-FR")} {credStatus.updated_by && `par ${credStatus.updated_by}`}
            </p>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Mot de passe de la boîte hotline</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Saisir / mettre à jour le mot de passe"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPwd ? "Masquer" : "Afficher"}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button onClick={savePassword} disabled={savingPwd || newPassword.length < 4}>
                {savingPwd ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Stocké de façon sécurisée côté serveur : accessible uniquement par les fonctions backend (service_role), jamais renvoyé au navigateur.
            </p>
          </div>

          <div className="border-t pt-3">
            <Button variant="outline" onClick={fetchMailbox} disabled={fetchingMail || !credStatus.configured}>
              <RefreshCw className={`w-4 h-4 ${fetchingMail ? "animate-spin" : ""}`} />
              {fetchingMail ? "Relève en cours…" : "Relever la boîte maintenant"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Chaque mail relevé est transformé en ticket (motif classé par IA), puis supprimé de la boîte POP3.
            </p>
          </div>
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
