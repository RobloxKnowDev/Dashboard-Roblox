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

Choix de langue : interface en anglais, documentation en français. Devise de référence : USD (montants Robux stockés à part).

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
│  ├─ (app)/                 espace privé : layout sidebar + topbar, une page par section
│  │  ├─ overview/  discover/{,releases,ideas,watchlist}/  games/  projects/  tasks/
│  │  ├─ agents/  finance/  team/  assistant/  integrations/
│  │  ├─ settings/{general,profile,members,permissions,integrations,api,notifications,security}/
│  │  └─ design-system/      référence interne de tous les composants
│  ├─ layout.tsx  globals.css
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
| Projets, tâches, équipe, finances (saisies), jeux, watchlist, idées saisies, notifications, réglages, **stats publiques Roblox** (joueurs en ligne, visites, favoris, notes) et **Roblox Analytics** (DAU, revenus, rétention, sessions — pour les jeux autorisés par la clé), alertes calculées | Discover/tendances, Top 5 idées IA, agents IA, assistant |

Garanties :
- toute donnée porte sa source (`DataResult<T>`), et un badge **DEMO** s'affiche automatiquement ;
- aucun chiffre ne combine les deux sources ;
- les données démo ne sont **jamais écrites en base** (la colonne `game_metrics.source` refuse même la valeur `demo`) ;
- les noms utilisés dans les exemples sont volontairement fictifs, sans ressemblance avec les jeux réels du studio.

## 6. Authentification et permissions

- Supabase Auth email + mot de passe, inscription publique désactivée, comptes créés par invitation.
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
| Roblox Open Cloud — Analytics Query API | DAU, revenus (Robux), visites, pic de joueurs (28 j), session moyenne, rétention J1/J7/J30 | Clé API avec `universe.analytics:read` **par jeu** ; cache 1 h ; sans autorisation → message explicatif | ✅ jalon C |
| Claude (Anthropic) | Assistant connecté aux données du dashboard | `ANTHROPIC_API_KEY` côté serveur, SDK officiel, streaming, outils en lecture seule respectant les droits de l'utilisateur | 2 |

## 8. Avancement

| Jalon | Contenu | État |
|---|---|---|
| A | Architecture, initialisation, Supabase (code + migrations), design system, navigation | ✅ |
| B | Authentification (connexion, mot de passe oublié/réinitialisation, protection des routes, rôles, compte en attente, déconnexion), Overview (KPI, 4 graphiques, listes, filtres de période) | ✅ |
| C | My Games (Roblox en direct + analytics), Projects (cartes/tableau, membres), Tasks (4 vues, filtres), AI Agents (démo), Overview sur données réelles, Settings → Profile | ✅ |
| D | Discover, Finance, Team, AI Assistant, Settings, Integrations | à venir |
| E | Tests, accessibilité, sécurité, déploiement | à venir |
