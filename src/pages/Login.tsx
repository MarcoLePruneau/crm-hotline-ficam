import { useState } from "react";
import { TECH_EMAILS, TECH_PASSWORD } from "@/lib/constants";
import { useTechnician } from "@/hooks/useTechnician";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/ficam-logo.png";

export default function Login() {
  const { setTechnicien } = useTechnician();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const tech = TECH_EMAILS[email.trim().toLowerCase()];
    if (!tech) {
      setLoading(false);
      return toast.error("Email non reconnu");
    }
    if (password !== TECH_PASSWORD) {
      setLoading(false);
      return toast.error("Mot de passe incorrect");
    }
    setTechnicien(tech);
    toast.success(`Bienvenue ${tech}`);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30 flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-card border rounded-2xl p-8 shadow-xl space-y-5">
        <div className="text-center">
          <img src={logo} alt="FICAM" className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg" />
          <h1 className="text-2xl font-bold">CRM Hotline FICAM</h1>
          <p className="text-sm text-muted-foreground mt-1">Connexion technicien</p>
        </div>
        <div>
          <Label>Email professionnel</Label>
          <Input
            type="email"
            autoFocus
            placeholder="prenom.nom@ficam.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Mot de passe</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>Se connecter</Button>
        <p className="text-[11px] text-center text-muted-foreground">
          Accès réservé aux techniciens FICAM (@ficam.com)
        </p>
      </form>
    </div>
  );
}
