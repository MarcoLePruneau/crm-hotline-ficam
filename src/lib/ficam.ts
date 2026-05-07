import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CONTRACT_TYPES, ContractType, MOTIFS, Motif } from "@/lib/constants";

export const TECHNICIAN_INITIALS: Record<string, string> = {
  "Jocelyn VALIERE": "JV",
  "Cédric PROVENDIER": "CP",
  "Nicolas MERCIER": "NM",
  "Eric DAUVILLIERS": "ED",
  "Marc-Antoine HENRY": "MAH",
  "Christophe FERREIRA": "CF",
  "Valentin FOLLIOT": "VF",
  "Sergio FERREIRA": "SF",
  "David MONTOYA": "DM",
  "Benoit BOUQUIN": "BB",
  "Valentin BEUZELIN": "VB",
  "Michael DERLON": "MD",
  "NADIA BENGRID": "NB",
};

export const technicianInitials = (name?: string | null) => {
  if (!name) return "--";
  return TECHNICIAN_INITIALS[name] ?? name.split(/[\s-]+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 3).toUpperCase();
};

// Règle métier : Hotline OUI si contrat hotline, maintenance+hotline, souscription ou CIMCO.
// "Maintenance seule" est mappée vers "Maintenance + Hotline" (règle d'or FICAM).
export const hotlineRight = (contractType?: string | null, hotlineExpiry?: string | null) => {
  if (!contractType || contractType === "hors_contrat") return "NON";
  if (contractType === "maintenance") return "OUI";
  if (hotlineExpiry && new Date(hotlineExpiry) < new Date() && contractType === "hotline") return "HORS CONTRAT";
  return "OUI";
};

/**
 * Lance TeamViewer. Si id+mdp sont fournis, ouvre la session avec connexion automatique.
 * - URL scheme TeamViewer (cross-platform): `teamviewer10://control?device=ID&password=MDP`
 * - Fallback: ouverture simple via teamviewerapi://
 */
export const launchTeamViewer = (id?: string | null, password?: string | null) => {
  const cleanId = (id || "").replace(/\s+/g, "");
  if (cleanId && password) {
    // Connexion auto (TV 10+ supporte ce schéma sur Win/macOS/Linux)
    window.location.href = `teamviewer10://control?device=${encodeURIComponent(cleanId)}&password=${encodeURIComponent(password)}`;
    return "auto";
  }
  if (cleanId) {
    window.location.href = `teamviewerapi://remotecontrol?connectcc=${encodeURIComponent(cleanId)}`;
    return "id-only";
  }
  // Ouverture simple de l'application
  window.location.href = `teamviewer://`;
  return "open";
};

const fmtDateTime = (value?: string | Date | null) => {
  if (!value) return "";
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: fr });
};

const fmtHour = (value?: string | Date | null) => {
  if (!value) return "";
  return format(new Date(value), "HH:mm", { locale: fr });
};

type FicamTicket = {
  ticket_number?: string | null;
  client_nom?: string | null;
  contact_client?: string | null;
  telephone_client?: string | null;
  motif?: Motif | string | null;
  technicien?: string | null;
  heure_debut_effectif?: string | null;
  heure_fin_effectif?: string | null;
  teamviewer_id?: string | null;
  teamviewer_password?: string | null;
  compte_rendu?: string | null;
  date_ouverture?: string | null;
};

type FicamClient = {
  entreprise?: string | null;
  contact_nom?: string | null;
  telephone?: string | null;
  contract_type?: ContractType | null;
  date_echeance_hotline?: string | null;
  teamviewer_id?: string | null;
};

export const calendarTitle = (clientName?: string | null) => `[${(clientName || "CLIENT").toUpperCase()}]`;

/**
 * Format officiel d'affichage / export du ticket.
 * Saut de ligne entre chaque bloc, comme demandé par FICAM.
 */
export const formatTicketBlock = (ticket: FicamTicket, client?: FicamClient | null) => {
  const motif = ticket.motif && MOTIFS[ticket.motif as Motif] ? MOTIFS[ticket.motif as Motif] : ticket.motif || "";
  const tv = ticket.teamviewer_id || client?.teamviewer_id || "";
  const contact = ticket.contact_client || client?.contact_nom || "";
  const phone = ticket.telephone_client || client?.telephone || "";
  const start = ticket.date_ouverture || ticket.heure_debut_effectif || null;
  const end = ticket.heure_fin_effectif || null;
  return [
    `Client : ${ticket.client_nom || client?.entreprise || ""} | Contact : ${contact || "—"}`,
    "",
    `N° Ticket : ${ticket.ticket_number || ""} | Tél : ${phone || "—"}`,
    "",
    `Motif : ${motif} | Droit Hot-line : ${hotlineRight(client?.contract_type, client?.date_echeance_hotline)}`,
    "",
    `Technicien : ${technicianInitials(ticket.technicien)} | ID TEAMVIEWER : ${tv || "—"} | MDP : ${ticket.teamviewer_password || ""}`,
    "",
    `Durée : ${fmtDateTime(start)} / ${fmtDateTime(end) || "—"}`,
    "",
    `Description : ${(ticket as any).description || ""}`,
    "",
    `Compte rendu : ${ticket.compte_rendu || ""}`,
  ].join("\n");
};

export const buildFicamCalendarBody = formatTicketBlock;

export const simulatedEventRange = (ticket: FicamTicket) => {
  const start = new Date(ticket.heure_debut_effectif || ticket.date_ouverture || new Date());
  const end = ticket.heure_fin_effectif ? new Date(ticket.heure_fin_effectif) : new Date(start.getTime() + 30 * 60 * 1000);
  return { start_at: start.toISOString(), end_at: end.toISOString(), label: `${fmtDateTime(start)} → ${fmtDateTime(end)}` };
};

export const contractLabel = (contractType?: string | null) => {
  // "maintenance" seule est affichée comme "Maintenance + Hotline"
  const key = contractType === "maintenance" ? "maintenance_hotline" : (contractType || "hors_contrat");
  return (CONTRACT_TYPES as any)[key] ?? "Hors Contrat";
};
