import { TECHNICIENS } from "@/lib/constants";
import { useTechnician } from "@/hooks/useTechnician";
import { useNavigate } from "react-router-dom";
import { Headset, User } from "lucide-react";
import { technicianInitials } from "@/lib/ficam";

export default function Login() {
  const { setTechnicien } = useTechnician();
  const navigate = useNavigate();

  const choose = (name: string) => {
    setTechnicien(name);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg shadow-primary/30">
            <Headset className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">CRM Hotline FICAM</h1>
          <p className="text-muted-foreground mt-2">Sélectionnez votre profil pour commencer</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {TECHNICIENS.map((name) => (
            <button
              key={name}
              onClick={() => choose(name)}
              className="group p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <span className="text-xs font-bold">{technicianInitials(name)}</span>
              </div>
              <div className="font-medium text-sm leading-tight">{name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
