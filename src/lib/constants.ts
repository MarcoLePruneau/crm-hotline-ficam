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

// Mapping email → technicien (auth interne)
export const TECH_EMAILS: Record<string, string> = {
  "ma.henry@ficam.com": "Marc-Antoine HENRY",
  "j.valiere@ficam.com": "Jocelyn VALIERE",
  "c.provendier@ficam.com": "Cédric PROVENDIER",
  "n.mercier@ficam.com": "Nicolas MERCIER",
  "e.dauvilliers@ficam.com": "Eric DAUVILLIERS",
  "c.ferreira@ficam.com": "Christophe FERREIRA",
  "v.folliot@ficam.com": "Valentin FOLLIOT",
  "s.ferreira@ficam.com": "Sergio FERREIRA",
  "d.montoya@ficam.com": "David MONTOYA",
  "b.bouquin@ficam.com": "Benoit BOUQUIN",
  "v.beuzelin@ficam.com": "Valentin BEUZELIN",
  "m.derlon@ficam.com": "Michael DERLON",
  "n.bengrid@ficam.com": "NADIA BENGRID",
};
export const TECH_PASSWORD = "Ficam1996@";

export const CONTRACT_TYPES = {
  maintenance_hotline: "Maintenance + Hotline",
  hotline: "Hotline seule",
  souscription: "Souscription",
  cimco: "Contrat CIMCO",
  hors_contrat: "Hors Contrat",
} as const;

// Filtres exposés dans l'UI Clients
export const CLIENT_FILTER_TYPES = {
  hotline: "Hotline seul",
  maintenance_hotline: "Maintenance + Hotline",
  souscription: "Souscription",
  hors_contrat: "Hors Contrat",
} as const;

// Un client a droit à la hotline si l'un de ces contrats est présent
export const HOTLINE_ELIGIBLE_TYPES = ["hotline", "maintenance_hotline", "maintenance", "souscription", "cimco"] as const;

// Liste stricte des motifs (V1.3)
export const MOTIFS = {
  aide_prog_tournage: "Aide programmation tournage",
  aide_prog_fraisage: "Aide programmation fraisage",
  aide_prog_millturn: "Aide programmation MillTurn",
  mod_pp_tournage: "Modification PP tournage",
  mod_pp_fraisage_3_4: "Modification PP fraisage 3-4 axes",
  mod_pp_fraisage_5: "Modification PP fraisage 5 axes",
  mod_pp_millturn: "Modification PP MillTurn",
  install_mastercam: "Installation Mastercam",
  mise_a_jour_licence: "Mise à jour de licence",
  migration_pp: "Migration PP",
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

export const ACTIVE_STATUTS = ["ouvert", "en_cours", "a_rappeler", "a_appeler"] as const;
export const CLOSED_STATUTS = ["traite", "resolu", "ferme"] as const;

export const STATUT_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  ouvert:         { bg: "hsl(217 91% 60%)", fg: "hsl(0 0% 100%)", label: "Ouvert" },
  en_cours:       { bg: "hsl(220 9% 46%)",  fg: "hsl(0 0% 100%)", label: "En cours" },
  a_rappeler:     { bg: "hsl(38 92% 50%)",  fg: "hsl(0 0% 10%)",  label: "À rappeler" },
  a_appeler:      { bg: "hsl(0 84% 50%)",   fg: "hsl(0 0% 100%)", label: "À appeler (Urgent)" },
  attente_client: { bg: "hsl(280 65% 55%)", fg: "hsl(0 0% 100%)", label: "En attente client" },
  traite:         { bg: "hsl(142 71% 38%)", fg: "hsl(0 0% 100%)", label: "Traité" },
  ferme:          { bg: "hsl(220 9% 30%)",  fg: "hsl(0 0% 100%)", label: "Fermé" },
};

export type ContractType = keyof typeof CONTRACT_TYPES | "maintenance";
export type Motif = keyof typeof MOTIFS;
export type Priorite = keyof typeof PRIORITES;
export type Statut = keyof typeof STATUTS;
