export const TECHNICIENS = [
  "Jocelyn VALIERE",
  "Cédric PROVENDIER",
  "Nicolas MERCIER",
  "Eric DAUVILLIERS",
  "Marc-Antoine HENRY",
  "Christophe FERREIRA",
  "Valentin FOLLIOT",
  "Sergio FERREIRA",
  "David MONTOYA",
  "Benoit BOUQUIN",
  "Valentin BEUZELIN",
  "Michael DERLON",
  "NADIA BENGRID",
] as const;

export const CONTRACT_TYPES = {
  maintenance_hotline: "Maintenance + Hotline",
  hotline: "Hotline seule",
  maintenance: "Maintenance seule",
  cimco: "Contrat CIMCO",
  hors_contrat: "Hors Contrat",
} as const;

export const MOTIFS = {
  aide_programmation: "Aide programmation",
  modification_pp: "Modification Post-Processeur",
  installation: "Installation",
  mise_a_jour_licence: "Mise à jour licence",
  cimco: "CIMCO",
  autre: "Autre",
} as const;

export const PRIORITES = {
  basse: "Basse",
  haute: "Haute",
  critique: "Critique (Machine arrêtée)",
} as const;

export const STATUTS = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  a_rappeler: "À rappeler",
  a_appeler: "À appeler (Urgent)",
  attente_client: "En attente client",
  traite: "Traité",
  ferme: "Fermé",
} as const;

// Statuts considérés comme "actifs" pour le dashboard / flux de tickets
export const ACTIVE_STATUTS = ["ouvert", "en_cours", "a_rappeler", "a_appeler"] as const;
// Statuts considérés comme "terminés"
export const CLOSED_STATUTS = ["traite", "resolu", "ferme"] as const;

// Couleurs des statuts (HSL) pour le calendrier
export const STATUT_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  ouvert:         { bg: "hsl(217 91% 60%)", fg: "hsl(0 0% 100%)", label: "Ouvert" },
  en_cours:       { bg: "hsl(220 9% 46%)",  fg: "hsl(0 0% 100%)", label: "En cours" },
  a_rappeler:     { bg: "hsl(38 92% 50%)",  fg: "hsl(0 0% 10%)",  label: "À rappeler" },
  a_appeler:      { bg: "hsl(0 84% 50%)",   fg: "hsl(0 0% 100%)", label: "À appeler (Urgent)" },
  attente_client: { bg: "hsl(280 65% 55%)", fg: "hsl(0 0% 100%)", label: "En attente client" },
  traite:         { bg: "hsl(142 71% 38%)", fg: "hsl(0 0% 100%)", label: "Traité" },
  ferme:          { bg: "hsl(220 9% 30%)",  fg: "hsl(0 0% 100%)", label: "Fermé" },
};

export type ContractType = keyof typeof CONTRACT_TYPES;
export type Motif = keyof typeof MOTIFS;
export type Priorite = keyof typeof PRIORITES;
export type Statut = keyof typeof STATUTS;
