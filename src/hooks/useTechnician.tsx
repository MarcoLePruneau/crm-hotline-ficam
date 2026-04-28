import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const KEY = "ficam.technicien";

type Ctx = {
  technicien: string | null;
  setTechnicien: (name: string) => void;
  clear: () => void;
};

const TechCtx = createContext<Ctx | null>(null);

export function TechnicianProvider({ children }: { children: ReactNode }) {
  const [technicien, setTechnicienState] = useState<string | null>(null);

  useEffect(() => {
    setTechnicienState(localStorage.getItem(KEY));
  }, []);

  const setTechnicien = (name: string) => {
    localStorage.setItem(KEY, name);
    setTechnicienState(name);
  };
  const clear = () => {
    localStorage.removeItem(KEY);
    setTechnicienState(null);
  };

  return <TechCtx.Provider value={{ technicien, setTechnicien, clear }}>{children}</TechCtx.Provider>;
}

export function useTechnician() {
  const ctx = useContext(TechCtx);
  if (!ctx) throw new Error("useTechnician must be inside TechnicianProvider");
  return ctx;
}
