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

export const hotlineRight = (contractType?: ContractType | null, hotlineExpiry?: string | null) => {
  if (contractType === "hors_contrat") return "HORS CONTRAT";
  if (contractType === "maintenance") return "NON";
  if (hotlineExpiry && new Date(hotlineExpiry) < new Date()) return "HORS CONTRAT";
  return "OUI";
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

export const buildFicamCalendarBody = (ticket: FicamTicket, client?: FicamClient | null) => {
  const motif = ticket.motif && MOTIFS[ticket.motif as Motif] ? MOTIFS[ticket.motif as Motif] : ticket.motif || "";
  const tv = ticket.teamviewer_id || client?.teamviewer_id || "";
  const contact = ticket.contact_client || client?.contact_nom || "";
  const phone = ticket.telephone_client || client?.telephone || "";
  const start = ticket.heure_debut_effectif || ticket.date_ouverture || null;
  const end = ticket.heure_fin_effectif || null;

  return [
    `Client : ${ticket.client_nom || client?.entreprise || ""}`,
    `N° du ticket : ${ticket.ticket_number || ""}`,
    `Contact client : ${contact}`,
    `Téléphone : ${phone}`,
    `Motif de l’appel : ${motif}`,
    `Droit Hot-line : ${hotlineRight(client?.contract_type, client?.date_echeance_hotline)}`,
    "",
    `Technicien : ${technicianInitials(ticket.technicien)}`,
    `Heure début / fin appel (effectif) : ${fmtHour(start)} / ${fmtHour(end)}`,
    `TeamViewer : ${tv}`,
    `MDP : ${ticket.teamviewer_password || ""}`,
    "",
    `Compte rendu : ${ticket.compte_rendu || ""}`,
  ].join("\n");
};

export const simulatedEventRange = (ticket: FicamTicket) => {
  const start = new Date(ticket.heure_debut_effectif || ticket.date_ouverture || new Date());
  const end = ticket.heure_fin_effectif ? new Date(ticket.heure_fin_effectif) : new Date(start.getTime() + 30 * 60 * 1000);
  return { start_at: start.toISOString(), end_at: end.toISOString(), label: `${fmtDateTime(start)} → ${fmtDateTime(end)}` };
};

export const contractLabel = (contractType?: ContractType | null) => CONTRACT_TYPES[(contractType || "hors_contrat") as ContractType] ?? "Hors Contrat";
