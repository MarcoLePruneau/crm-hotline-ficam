import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TECH_EMAILS } from "@/lib/constants";

type Ctx = {
  technicien: string | null;
  setTechnicien: (name: string) => void;
  clear: () => void;
};

const TechCtx = createContext<Ctx | null>(null);

const techFromEmail = (email?: string | null) =>
  email ? TECH_EMAILS[email.trim().toLowerCase()] ?? null : null;

export function TechnicianProvider({ children }: { children: ReactNode }) {
  const [technicien, setTechnicienState] = useState<string | null>(null);

  useEffect(() => {
    // hydrate from current session
    supabase.auth.getSession().then(({ data }) => {
      setTechnicienState(techFromEmail(data.session?.user?.email));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setTechnicienState(techFromEmail(session?.user?.email));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // kept for API compatibility; real login happens in Login.tsx via Supabase Auth
  const setTechnicien = (name: string) => setTechnicienState(name);
  const clear = () => {
    supabase.auth.signOut();
    setTechnicienState(null);
  };

  return <TechCtx.Provider value={{ technicien, setTechnicien, clear }}>{children}</TechCtx.Provider>;
}

export function useTechnician() {
  const ctx = useContext(TechCtx);
  if (!ctx) throw new Error("useTechnician must be inside TechnicianProvider");
  return ctx;
}
