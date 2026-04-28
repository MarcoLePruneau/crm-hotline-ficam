# CRM Hotline FICAM — Plan

Application CRM interne pour l'équipe support Mastercam, avec base clients partagée, gestion de tickets, synchronisation bidirectionnelle avec le calendrier Outlook `hot-line@ficam.com`, alertes commerciales et reporting.

## 1. Connexion technicien (sans mot de passe)

- Écran d'accueil : liste des 13 techniciens (Jocelyn VALIERE, Cédric PROVENDIER, Nicolas MERCIER, Eric DAUVILLIERS, Marc-Antoine HENRY, Christophe FERREIRA, Valentin FOLLIOT, Sergio FERREIRA, David MONTOYA, Benoit BOUQUIN, Valentin BEUZELIN, Michael DERLON, NADIA BENGRID).
- Clic sur un nom → mémorisé en LocalStorage, plus jamais redemandé.
- Bouton "Changer d'utilisateur" dans le header pour switcher.
- Chaque ticket / événement créé est tagué automatiquement avec le nom du technicien.

## 2. Base Clients & Contrats

**Page Clients** (tableau + recherche + filtres contrat) :
- Champs : Entreprise, Contact, Téléphone, Email, N° série licence Mastercam, Type de contrat (Maintenance seule / Hotline seule / Maintenance + Hotline / Hors Contrat), Date d'échéance maintenance, Notes.
- **Import Excel/CSV** : bouton "Importer" avec mapping de colonnes, aperçu, validation, et import en masse.
- Création / édition / suppression manuelle d'un client.

**Alertes visuelles automatiques** :
- Échéance maintenance dépassée → ligne en **rouge gras** + badge "Contrat expiré".
- Échéance < 30 jours → ligne en **orange** + badge "Expire bientôt".
- Contrat actif → vert.
- Badge hotline : "Hors Contrat" ou pas de hotline → badge rouge "⚠ Intervention facturable".

## 3. Tickets & Chronomètre

**Formulaire nouveau ticket** :
- Client (autocomplétion depuis la base).
- Motif : Aide programmation / Modification Post-Processeur / Installation / Mise à jour licence / Autre.
- Priorité : Basse / Haute / Critique (Machine arrêtée) — avec code couleur.
- Description libre.
- Date/heure (défaut : maintenant).
- Technicien (auto, modifiable).

**Chronomètre intégré** : bouton Start/Stop sur chaque ticket ouvert, durée enregistrée. Arrêt automatique à la fermeture du ticket.

**Statuts** : Ouvert / En cours / En attente client / Résolu / Fermé.

**Tableau de bord** : liste des tickets avec filtres (technicien, statut, priorité, période, client), badge visuel de priorité, durée cumulée.

## 4. Synchronisation Outlook (hot-line@ficam.com)

- Connexion unique (admin) au compte partagé via le connecteur Microsoft Outlook + permissions calendrier.
- **App → Outlook** : chaque ticket créé/modifié/fermé crée ou met à jour un événement dans le calendrier (titre = "[Priorité] Client — Motif", description = détails ticket + technicien, durée = chrono).
- **Outlook → App** : polling périodique (ex. toutes les 2 min) lit les nouveaux événements du calendrier et les importe comme tickets dans le tableau de bord (même s'ils ont été saisis directement par Nadia ou un autre technicien dans Outlook).
- Déduplication par ID d'événement Outlook stocké sur le ticket.

## 5. Intelligence & Alertes Commerciales

- Détection automatique : si un même client appelle **> 3 fois dans le mois pour le même motif**, bannière d'alerte sur sa fiche et dans le dashboard :
  - Motif "Aide programmation" répété → suggère **Formation**.
  - Motif "Modification PP" répété → suggère **Intégration Post-Processeur**.
  - Autres motifs → suggère **Prestation de service**.
- Tableau "Clients à fort appel" trié par fréquence.

## 6. Reporting

- Page Rapports avec filtres (période, technicien, client, motif).
- Indicateurs : nb tickets, temps total, répartition par motif / priorité / technicien, top clients.
- Export **PDF** et **Excel** des rapports mensuels.

## 7. Design

- Interface moderne type SaaS (inspiration Linear / Notion), dense mais aérée.
- Palette : bleu professionnel primaire, accents selon priorité/statut.
- **Mode sombre** avec toggle (mémorisé).
- Responsive Desktop + Mobile (sidebar collapsable, tableaux adaptatifs).
- Composants shadcn/ui, icônes lucide-react.

## Structure des pages

- `/login` — Sélection du technicien (1re fois seulement).
- `/` — Dashboard (tickets du jour, alertes contrats, alertes commerciales).
- `/tickets` — Liste + création + détail + chrono.
- `/clients` — Base clients + import + alertes contrats.
- `/clients/:id` — Fiche client (historique tickets, alertes commerciales).
- `/reports` — Rapports et exports PDF/Excel.
- `/settings` — Connexion Outlook, changement d'utilisateur, mode sombre.

## Détails techniques

- **Stockage** : Lovable Cloud (Supabase). Tables : `clients`, `tickets`, `ticket_time_logs`, `technicians` (statique), `outlook_sync_state`.
- **Sécurité** : RLS ouverte en lecture/écriture à tout utilisateur authentifié anonyme (équipe interne, pas de login réel — acceptable selon choix utilisateur). À noter : la sélection par nom en LocalStorage n'est pas une authentification sécurisée ; toute personne accédant à l'URL peut se faire passer pour un technicien.
- **Outlook** : connecteur `microsoft_outlook` via gateway Lovable. Edge functions :
  - `outlook-sync-push` (créer/mettre à jour événement depuis ticket)
  - `outlook-sync-pull` (polling + import événements)
- **Import CSV/XLSX** : parsing côté client avec `xlsx` (SheetJS), insertion batch via Supabase.
- **Export** : PDF via `jspdf` + `jspdf-autotable`, Excel via `xlsx`.
- **Chronomètre** : timestamp start/stop stockés en base (résiste aux rechargements).
- **Polling Outlook** : cron edge function toutes les 2 minutes + bouton "Rafraîchir" manuel.

## Phasage de livraison

1. Base UI + sélection technicien + mode sombre.
2. Table clients + import CSV/XLSX + alertes contrats.
3. Tickets + chronomètre + dashboard.
4. Alertes commerciales (fréquence d'appel).
5. Connexion Outlook + sync bidirectionnelle.
6. Rapports + export PDF/Excel.
