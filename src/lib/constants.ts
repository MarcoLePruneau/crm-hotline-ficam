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
  hors_contrat: "Hors Contrat",
} as const;

export const MOTIFS = {
  aide_programmation: "Aide programmation",
  modification_pp: "Modification Post-Processeur",
  installation: "Installation",
  mise_a_jour_licence: "Mise à jour licence",
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
  attente_client: "En attente client",
  resolu: "Résolu",
  ferme: "Fermé",
} as const;

export type ContractType = keyof typeof CONTRACT_TYPES;
export type Motif = keyof typeof MOTIFS;
export type Priorite = keyof typeof PRIORITES;
export type Statut = keyof typeof STATUTS;
