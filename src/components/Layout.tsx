import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTechnician } from "@/hooks/useTechnician";
import { useTheme } from "@/hooks/useTheme";
import {
  LayoutDashboard, Ticket, Users, BarChart3, Settings, CalendarDays,
  MessageSquare, Moon, Sun, LogOut, Menu, X
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { technicianInitials } from "@/lib/ficam";
import logo from "@/assets/ficam-logo.png";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/tickets", label: "Tickets", icon: Ticket },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/calendar", label: "Calendrier", icon: CalendarDays },
  { to: "/messages", label: "Messagerie", icon: MessageSquare },
  { to: "/reports", label: "Rapports", icon: BarChart3 },
  { to: "/settings", label: "Paramètres", icon: Settings },
];

export default function Layout() {
  const { technicien, clear } = useTechnician();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const switchUser = () => {
    clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border">
          <img src={logo} alt="FICAM" className="w-9 h-9 rounded-lg" />
          <div>
            <div className="font-bold text-sidebar-foreground leading-tight">FICAM</div>
            <div className="text-xs text-muted-foreground">Hotline CRM</div>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
              <n.icon className="w-4 h-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open && (
        <div onClick={() => setOpen(false)} className="lg:hidden fixed inset-0 z-30 bg-black/40" />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <button onClick={() => setOpen((o) => !o)} className="lg:hidden p-2 rounded-md hover:bg-accent">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-2 rounded-md hover:bg-accent" aria-label="Changer thème">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                {technicianInitials(technicien)}
              </div>
              <span className="text-sm font-medium">{technicien}</span>
            </div>
            <button onClick={switchUser} className="p-2 rounded-md hover:bg-accent" title="Changer d'utilisateur">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
