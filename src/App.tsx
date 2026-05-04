import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TechnicianProvider } from "@/hooks/useTechnician";
import { ThemeProvider } from "@/hooks/useTheme";
import RequireTech from "@/components/RequireTech";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Tickets from "@/pages/Tickets";
import Clients from "@/pages/Clients";
import CalendarPage from "@/pages/Calendar";
import Messages from "@/pages/Messages";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TechnicianProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<RequireTech><Layout /></RequireTech>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TechnicianProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
