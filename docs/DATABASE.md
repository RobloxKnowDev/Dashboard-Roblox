# Base de données

Base PostgreSQL hébergée par Supabase. Le schéma est entièrement décrit par les migrations SQL versionnées dans [`supabase/migrations/`](../supabase/migrations/). On ne modifie jamais la base à la main : tout changement passe par une nouvelle migration.

## Migrations

| Fichier | Contenu |
|---|---|
| `20261126000100_extensions_enums_helpers.sql` | Extension `pg_trgm`, tous les types énumérés, fonctions de trigger génériques |
| `20261126000200_profiles_and_roles.sql` | Table `profiles`, fonctions de rôle, protection des rôles, synchronisation avec `auth.users` |
| `20261126000300_studio_and_games.sql` | `studio_settings`, `team_members`, `games`, `game_metrics` |
| `20261126000400_projects_tasks_agents.sql` | `projects`, `project_members`, `tasks`, `agents`, `agent_events` |
| `20261126000500_finance_and_market.sql` | `finance_transactions`, `game_watchlist`, `watchlist_snapshots`, `game_ideas` |
| `20261126000600_system_tables.sql` | `notifications`, `activity_logs`, `integrations`, `assistant_conversations`, `assistant_messages` |
| `20261126000700_rls_policies.sql` | Privilèges et politiques RLS de toutes les tables |
| `20261126000800_activity_log_triggers.sql` | Journal d'activité automatique |
| `20261126000900_structural_rows.sql` | Lignes structurelles (réglages du studio, intégrations) |
| `20261126001000_pending_access.sql` | Rôle facultatif : `NULL` = compte en attente, sans accès ; les lectures exigent au moins `viewer` |
| `20261126001100_role_from_app_metadata.sql` | Applique `app_metadata.role` (invitation) quand Supabase l'écrit, uniquement sur un profil encore en attente |
| `20261126001200_team_member_for_profiles.sql` | Crée automatiquement la fiche « membre d'équipe » de tout compte qui reçoit un rôle (nom et avatar synchronisés) |
| `20261126001300_market_snapshots.sql` | `market_snapshots` : rang et joueurs de chaque jeu des classements Roblox, un relevé par jour (écrit uniquement par la tâche quotidienne) |
| `20261127000100_ai.sql` | Claude : colonnes `ai_assistant_enabled` et `ai_monthly_budget_usd` sur `studio_settings` (modifiables par l'**Owner seulement**, trigger `guard_ai_settings`) ; `ai_usage` (une ligne par requête à Claude, coût estimé — lecture Owner) ; `idea_runs` et `weekly_ideas` (idées hebdomadaires Steam → Roblox, en anglais et en français — lecture Viewer+, écriture par la clé secrète uniquement) |
| `20261126001500_game_payouts.sql` | `game_payouts` : Robux mensuels par jeu de **Creator Rewards** et **Roblox Plus**, saisis depuis le Creator Hub (aucune API Roblox ne les fournit) ; lecture Viewer+, saisie Admin+ |
| `20261126001400_notifications_for_work.sql` | `profiles.notification_prefs` + triggers qui notifient un membre quand quelqu’un d’autre lui assigne une tâche ou l’ajoute à un projet (désactivable dans *Settings → Notifications*) |

**Conventions :**
- clés primaires `uuid` ;
- dates en `timestamptz` ;
- `created_at` et `updated_at` gérés par trigger ;
- un index sur chaque clé étrangère et sur les colonnes de tri et de filtre ;
- RLS activée sur **toutes** les tables dès leur création.

## Tables

| Table | Rôle | Colonnes clés | Relations |
|---|---|---|---|
| `profiles` | Un profil par compte, porte le **rôle d'accès** | `email` (copie, lecture seule), `full_name`, `avatar_url`, `role`, `notification_prefs` | 1-1 avec `auth.users` (suppression en cascade) |
| `studio_settings` | Réglages du studio, **ligne unique** | `studio_name` (« Dashboard »), `currency` (USD), `timezone`, `devex_rate_usd` | — |
| `team_members` | Membres du studio, avec ou sans compte | `display_name`, `studio_role` (intitulé de poste), `status`, `joined_at` | `profile_id` → `profiles`, optionnel et unique |
| `games` | Jeux Roblox du studio | `universe_id` (unique), `place_id`, `name`, `genre`, `status`, `launched_at` | `created_by` → `profiles` |
| `game_metrics` | Séries temporelles par jeu, ajout uniquement | `period` (heure/jour), `recorded_at`, `ccu`, `peak_ccu`, `dau`, `visits`, `favorites`, `revenue_robux`, `retention_d1/d7/d30` (0 à 1), `source` | `game_id` → `games` (cascade) ; unique sur (`game_id`, `period`, `recorded_at`) |
| `projects` | Projets du studio | `name`, `slug` (unique), `status`, `progress` (0 à 100), `target_release_date`, `completed_at` | `game_id` → `games` (mis à NULL si le jeu est supprimé) |
| `project_members` | Membres associés à un projet | `role` | `projects` ↔ `team_members`, clé primaire composée |
| `tasks` | Tâches | `title`, `priority`, `status`, `due_date`, `completed_at`, `position` | `project_id` → `projects` (cascade), `assignee_id` → `team_members` |
| `agents` | Agents IA suivis | `name`, `mission`, `status`, `model`, `started_at`, `last_activity_at` | `project_id` → `projects` |
| `agent_events` | Historique des agents, ajout uniquement | `type`, `message`, `payload` (JSON) | `agent_id` → `agents` (cascade) |
| `finance_transactions` | Revenus et dépenses saisis | `type`, `category`, `amount` (> 0), `currency` (USD), `robux_amount`, `occurred_on` | `game_id`, `project_id` (optionnels) |
| `game_watchlist` | Jeux Roblox d'autres studios suivis | `universe_id` (unique), `name`, `genre`, `notes` | `added_by` → `profiles` |
| `watchlist_snapshots` | Historique de suivi, ajout uniquement | `recorded_at`, `ccu`, `visits`, `favorites` | `watchlist_id` → `game_watchlist` (cascade) |
| `game_ideas` | Bibliothèque d'idées | `title`, `pitch`, `genre`, `core_loop`, `monetization`, `score` (0 à 100), `week_of` (un lundi), `origin`, `status` | `created_by` → `profiles` |
| `notifications` | Boîte de réception de chaque utilisateur | `type`, `title`, `body`, `link`, `read_at` | `user_id` → `profiles` (cascade) |
| `activity_logs` | Journal d'audit, écrit uniquement par trigger | `action`, `entity_type`, `entity_id`, `entity_label`, `metadata` | `actor_id` → `profiles` |
| `integrations` | État des connexions externes | `provider` (unique), `status`, `config` (non sensible), `last_sync_at`, `last_error` | — |
| `assistant_conversations` | Conversations avec l'assistant IA | `title` | `user_id` → `profiles` (cascade) |
| `assistant_messages` | Messages d'une conversation | `role` (user/assistant), `content`, `metadata` | `conversation_id` → `assistant_conversations` (cascade) |

### Relations principales

```
auth.users 1─1 profiles 1─0..1 team_members
games 1─n game_metrics          games 1─n projects
projects 1─n tasks              projects n─n team_members   (project_members)
projects 1─n agents 1─n agent_events
team_members 1─n tasks          (responsable)
game_watchlist 1─n watchlist_snapshots
profiles 1─n notifications      profiles 1─n assistant_conversations 1─n assistant_messages
```

### Règles métier gérées par la base

- **`completed_at` se remplit tout seul.** Il prend la date du jour quand une tâche passe à `done` ou un projet à `completed`, et se vide si le statut change ensuite.
- **L'auteur ne peut pas être modifié.** Les colonnes `created_by` et `added_by` ne peuvent être réécrites que vers NULL (ce que fait la base quand le compte de l'auteur est supprimé). Sans ça, quelqu'un pourrait s'attribuer une tâche pour avoir le droit de la supprimer.
- **Chaque nouvel événement d'agent** met à jour `agents.last_activity_at`.
- **Chaque nouveau message de l'assistant** fait remonter sa conversation en haut de l'historique.
- **Catégorie de transaction cohérente avec son type :**
  - revenu : `roblox_payout`, `devex`, `sponsorship`, `other` ;
  - dépense : `development`, `advertising`, `tools`, `salaries`, `assets`, `other`.

## Types énumérés

| Type | Valeurs |
|---|---|
| `app_role` | `owner`, `admin`, `developer`, `viewer` |
| `member_status` | `active`, `inactive` |
| `game_status` | `in_development`, `testing`, `live`, `paused`, `archived` |
| `metric_period` | `hour`, `day` |
| `project_status` | `planning`, `in_progress`, `testing`, `completed`, `on_hold`, `cancelled` |
| `task_status` | `todo`, `in_progress`, `in_review`, `done`, `cancelled` |
| `task_priority` | `low`, `medium`, `high`, `critical` |
| `agent_status` | `working`, `waiting`, `completed`, `error`, `offline` |
| `agent_event_type` | `started`, `progress`, `waiting`, `completed`, `error`, `log`, `status_change` |
| `transaction_type` | `revenue`, `expense` |
| `transaction_category` | `roblox_payout`, `devex`, `sponsorship`, `development`, `advertising`, `tools`, `salaries`, `assets`, `other` |
| `idea_origin` | `manual`, `ai` |
| `idea_status` | `suggested`, `saved`, `archived` |
| `notification_type` | `info`, `success`, `warning`, `error`, `task`, `agent`, `finance`, `system` |
| `integration_provider` | `roblox`, `anthropic` |
| `integration_status` | `disconnected`, `connected`, `error` |
| `assistant_role` | `user`, `assistant` |

## Sécurité

### Rôles

Le rôle d'un compte est stocké dans `profiles.role`. Les politiques s'appuient sur deux fonctions :
- `public.current_app_role()` renvoie le rôle de l'utilisateur connecté ;
- `public.has_min_role(role)` vérifie que l'utilisateur a au moins ce niveau (owner > admin > developer > viewer).

Ces fonctions s'exécutent avec les droits du propriétaire de la base (`SECURITY DEFINER`) et un `search_path` vide.

### Tableau des droits et règles RLS correspondantes

| Capacité | Owner | Admin | Developer | Viewer | Mise en œuvre |
|---|:-:|:-:|:-:|:-:|---|
| Consulter jeux, métriques, projets, tâches, agents, marché, idées, équipe | ✓ | ✓ | ✓ | ✓ | `select … using (true)` pour tout utilisateur connecté |
| Créer ou modifier projets, tâches, idées, watchlist, agents | ✓ | ✓ | ✓ | — | `has_min_role('developer')` ; à la création, l'auteur doit être l'utilisateur lui-même |
| Supprimer projets et agents | ✓ | ✓ | — | — | `has_min_role('admin')` |
| Supprimer les tâches, idées et éléments de watchlist des autres | ✓ | ✓ | — | — | Admin+, ou Developer+ s'il en est l'auteur |
| Ajouter ou modifier les jeux du studio et leurs métriques | ✓ | ✓ | — | — | `has_min_role('admin')` |
| Finance (lecture **et** écriture) | ✓ | ✓ | — | — | `has_min_role('admin')` sur toutes les opérations |
| Gérer l'équipe, les intégrations, les réglages du studio | ✓ | ✓ | — | — | Lecture pour tous, écriture `has_min_role('admin')` |
| Changer les rôles | ✓ | — | — | — | Trigger `guard_profile_changes` |

**Données personnelles (propriétaire uniquement) :**
- `notifications` : chacun ne voit que les siennes et ne peut modifier que la colonne `read_at`.
- `assistant_conversations` et `assistant_messages` : strictement privées à chaque utilisateur.

**Journal d'activité :**
- lisible par tous les membres, **sauf** les entrées financières, réservées à Owner et Admin ;
- aucune politique d'écriture : il n'est rempli que par le trigger `log_activity`.

### Protections supplémentaires

- **`guard_profile_changes`** :
  - personne ne peut changer son propre rôle ;
  - seul un Owner change les rôles des autres ;
  - l'email du profil est en lecture seule ;
  - le **dernier Owner** ne peut être ni rétrogradé ni supprimé, même par le serveur.
- **Aucun privilège pour `anon`** : tables, séquences et fonctions lui sont retirées. Il faut être connecté pour tout.
- **La clé secrète (`service_role`) contourne RLS.** Elle ne s'utilise que côté serveur (invitations, synchronisation Roblox, réception des événements d'agents). Le code qui l'utilise doit donc faire ses propres vérifications de droits. Exemple : un Admin ne peut ni inviter ni retirer un Owner.
- **Aucun secret en base.** Les clés API (Roblox Open Cloud, Anthropic) vivent dans les variables d'environnement du serveur ; `integrations.config` ne contient que des réglages non sensibles.

## Règle absolue : aucune donnée de démonstration en base

- Les données de démonstration vivent uniquement dans le code de l'application (données d'exemple typées) et sont étiquetées **DEMO** dans l'interface.
- La base ne contient que de vraies données et les lignes structurelles de la migration `0900` (le réglage unique du studio et les intégrations à l'état `disconnected`).
- `game_metrics.source` n'accepte que `roblox_public_api`, `roblox_open_cloud` ou `manual` : la valeur `demo` est refusée par une contrainte.
- La création des données d'exemple de Supabase (le fichier « seed ») est désactivée dans `supabase/config.jsonc`.

## Appliquer les migrations

Prérequis : `SUPABASE_DB_URL` renseignée dans `.env.local` (Supabase → **Connect** → **Direct** → **Session pooler**, en remplaçant `[YOUR-PASSWORD]` **crochets compris** par le mot de passe de la base).

```bash
npm run db:push     # applique les migrations en attente, dans l'ordre
```

Le script `scripts/db.mjs` lit l'adresse dans `.env.local`, ne l'affiche jamais et masque toute chaîne de connexion dans la sortie. Pour une vérification sans rien modifier : `npx supabase db push --db-url <url> --dry-run`.

Sous Windows, si `npm` est introuvable, ajouter Node au PATH de la session :

```powershell
$env:PATH = "$env:LOCALAPPDATA\Programs\nodejs;$env:PATH"
```

**État actuel (26/11/2026)** : les 9 migrations sont appliquées sur le projet hébergé. Vérifié de l'extérieur : un visiteur non connecté (clé publique) reçoit « permission denied » sur toutes les tables ; la clé serveur voit les lignes structurelles (1 réglage studio, 2 intégrations).

## Générer les types TypeScript

Après chaque migration appliquée :

```bash
npm run db:types    # régénère src/types/database.ts depuis le schéma réel
```

Les trois clients Supabase (`src/lib/supabase/`) sont typés avec ce fichier : toute requête est vérifiée par TypeScript.

## Créer le premier Owner

Les inscriptions publiques sont désactivées : les comptes sont créés par invitation.

1. Dans le tableau de bord Supabase, aller dans **Authentication → Users → Add user**. Créer le compte avec son email et un mot de passe. Le profil est créé automatiquement **sans rôle** (en attente : connexion possible, aucune donnée visible).
2. Dans **SQL Editor**, promouvoir ce compte :

   ```sql
   update public.profiles set role = 'owner' where email = 'adresse@exemple.com';
   ```

   L'éditeur SQL est un contexte de confiance : le trigger de protection l'autorise.

**Ensuite**, les invitations se font depuis l'application (Settings → Members), côté serveur. Le rôle initial est passé dans `app_metadata.role` de l'invitation. Ce champ ne peut être écrit qu'avec la clé secrète. Supabase l'écrit juste après la création du compte : le trigger `on_auth_user_app_metadata_updated` l'applique alors au profil, seulement si celui-ci est encore en attente. Sans rôle valide, le compte reste en attente.

**État actuel (26/11/2026)** : un seul compte, Owner, avec sa fiche membre. 3 jeux enregistrés (Clean Old Stuff, Glider Obby, Home Creator). Inscriptions publiques désactivées (vérifié via l'API Auth).

## Réglages à reporter sur le projet hébergé

Le fichier `supabase/config.jsonc` décrit la configuration locale. Sur le projet hébergé, vérifier dans le tableau de bord :

- **Authentication → Sign In / Providers** : désactiver « Allow new users to sign up ».
- **Mots de passe** : 10 caractères minimum, avec minuscules, majuscules et chiffres.
- **Authentication → URL Configuration** :
  - Site URL = l'URL de production ;
  - Redirect URLs = `/auth/confirm`, `/auth/callback` et `/reset-password` pour le domaine de production et pour `http://localhost:3000`.
- **Double authentification (TOTP)** : à activer quand la fonctionnalité sera branchée dans Settings → Security.
