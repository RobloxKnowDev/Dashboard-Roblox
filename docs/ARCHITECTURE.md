# Architecture

Application web privée de pilotage du studio : jeux Roblox, projets, tâches, agents IA, veille marché, finances.
Nom et logo provisoires (« Dashboard ») — ils se changent uniquement dans `src/config/site.ts` et `src/components/layout/logo.tsx`.

## 1. Stack

| Rôle | Choix |
|---|---|
| Framework | Next.js 16.4 (App Router, Turbopack, **Cache Components** + Partial Prefetching activés) |
| UI | React 19.3, TypeScript strict (`noUncheckedIndexedAccess`) |
| Styles | Tailwind CSS 4.3 — tokens dans `src/app/globals.css` (`@theme`) |
| Backend | Supabase (PostgreSQL, Auth, RLS) via `@supabase/ssr` |
| Graphiques | Recharts 3 |
| Composants accessibles | Radix UI (non stylé) + `cmdk` (palette de recherche) |
| Formulaires | react-hook-form + Zod |
| Icônes | lucide-react 1.x (attention : certains noms ont changé, ex. `TriangleExclamationPoint`, `Funnel`, `LoaderCircle`) |
| Tests | Playwright (E2E), Vitest (unitaires) |
| Hébergement | Vercel + domaine personnalisé |
| Langues | Interface **anglais + français** (dictionnaires maison, `next/root-params`) — voir §9 |
| IA | Claude via le SDK officiel `@anthropic-ai/sdk` — assistant (Haiku 5.5) et idées hebdomadaires (Opus 5.5) |

Interface bilingue (anglais / français), documentation en français. Devise de référence : USD (montants Robux stockés à part).

## 2. Principes

1. **Le serveur d'abord.** Les pages sont des Server Components qui lisent les données côté serveur ; les modifications passent par des Server Actions (validation Zod → vérification de permission → écriture → revalidation).
2. **Un dossier par domaine** : `src/features/<domaine>/` regroupe composants, accès aux données, actions, schémas et types.
3. **Les pages ne parlent jamais directement à Supabase** : elles appellent des fonctions de lecture par domaine, qui ont une implémentation *live* (Supabase) ou *demo* (données d'exemple).
4. **Sécurité en trois couches** : `proxy.ts` (redirection si non connecté) → vérification serveur dans l'espace privé → **RLS PostgreSQL**, la vraie barrière.
5. **Navigation à source unique** : `src/config/navigation.ts` alimente la sidebar, la recherche Ctrl+K et les droits par page.
6. **Intégrations derrière des interfaces** (`src/lib/integrations/`), secrets uniquement en variables d'environnement serveur.

## 3. Structure

```
src/
├─ app/
│  ├─ [lang]/                langue de l'interface (en | fr), choisie par le proxy — §9
│  │  ├─ layout.tsx          layout racine (html lang, polices, I18nProvider)
│  │  ├─ (auth)/             connexion, mot de passe oublié/réinitialisation
│  │  └─ (app)/              espace privé : layout sidebar + topbar, une page par section
│  │     ├─ overview/  discover/{,releases,ideas,watchlist}/  games/  projects/  tasks/
│  │     ├─ agents/  finance/  team/  assistant/  integrations/
│  │     ├─ settings/{general,profile,members,permissions,integrations,api,ai,notifications,security}/
│  │     └─ design-system/   référence interne de tous les composants
│  ├─ api/cron/              daily-snapshot, weekly-ideas (CRON_SECRET)
│  ├─ api/agents/            ingest, media — hooks Claude Code et pont du PC (jeton de machine, docs/AGENTS.md)
│  ├─ auth/                  callbacks e-mail (non localisés)
│  └─ globals.css
├─ i18n/           langues : config, dictionnaires messages/{en,fr}, accès serveur/client
├─ components/
│  ├─ ui/          primitives du design system (Button, Input, Select, Modal, Table, DataTable…)
│  ├─ charts/      graphiques Recharts thématisés + vue tableau accessible
│  ├─ data/        StatCard
│  ├─ feedback/    EmptyState, ErrorState, LoadingState, ComingSoon, DemoBadge
│  └─ layout/      Sidebar, Topbar, CommandPalette, NotificationCenter, UserMenu, PageHeader
├─ features/<domaine>/
├─ lib/
│  ├─ supabase/    client (navigateur), server (cookies, RLS), admin (clé secrète, serveur uniquement)
│  ├─ auth/        rôles + matrice de permissions `can()`
│  ├─ data/        DataResult<T>, sources, générateur démo déterministe
│  ├─ hooks/  utils/  env.ts
├─ config/         site · navigation · data-sources
supabase/          config + migrations SQL (voir docs/DATABASE.md)
tools/agents/      côté PC des agents IA : hooks, pont, partage de captures, installation (docs/AGENTS.md)
```

## 4. Règles Cache Components (Next.js 16)

Ces règles font échouer le build si elles ne sont pas respectées :

- **Lire la session (cookies) impose un `<Suspense>`.** Tout composant qui appelle `createClient()` de `lib/supabase/server.ts` doit être rendu sous une frontière `<Suspense>` avec un squelette en fallback. Ne jamais lire la session au niveau supérieur d'un layout.
- **Pas d'horloge ni d'aléatoire pendant le prérendu** (`new Date()`, `Date.now()`, `Math.random()`). Les données démo utilisent `DEMO_NOW` et `seededRandom()` (`lib/data/`) ; `formatRelative()` exige un « maintenant » explicite.
- **`usePathname()` suspend sur les routes dynamiques** : les éléments qui dépendent de l'URL (lien actif, fil d'Ariane) sont isolés sous `<Suspense>` avec un fallback identique sans surbrillance.
- **Les graphiques se montent uniquement dans le navigateur** (`useHydrated()`), avec un emplacement de même hauteur : Recharts mesure son conteneur et génère des identifiants non déterministes.
- `dynamicParams`, `dynamic`, `revalidate` n'existent plus avec Cache Components.

## 5. Données de démonstration et données réelles

Chaque domaine est déclaré `live` ou `demo` dans `src/config/data-sources.ts`.

| Réel (Supabase / API Roblox) | Démo jusqu'à l'intégration |
|---|---|
| Projets, tâches, équipe, finances (saisies), jeux, watchlist, idées saisies, notifications, réglages, **stats publiques Roblox** (joueurs en ligne, visites, favoris, notes) et **Roblox Analytics** (DAU, revenus, rétention, sessions — pour les jeux autorisés par la clé), alertes calculées, **Discover** (classements Roblox publics + historique quotidien), watchlist, bibliothèque d'idées, **Agents IA** (sessions Claude Code du PC du studio et missions) | L'assistant tant qu'`ANTHROPIC_API_KEY` n'est pas défini (réponses d'exemple, rien n'est enregistré) |

**Revenu d’un jeu** = ventes (métrique `DailyRevenue` de Roblox Analytics : game passes, developer products, serveurs privés, commissions avatar — vérifié via la ventilation `RevenueSource`) **+ Creator Rewards + Roblox Plus** (saisis chaque mois). Ce total alimente la page du jeu, l’Overview et l’estimation Roblox de Finance ; les alertes de revenu utilisent les ventes seules.

Garanties :
- toute donnée porte sa source (`DataResult<T>`), et un badge **DEMO** s'affiche automatiquement ;
- aucun chiffre ne combine les deux sources ;
- les données démo ne sont **jamais écrites en base** (la colonne `game_metrics.source` refuse même la valeur `demo`) ;
- les noms utilisés dans les exemples sont volontairement fictifs, sans ressemblance avec les jeux réels du studio.

## 6. Authentification et permissions

- Supabase Auth email + mot de passe, inscription publique désactivée.
- **Création de comptes** : *Settings → Members* → « Create account » (aucun e-mail envoyé) ; un mot de passe temporaire est affiché **une seule fois**, à transmettre en privé ; la personne le change dans *Settings → Profile*. Un Owner peut créer tous les rôles, un Admin seulement Developer/Viewer.
- **Gestion des accès** (Owner uniquement) : changer un rôle, approuver un compte en attente, retirer l’accès (le compte repasse « en attente »), supprimer le compte (sa fiche d’équipe reste, inactive, pour garder l’historique). On ne peut jamais modifier son propre rôle ni retirer le dernier Owner (garde en base).
- Les personnes **sans compte** (freelances…) s’ajoutent depuis la page *Team* et peuvent recevoir projets et tâches.
- Rôles : Owner > Administrator > Developer > Viewer. Matrice dans `src/lib/auth/roles.ts`, affichée dans *Settings → Permissions*, et appliquée par les politiques RLS.
- **Compte « en attente »** : un compte sans rôle (`profiles.role = NULL`) peut se connecter mais ne voit aucune donnée (RLS) et l'interface affiche « Access pending ». Le rôle initial d'une invitation passe par `app_metadata.role` (modifiable uniquement avec la clé secrète).
- Double authentification (TOTP Supabase) : prévue, activable plus tard.

### Fonctionnement (jalon B)

| Couche | Fichier | Rôle |
|---|---|---|
| 1. Proxy | `src/proxy.ts` + `src/lib/supabase/proxy.ts` | Rafraîchit la session (`getClaims()` vérifie la signature du jeton) ; visiteur anonyme → `/login?next=…` |
| 2. Serveur | `src/lib/auth/session.ts` (`getSessionUser`, `checkAccess`) + `AccessGate` / `RequireRole` | Revérifie l'utilisateur pour chaque page ; bloque les comptes en attente ; pages Admin/Owner → « access denied » |
| 3. Base | politiques RLS | Décide réellement quelles lignes chaque utilisateur peut lire ou modifier |

- Pages publiques : `/login`, `/forgot-password`, `/reset-password`, `/auth/callback` (lien e-mail PKCE, même navigateur), `/auth/confirm` (lien e-mail par `token_hash`, multi-appareils).
- `?next=` après connexion : uniquement des chemins internes (`safeNextPath`, testé contre `//evil.com`, `javascript:`, injection d'en-têtes…).
- Messages d'erreur génériques : le formulaire ne révèle jamais si un e-mail a un compte.
- Le menu latéral masque Finance et Integrations sous le rôle Admin.

### Pièges rencontrés (à connaître)

- **React 19 réinitialise les champs non contrôlés après une Server Action** : les champs à conserver après une erreur (e-mail) doivent être contrôlés (`value` + `onChange`).
- **Radix `asChild` exige un seul enfant** : `DropdownMenuItem` n'ajoute pas de raccourci clavier quand `asChild` est utilisé.
- **Supabase écrit `app_metadata` après l'insertion du compte** : le rôle d'invitation est appliqué par le trigger `on_auth_user_app_metadata_updated`.
- **Une valeur (tableau, constante) exportée d'un fichier `"use client"` n'est pas utilisable côté serveur** : c'est une référence client. Les constantes partagées vivent dans des fichiers neutres (ex. `features/projects/tabs.ts`).
- **Supabase lit l'horloge** (expiration de session) : `createClient()` serveur appelle `connection()` pour ne jamais s'exécuter pendant un prérendu.
- **Next.js 16 garde les pages précédentes cachées dans le DOM** (navigation instantanée) : dans les tests, cibler `#main` et les éléments visibles.

## 7. Intégrations

| Source | Données | Accès | Phase |
|---|---|---|---|
| API publique Roblox (`games.roblox.com`, `thumbnails.roblox.com`) | Joueurs en ligne, visites, favoris, votes, genre, nom, icône — pour n'importe quel jeu | Sans clé, appel serveur, cache 1 min | ✅ jalon C |
| Creator Rewards et Roblox Plus | Robux versés par Roblox en plus des ventes du jeu | **Aucune API** (vérifié) : saisie mensuelle par jeu sur la page du jeu (table `game_payouts`) ; sur les périodes en jours, chaque mois est réparti au prorata des jours (estimation signalée « est. ») | ✅ jalon D |
| Roblox Open Cloud — Analytics Query API | DAU, revenus (Robux), visites, pic de joueurs (28 j), session moyenne, rétention J1/J7/J30 ; **acquisition** (joueurs touchés et joueurs ayant joué par source, taux de clic, qualified play-through, nouveaux/revenants) ; **first play bounce rate** (0–60 s et 61–180 s, joueurs venus des recommandations) ; **miniatures** (impressions et qualified play-through par miniature, 30 j max) | Clé(s) API avec `universe.analytics:read` : `ROBLOX_OPEN_CLOUD_API_KEY`, puis `_2`…`_5` si les jeux sont dans plusieurs groupes (chaque jeu utilise automatiquement la clé qui fonctionne) ; cache 1 h ; sans autorisation → message explicatif | ✅ jalon C, acquisition et miniatures ajoutées après D |
| Roblox Ads (campagnes sponsorisées) | Impressions, clics, dépense par campagne | Les métriques `SponsoredAds*` sont lisibles avec la clé actuelle, mais le nom et le statut des campagnes demandent la permission `ad.campaign:read` (refusée aujourd'hui) | Mis de côté à la demande du studio |
| Claude (Anthropic) — assistant | Réponses à partir des vraies données du studio : 8 outils en lecture seule (vue studio, stats d'un jeu + acquisition, finances, projets, tâches, équipe, classements Roblox, idées) | **Claude Haiku 5.5** (choix du studio : tous les rôles y ont accès), effort bas, boucle d'outils du SDK (`toolRunner`, 6 tours max). Les outils s'exécutent avec la session de l'utilisateur : la RLS décide de ce qu'il voit (la Finance reste Admin+). Conversations enregistrées par utilisateur (`assistant_conversations`). Sans `ANTHROPIC_API_KEY` → mode démo | ✅ |
| Claude — idées de jeux hebdomadaires | Top 5 d'idées inspirées des tendances **Steam**, chacune **vérifiée sur Roblox** avant d'être proposée, + liste « Déjà sur Roblox » | Chaque lundi 07:00 UTC (`/api/cron/weekly-ideas`, `CRON_SECRET`) et bouton « Générer maintenant » (Owner, `after()`). Pipeline `features/ideas/pipeline.ts` : collecte Steam → **Claude Opus 5.5** choisit ≤ 12 jeux adaptables et écrit les recherches Roblox → recherche Roblox (même moteur que l'app) + visites → Opus 5.5 juge « existe / similaire / libre » et rédige le Top 5 en anglais **et** en français. Repli serveur en cas de refus (`fallbacks: "default"`). ≈ 0,30–0,60 $ par génération | ✅ |
| Steam (API publiques, sans clé) | Jeux les plus joués, nouveautés populaires, top SteamSpy 14 j, fiche de chaque jeu (genres, prix, sortie, avis), joueurs en ligne | `lib/integrations/steam.ts`. Le store Steam renvoie « Access Denied » quelques minutes après ~150 requêtes rapprochées : 90 fiches max, 2 à la fois, pause de 250 ms, arrêt après 5 refus. L'API des notes d'avis refuse les appels automatisés (seul le nombre d'avis est gardé) ; la page « top releases » n'est plus mise à jour depuis 2025 (ignorée si > 4 mois) | ✅ |
| Recherche Roblox | Vérifier qu'une idée n'existe pas déjà | `lib/integrations/roblox/search.ts` (`omni-search`, publique) : joueurs en ligne, votes ; sponsorisés exclus | ✅ |
| Coût et garde-fous IA | — | Chaque requête est journalisée dans `ai_usage` avec un coût estimé (tarifs publics). *Réglages → IA* (Owner) : activer/couper l'assistant, **budget mensuel** (20 $ par défaut) au-delà duquel l'assistant et les générations manuelles s'arrêtent, consommation du mois | ✅ |
| Claude Code — agents IA | Sessions Claude Code du PC du studio (VS Code, terminal) et **missions** lancées depuis le dashboard, en direct : consignes, actions résumées, réponses, captures Roblox Studio / Blender | Hooks Claude Code + pont local (`tools/agents/`) → `/api/agents/ingest` et `/api/agents/media` avec un **jeton par PC** (empreinte en base, table `agent_machines`). Lecture Owner/Admin ; écrire aux agents : **les Owners**. Missions en mode de permissions **auto**, avec la connexion Claude Code du PC. Serveurs MCP Roblox Studio (intégré à Studio) et Blender. Détails : [AGENTS.md](AGENTS.md) | ✅ |
| Tâches planifiées (Vercel Cron) | Classements Roblox, watchlist, statistiques publiques des jeux → historique ; idées de jeux | `/api/cron/daily-snapshot` à 06:00 UTC et `/api/cron/weekly-ideas` le lundi à 07:00 UTC (`maxDuration` 300 s), protégées par `CRON_SECRET`, écrivent avec `SUPABASE_SECRET_KEY` | ✅ |

### Page d'un jeu : onglets de statistiques

Les statistiques d'un jeu sont réparties en trois onglets (`?tab=`, à côté de `?range=`) : **Performance** (DAU, revenus, rétention, sessions, alertes, Creator Rewards & Roblox Plus), **Acquisition** et **Thumbnails**. Roblox décompte chaque point de donnée (jour × métrique × valeur de ventilation) : un onglet n'interroge Roblox **que lorsqu'on l'ouvre**, et ses liens ne sont pas préchargés.

- **Acquisition** : 8 requêtes, 90 jours maximum (la période 12 mois affiche les 90 derniers jours, signalé à l'écran). Sources connues (recommandations d'accueil, recherche, Continue, amis, pubs sponsorisées) avec une couleur fixe ; deux sources inconnues au plus gardent leur ligne, le reste est regroupé dans « Other ». Le « Play rate » d'une source est masqué quand les parties dépassent les impressions (liens, téléportations…). Calculs purs dans `features/games/acquisition-compute.ts` (testés).
- **Thumbnails** : 2 requêtes + images publiques des assets ; Roblox ne garde que 30 jours. Le qualified play-through est pondéré par les impressions ; une « meilleure miniature » n'est désignée qu'entre au moins deux miniatures ayant ≥ 5 % et ≥ 200 impressions.
- Les valeurs sont des joueurs uniques par jour, additionnées sur la période.

L’état de chaque connexion est visible en direct dans *Integrations* (Admin+) ; *Settings → API Configuration* (Owner) indique quelles variables d’environnement sont définies, **sans jamais afficher leur valeur**.

## 8. Avancement

| Jalon | Contenu | État |
|---|---|---|
| A | Architecture, initialisation, Supabase (code + migrations), design system, navigation | ✅ |
| B | Authentification (connexion, mot de passe oublié/réinitialisation, protection des routes, rôles, compte en attente, déconnexion), Overview (KPI, 4 graphiques, listes, filtres de période) | ✅ |
| C | My Games (Roblox en direct + analytics), Projects (cartes/tableau, membres), Tasks (4 vues, filtres), AI Agents (démo), Overview sur données réelles, Settings → Profile | ✅ |
| D | Discover (classements Roblox réels, sorties récentes, watchlist, idées, tâche quotidienne), Finance (transactions, 6 KPI, 4 graphiques, estimation Roblox séparée), Team (fiches, projets, tâches, activité ; membres sans compte), Settings → Members (création de comptes, rôles), AI Assistant (interface, mode démo), Settings (General, Notifications, Security, API, Integrations), Integrations (état en direct), notifications « tâche assignée » / « ajouté à un projet » | ✅ |
| D+ | Page jeu : onglets Acquisition (sources, conversion, first play bounce rate, nouveaux/revenants) et Thumbnails ; passe mobile (champs à 16 px sur écrans tactiles, fenêtres à la hauteur visible, sélecteurs défilants, titres de cartes qui passent à la ligne, assistant utilisable sur téléphone) | ✅ |
| D++ | Interface **anglais/français** (sélecteur dans le menu du compte et Réglages → Profil), **Claude connecté** (assistant Haiku 5.5 sur les vraies données, idées hebdomadaires Steam → Roblox avec Opus 5.5, Réglages → IA pour l'Owner) | ✅ |
| D+++ | **Agents IA en direct** : sessions Claude Code du PC visibles en temps réel, messages livrés en fin d'étape ou par le pont, missions par rôle (UI, construction, scripts, QA, art 3D), captures partagées, PC connectés dans Réglages → API | ✅ |
| D+++++ | **Nouveau style** (noir et bleu inspiré des dashboards d'agences : police Inter, bloc « Résumé » avec le chiffre clé en bleu, bulles (i) qui expliquent chaque chiffre, menu regroupé, sélecteur de jeu en haut, menu repliable depuis la barre du haut), page **Gains** (dollars uniquement, aucune mention de la plateforme, plein écran), Owners pilotes des agents, suppression d'agents, images dans les messages aux agents | ✅ |
| D++++ | **Équipes de jeu** : bouton « Nouveau jeu » → un manager crée le projet (modèle Rojo, assets, place), fait écrire le design, attend l'OK, puis délègue à game designer, build, UI, SFX, scripts, QA, art 3D ; rapports renvoyés au manager ; 3 agents en parallèle |
| E | Tests, accessibilité, sécurité, déploiement | à venir |

## 9. Langues (anglais / français)

- **Aucune langue dans l'adresse.** Le proxy (`src/proxy.ts`) choisit la langue — cookie `lang` (choix de l'utilisateur), sinon la langue du navigateur — et **réécrit** chaque page vers `/[lang]/…` : toutes les pages vivent sous `src/app/[lang]/` et sont prérendues une fois par langue (`generateStaticParams` du layout racine). Une adresse `/fr/…` partagée est mémorisée puis redirigée vers l'adresse sans préfixe. Les routes `/api` et `/auth` ne sont pas localisées.
- **Textes** : `src/i18n/messages/{en,fr}/<domaine>.ts`. L'anglais est le **type de référence** : une clé manquante ou en trop en français fait échouer le typecheck. Valeurs : chaînes, ou fonctions pour les textes à variables.
- **Accès** : composants serveur → `await getT()`, `await getFormat()`, `await getI18n()` (`src/i18n/server.ts`, via `next/root-params`) ; composants client → `useT()`, `useFormat()`, `useLocale()` ; composants partagés → `<Msg k="…" />` ; Server Actions et routes → `getRequestT()` (cookie). Les messages Zod sont des **clés** (`"auth.validation.emailRequired"`) traduites à l'affichage par `useMessage()`.
- **Formats** : `createFormat(locale)` (`src/lib/utils/format.ts`) — dates, nombres, devises et pourcentages au format de la langue (fr : « 26 nov. 2026 », « 1 234,5 $ »). Les montants saisis acceptent la virgule décimale.
- **Changer de langue** : Server Action `setLocale` (pose le cookie, ce qui vide le cache du routeur), puis `router.refresh()`.
- **Règle** : aucun texte d'interface en dur — tout passe par les dictionnaires. Les données (noms de jeux, de projets…) ne sont jamais traduites ; l'IA écrit ses idées dans les deux langues.
