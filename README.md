# Dashboard — centre de contrôle du studio

Application web privée : jeux Roblox, projets, tâches, agents IA, veille marché, finances et équipe.
(Nom et logo provisoires.)

## Démarrer

Prérequis : Node.js ≥ 20.9 (installé : v24).

> Sur cette machine, Node est installé dans `%LOCALAPPDATA%\Programs\nodejs` mais n'est pas dans le PATH.
> Dans PowerShell, pour la session en cours : `$env:PATH = "$env:LOCALAPPDATA\Programs\nodejs;$env:PATH"`
> Pour l'ajouter définitivement : Paramètres Windows → « Modifier les variables d'environnement » → `Path` → ajouter ce dossier.

```powershell
npm install
copy .env.example .env.local   # puis renseigner les valeurs Supabase
npm run dev                    # http://localhost:3000
```

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (vérifie aussi les règles de prérendu) |
| `npm run start` | Lance le build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm run check` | typecheck + lint |

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — choix techniques, structure, règles données démo/réelles, avancement
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — identité visuelle, tokens, composants, règles des graphiques
- [docs/DATABASE.md](docs/DATABASE.md) — schéma, permissions (RLS), migrations Supabase
- Référence visuelle en direct : page `/design-system`
