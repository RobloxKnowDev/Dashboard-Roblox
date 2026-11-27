# Design system

Référence vivante : la page **/design-system** de l'application (aussi accessible via Ctrl+K → « Design System »).
Tous les tokens sont dans `src/app/globals.css` (bloc `@theme`) : changer l'identité visuelle = modifier ce bloc.

## Concept

« Console de contrôle de studio » : fond quasi-noir légèrement froid, cartes un cran plus claires, bordures fines, une seule couleur signature utilisée avec parcimonie. Les données sont le seul élément autorisé à « crier ».

## Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `canvas` | `#08090b` | Fond de page |
| `surface` / `-2` / `-3` | `#0f1114` / `#15181c` / `#1b1f24` | Cartes / champs, survol / menus, popovers |
| `line` / `line-strong` | `#1f232a` / `#2b3039` | Bordures fines / bordures de contrôles |
| `fg` | `#edeef0` | Texte principal — contraste 16,3:1 sur carte |
| `fg-2` | `#a3a8b2` | Texte secondaire — 7,9:1 |
| `fg-3` | `#7d838e` | Texte atténué, labels — 5,0:1 (≥ 4,5 requis) |
| `fg-4` | `#5a606a` | **Décoratif uniquement** (3:1) — jamais pour du texte à lire |
| `accent` | `#c6f24e` | Signature « Volt » : action principale, page active, focus |
| `good` `warning` `serious` `critical` `info` | voir CSS | États — toujours accompagnés d'une icône ou d'un libellé |

Les contrastes ont été mesurés (WCAG) pour chaque encre sur chaque surface.

## Typographie

- **Mona Sans** (variable, axe de largeur) pour l'interface ; `font-display` = version élargie (wdth 112) pour les titres et le logo texte.
- **JetBrains Mono** pour les identifiants, les labels de section (10 px, majuscules, espacés) et les colonnes de chiffres.
- Chiffres proportionnels pour les grandes valeurs, `tabular` (chiffres à largeur fixe) pour les colonnes.

## Graphiques

- Palette catégorielle en **ordre fixe** (bleu, orange, aqua, jaune, magenta, vert, violet, rouge), validée avec l'outil de contrôle dataviz sur la surface des cartes : séparation daltonisme ΔE ≥ 8,4, vision normale ΔE ≥ 19,3, contraste ≥ 3:1. Valeurs dans `src/components/charts/theme.ts`.
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
| Affichage | `Card`, `Badge` (7 tons), `StatusDot`, `Avatar`, `AvatarGroup`, `Progress`, `Kbd`, `StatCard` |
| Données | `Table`, `DataTable` (tri, pagination), `ChartCard`, `TimeSeriesChart`, `BarChart`, `Sparkline` |
| Superpositions | `Modal`, `DropdownMenu`, `Popover`, `Tooltip`, `Tabs`, `SegmentedControl`, toasts (`sonner`) |
| États | `EmptyState`, `ErrorState`, `LoadingState`, `ChartSkeleton`, `ListSkeleton`, `ComingSoonPanel`, `DemoBadge`, `DemoBanner` |
| Navigation | `Sidebar` (repliable, mémorisée), `MobileNav`, `Topbar` (fil d'Ariane), `CommandPalette` (Ctrl/⌘+K), `NotificationCenter`, `UserMenu`, `PageHeader` |

## Règles

1. **Aucun bouton décoratif** : une fonction non développée utilise `ComingSoonButton` (désactivé, focusable, infobulle « Available in Phase 2 ») ou `ComingSoonPanel`.
2. **Toute donnée de démonstration porte le badge DEMO**, automatiquement via la source de la donnée.
3. Chaque bloc de données prévoit ses trois états : vide, chargement, erreur.
4. Focus clavier visible partout (contour accent), lien « Skip to content », animations désactivées si le système le demande.
5. Une seule action principale (bouton accent) par vue.
6. **Mobile d'abord pour les contrôles** : rien ne doit apparaître uniquement au survol (ajouter `pointer-coarse:opacity-100`), les rangées de filtres passent à la ligne (`flex-wrap`) ou défilent (`SegmentedControl` défile horizontalement), les fenêtres se dimensionnent en `dvh`. Sur écran tactile, les champs passent automatiquement à 16 px (règle globale dans `globals.css`) pour éviter le zoom d'iOS.
7. **Grilles et défilement horizontal** : une grille responsive part toujours de `grid-cols-1` (`minmax(0, 1fr)`) — sans cela, un tableau large élargit la colonne et toute la page sur téléphone. Un conteneur `overflow-x-auto` est aussi `relative`, sinon les libellés `sr-only` (positionnés en absolu) s'en échappent et créent un défilement horizontal de la page. Les libellés d'un `BarChart` sont raccourcis (« … ») à la largeur de chaque barre ; l'infobulle et la vue tableau gardent le nom complet. La mini-courbe d'une `StatCard` n'apparaît que si la carte fait au moins 15rem (requête de conteneur).
