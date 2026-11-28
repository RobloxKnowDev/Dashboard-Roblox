# Design system

Référence vivante : la page **/design-system** de l'application (aussi accessible via Ctrl+K → « Design System »).
Tous les tokens sont dans `src/app/globals.css` (bloc `@theme`) : changer l'identité visuelle = modifier ce bloc.

## Concept

Inspiré des dashboards d'agences de créateurs (style Infloww, version sombre), en **noir et violet Nexya** (la couleur du logo du studio, choix du 28/11/2026) : fond noir neutre, cartes un cran plus claires à bordures fines, **un seul violet** pour les actions, les barres et le chiffre clé. Priorité à la **compréhension** : chaque chiffre a un nom simple (« Joueurs en ligne » plutôt que « CCU ») et une bulle **(i)** qui l'explique.

## Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `canvas` | `#0c0c0e` | Fond de page |
| `surface` / `-2` / `-3` | `#151517` / `#1c1c1f` / `#232327` | Cartes / champs, survol / menus, popovers |
| `line` / `line-strong` | `#26262b` / `#34343a` | Bordures fines / bordures de contrôles |
| `fg` | `#f4f4f5` | Texte principal — contraste 16,6:1 sur carte |
| `fg-2` | `#a8a8b0` | Texte secondaire — 7,7:1 |
| `fg-3` | `#8a8a93` | Texte atténué, labels — 5,3:1 (≥ 4,5 requis, 4,6:1 sur `surface-3`) |
| `fg-4` | `#5b5b63` | **Décoratif uniquement** — jamais pour du texte à lire |
| `accent` | `#b01dfb` | Violet Nexya (pris dans le logo) : boutons principaux (texte blanc 4,8:1), barres, page active, focus, grand chiffre clé |
| `accent-ink` | `#c788ff` | **Texte et liens en violet** (≥ 6,2:1 sur toutes les surfaces) — `accent` est réservé aux aplats et aux très grands chiffres |
| `good` `warning` `serious` `critical` `info` | voir CSS | États — toujours accompagnés d'une icône ou d'un libellé |

Les contrastes ont été mesurés (WCAG) pour chaque encre sur chaque surface.

## Typographie

- **Inter** pour toute l'interface (lisible même en petit) ; `font-display` = Inter resserré (−0,02 em) pour les titres.
- **JetBrains Mono** seulement pour les identifiants (numéros d'univers, chemins). Les libellés de section sont en minuscules normales (plus de petites majuscules espacées).
- Chiffres proportionnels pour les grandes valeurs, `tabular` (chiffres à largeur fixe) pour les colonnes.

## Graphiques

- Palette catégorielle en **ordre fixe** (violet Nexya `#b01dfb`, orange, aqua, jaune, magenta, vert, bleu, rouge), validée avec l'outil de contrôle dataviz sur la surface des cartes `#151517` : séparation daltonisme ΔE ≥ 8,4, vision normale ΔE ≥ 19,3, contraste ≥ 3:1. Valeurs dans `src/components/charts/theme.ts`.
- Les évolutions dans le temps de montants (revenus, gains) sont en **barres violettes** (une par jour ou par mois, dates espacées sur l'axe : `timeAxis`).
- Une couleur suit l'entité, jamais son rang ; on ne génère jamais de 9ᵉ couleur.
- Traits de 2 px, aplats à ~10 %, barres ≤ 24 px aux coins arrondis côté valeur, grille horizontale en filet, axes discrets, **jamais deux axes Y**.
- Survol : réticule + une infobulle listant toutes les séries (courbes) ; infobulle par barre (barres).
- Chaque graphique a une **vue tableau** (bouton dans l'en-tête de la carte) : aucune valeur n'est accessible uniquement au survol.
- Légende dès 2 séries ; aucune pour une seule série (le titre suffit).
- Filtres de période sur une seule ligne, au-dessus des graphiques qu'ils pilotent.

## Composants

| Catégorie | Composants |
|---|---|
| Actions | `Button` (primary, secondary, outline, ghost, danger · sm/md/lg/icon · loading), `ComingSoonButton` |
| Formulaires | `Input`, `SearchInput`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Field` (label + aide + erreur reliés pour les lecteurs d'écran) |
| Affichage | `Card` (+ `info` dans `CardHeader`), `Badge` (7 tons), `StatusDot`, `Avatar`, `AvatarGroup`, `Progress`, `Kbd`, `StatCard` (grand chiffre, nom dessous, (i), icône colorée `IconTile`), `SummaryPanel` (bloc « Résumé » : chiffre clé en bleu + 4 chiffres), `InfoTip` (la bulle (i), ouverte au clic/toucher) |
| Données | `Table`, `DataTable` (tri, pagination), `ChartCard`, `TimeSeriesChart`, `BarChart`, `Sparkline` |
| Superpositions | `Modal`, `DropdownMenu`, `Popover`, `Tooltip`, `Tabs`, `SegmentedControl`, toasts (`sonner`) |
| États | `EmptyState`, `ErrorState`, `LoadingState`, `ChartSkeleton`, `ListSkeleton`, `ComingSoonPanel`, `DemoBadge`, `DemoBanner` |
| Navigation | `Sidebar` (5 groupes : Accueil, Mes jeux, Marché Roblox, Studio, Configuration ; repliable en icônes avec le bouton `SidebarToggle` en haut à gauche, mémorisé), `MobileNav`, `Topbar` (`GameSwitcher` : vue studio ou page d'un jeu), `CommandPalette` (Ctrl/⌘+K), `NotificationCenter`, `UserMenu`, `PageHeader` (titre + (i) + une phrase qui dit à quoi sert la page) |

## Règles

1. **Aucun bouton décoratif** : une fonction non développée utilise `ComingSoonButton` (désactivé, focusable, infobulle « Available in Phase 2 ») ou `ComingSoonPanel`.
2. **Toute donnée de démonstration porte le badge DEMO**, automatiquement via la source de la donnée.
3. Chaque bloc de données prévoit ses trois états : vide, chargement, erreur.
4. Focus clavier visible partout (contour accent), lien « Skip to content », animations désactivées si le système le demande.
5. Une seule action principale (bouton accent) par vue.
6. **Mobile d'abord pour les contrôles** : rien ne doit apparaître uniquement au survol (ajouter `pointer-coarse:opacity-100`), les rangées de filtres passent à la ligne (`flex-wrap`) ou défilent (`SegmentedControl` défile horizontalement), les fenêtres se dimensionnent en `dvh`. Sur écran tactile, les champs passent automatiquement à 16 px (règle globale dans `globals.css`) pour éviter le zoom d'iOS.
7. **Grilles et défilement horizontal** : une grille responsive part toujours de `grid-cols-1` (`minmax(0, 1fr)`) — sans cela, un tableau large élargit la colonne et toute la page sur téléphone. Un conteneur `overflow-x-auto` est aussi `relative`, sinon les libellés `sr-only` (positionnés en absolu) s'en échappent et créent un défilement horizontal de la page. Les libellés d'un `BarChart` sont raccourcis (« … ») à la largeur de chaque barre ; l'infobulle et la vue tableau gardent le nom complet. La mini-courbe d'une `StatCard` n'apparaît que si la carte fait au moins 15rem (requête de conteneur).
8. **Compréhensible d'abord** : pas de jargon dans les libellés (le terme technique va dans la bulle (i) entre parenthèses), chaque page a une phrase de description, chaque chiffre clé une bulle (i) en mots simples.
