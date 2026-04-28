import { useTechnician } from "@/hooks/useTechnician";
import { Navigate } from "react-router-dom";
import { ReactNode } from "react";

export default function RequireTech({ children }: { children: ReactNode }) {
  const { technicien } = useTechnician();
  if (!technicien) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
