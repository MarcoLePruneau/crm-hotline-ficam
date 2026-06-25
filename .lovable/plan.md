## Plan : Corriger la faille Realtime et publier

### 1. Sécuriser `realtime.messages`
Ajouter via une migration des politiques RLS sur la table `realtime.messages` pour que seuls les techniciens FICAM authentifiés puissent s'abonner aux canaux Realtime :

- Activer RLS sur `realtime.messages` (si pas déjà fait par défaut).
- Créer une politique `SELECT` qui autorise uniquement les utilisateurs pour qui `public.is_ficam_tech()` retourne `true`.
- Restreindre les abonnements aux canaux utilisés par l'app (tickets, direct_messages, presence) en filtrant sur le nom du topic.

### 2. Renforcer les politiques `direct_messages`
Mettre à jour les politiques existantes pour qu'elles appellent explicitement `public.is_ficam_tech()` en complément de `current_technicien()`, afin de lever l'avertissement du scan.

### 3. Vérifier
Relancer un scan de sécurité pour confirmer que les deux findings sont résolus.

### 4. Publier
Appeler `preview_ui--publish` (les métadonnées du site sont déjà à jour : titre, description, OG/Twitter, favicon FICAM Hotline).

### Détails techniques
```sql
-- Restreindre Realtime aux techniciens FICAM
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ficam_tech_realtime_read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.is_ficam_tech());

-- Durcir direct_messages
DROP POLICY ... ; -- politiques existantes
CREATE POLICY ... USING (public.is_ficam_tech() AND (sender = public.current_technicien() OR recipient = public.current_technicien()));
```

Confirmes-tu que je peux appliquer cette migration puis publier ?
