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

| Réel (Supabase / API publique) | Démo jusqu'à l'intégration |
|---|---|
| Projets, tâches, équipe, finances (saisies), liste des jeux, watchlist, idées saisies, notifications, réglages, **stats publiques Roblox** (CCU, visites, favoris) | Analytics Roblox (DAU, revenus, rétention — Open Cloud, phase 2), Discover/tendances, Top 5 idées IA, agents IA, assistant |

Garanties :
- toute donnée porte sa source (`DataResult<T>`), et un badge **DEMO** s'affiche automatiquement ;
- aucun chiffre ne combine les deux sources ;
- les données démo ne sont **jamais écrites en base** (la colonne `game_metrics.source` refuse même la valeur `demo`) ;
- les noms utilisés dans les exemples sont volontairement fictifs, sans ressemblance avec les jeux réels du studio.

## 6. Authentification et permissions

- Supabase Auth email + mot de passe, inscription publique désactivée, comptes créés par invitation.
- Rôles : Owner > Administrator > Developer > Viewer. Matrice dans `src/lib/auth/roles.ts`, affichée dans *Settings → Permissions*, et appliquée par les politiques RLS.
- Double authentification (TOTP Supabase) : prévue, activable plus tard.

## 7. Intégrations

| Source | Données | Accès | Phase |
|---|---|---|---|
| API publique Roblox (`games.roblox.com`) | CCU actuel, visites, favoris, genre, nom, miniature — pour n'importe quel jeu | Sans clé, appel serveur | 1 (avec *My Games*) |
| Roblox Open Cloud — Analytics Query API | DAU, revenus, rétention, ARPDAU… (granularité journalière) | Clé API avec `universe.analytics:read` sur vos expériences (bêta) | 2 |
| Claude (Anthropic) | Assistant connecté aux données du dashboard | `ANTHROPIC_API_KEY` côté serveur, SDK officiel, streaming, outils en lecture seule respectant les droits de l'utilisateur | 2 |

## 8. Avancement

| Jalon | Contenu | État |
|---|---|---|
| A | Architecture, initialisation, Supabase (code + migrations), design system, navigation | ✅ |
| B | Authentification, Overview | à venir |
| C | My Games, Projects, Tasks, AI Agents | à venir |
| D | Discover, Finance, Team, AI Assistant, Settings, Integrations | à venir |
| E | Tests, accessibilité, sécurité, déploiement | à venir |
