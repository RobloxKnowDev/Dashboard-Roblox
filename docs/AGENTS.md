# Agents IA (Claude Code en direct)

La page **Agents IA** montre en direct ce que fait Claude Code sur le PC du studio, et permet aux **Owners** de lui écrire ou de lui confier une mission.

## Vue d'ensemble

```
PC du studio                                              Dashboard (Vercel + Supabase)
─────────────────────────────────────────                 ────────────────────────────────────────
Claude Code (VS Code, terminal, missions)
  └─ hooks (~/.claude/settings.json) ── tools/agents/hook.mjs ──▶ POST /api/agents/ingest (type hook)
                                         ◀── Stop : message en attente → Claude continue avec
Pont (tools/agents/bridge.mjs, démarre avec Windows)
  ├─ toutes les 10 s : sessions ouvertes ─────────────────▶ POST /api/agents/ingest (type poll)
  │                    ◀── travail à lancer, arrêts demandés
  ├─ lance « claude -p » (mode auto) dans le dossier du projet
  └─ fin d'exécution ─────────────────────────────────────▶ POST /api/agents/ingest (type run_result)
tools/agents/share.mjs (capture Studio / Blender ou fichier) ──▶ POST /api/agents/media → bucket privé agent-media
```

- **Un agent = une conversation Claude Code.** Elle peut s'étendre sur plusieurs sessions (une mission reprise, une conversation VS Code continuée en arrière-plan) : `agent_sessions` relie chaque identifiant de session à son agent.
- **Deux origines** : `claude_code` (session ouverte par quelqu'un dans VS Code ou un terminal, apparaît à sa première consigne) et `mission` (lancée depuis le dashboard, exécutée par le pont).
- **Statuts** : `working` (au travail), `waiting` (avec la raison : `input` = t'attend, `permission` = attend une validation, `bridge` = attend le PC), `completed`, `error`, `offline`.

## Qui voit, qui agit

| | Owner | Admin | Developer | Viewer |
|---|:-:|:-:|:-:|:-:|
| Voir les agents, leur historique et leurs captures | ✓ | ✓ | — | — |
| Écrire à un agent, lancer ou arrêter une mission, lancer un nouveau jeu | ✓ | — | — | — |

- **Tous les Owners pilotent les agents** (permission `agents.pilot`, choix du studio du 28/11/2026 ; avant, un seul compte désigné). Les politiques RLS (`is_agent_controller()`, qui vérifie le rôle Owner), les Server Actions et l'API d'équipe (un manager doit avoir été lancé par un Owner) appliquent la même règle. Attention : un nouvel Owner obtient donc la main sur les agents, qui tournent sur le PC du studio.
- Chaque consigne envoyée depuis le dashboard porte le nom de son auteur dans l'historique de l'agent.
- L'assistant IA (Haiku) reste ouvert à tous les rôles : il n'a rien à voir avec les agents.

## Livraison d'un message

| État de l'agent | Qui livre | Quand |
|---|---|---|
| Au travail (`working`) | Hook **Stop** | Dès que Claude termine son étape en cours : le message devient sa consigne suivante (`decision: block`) |
| Mission terminée, en erreur ou nouvelle | Le pont | Au poll suivant (≤ 10 s) : `claude -p --resume <session>` |
| Session VS Code ouverte mais inactive | Le pont | `--resume <session> --fork-session` : la conversation continue en arrière-plan sans toucher la fenêtre VS Code |
| PC hors ligne | — | Le message attend dans `agent_messages` (statut `pending`, annulable) |

## Ce qui est enregistré (et ce qui ne l'est pas)

- Consignes (1 500 caractères max, secrets masqués), réponses de fin d'étape de Claude (4 000 max), une ligne par action : « A modifié `Menu.lua` », « A lancé : Run the checks », « Roblox Studio · screen_capture ».
- **Jamais** le contenu des fichiers ni la sortie des commandes. Les lectures/recherches (Read, Grep, Glob…) ne sont pas journalisées. Les commandes passent par `redactSecrets()` (clés, jetons, `KEY=valeur`, JWT).
- Captures : bucket Supabase **privé** `agent-media` (8 Mo max, PNG/JPEG/WebP vérifiés par leur signature), affichées via des URL signées d'une heure, générées par le serveur seulement pour une ligne que l'utilisateur a le droit de lire.

## Missions et rôles

Le pilote choisit un dossier de projet, un rôle et écrit la mission. Le pont lance `claude -p --permission-mode auto` dans ce dossier avec les consignes du rôle (`src/features/agents/roles.ts`, ajoutées au prompt système) :

| Rôle | Spécialité |
|---|---|
| Général | N'importe quelle tâche |
| Manager | Dirige l'équipe d'un jeu (lancé par « Nouveau jeu », voir plus bas) : planifie, délègue, vérifie, rend compte. Ne code pas |
| Game designer | `docs/Game Design.md` : boucle, 90 premières secondes, progression, monétisation dès le lancement, rétention, métriques, guide de style |
| Build | Maps, niveaux, décors dans Studio |
| UI | Interfaces Roblox, vérifiées en playtest avec `screen_capture` (téléphone, tablette, PC), **capture finale partagée sur le dashboard** |
| SFX | Sons choisis dans la bibliothèque Gamemaster, copiés dans les assets du jeu, déclarés dans `Sounds.luau`, joués avec `Sfx` |
| Scripts | Luau dans les fichiers du projet (Services/Controllers), synchronisé par Rojo, testé en playtest |
| QA | Teste comme un nouveau joueur et signale les bugs avec étapes de reproduction |
| Art 3D | Blender (MCP), rendu partagé sur le dashboard |

- **Mode de permissions auto** (choix du studio) : Claude agit seul, les actions risquées sont bloquées par le classifieur de Claude Code.
- Le pont retire `ANTHROPIC_API_KEY` de l'environnement : les missions utilisent la connexion Claude Code du PC (abonnement), pas les crédits API.
- **Trois exécutions en parallèle** au maximum (choix du studio). Bouton **Arrêter** : le pont tue l'arbre de processus (`taskkill /T /F`).
- Toutes les consignes renvoient aux guides du studio, rangés sur le PC (pas dans ce dépôt public) : `E:\Roblox\Templates\Ressources.md` (packs d'icônes, sons Gamemaster, modèles 3D, règles d'ui-resources.com : une ressource à la fois, licence vérifiée, jamais de téléchargement en masse) et `E:\Roblox\Templates\Guide Tizzy.md` (conseils de design et de lancement de la chaîne de Tizzy).

## Équipes de jeu

Bouton **Nouveau jeu** (Owners) : un nom et l'idée principale.

1. Le dashboard crée le **projet** (table `projects`, statut « planning ») et son **agent manager**.
2. Au premier poll, le pont exécute `tools/agents/new-game.mjs` :
   - projet `E:\Roblox\RobloxProjects\<Jeu>` copié depuis le modèle `E:\Roblox\Templates\GameTemplate` (Rojo 7.7.1, structure et règles de Glider : `Shared.Packages.Core`, `RemoteManager`, `Config/Images.luau`, `Config/Sounds.luau`, `Utils/Sfx`, `RobuxPrice`), git local avec un premier commit (le dossier est ajouté aux `safe.directory` de git, comme les autres jeux du disque E:) ;
   - dossier d'assets `E:\Roblox\AssetsProjects\<Jeu>\` (Icon, Ui/Logo, Ui/Frame, Ui/Icon, Ui/Inspiration, Ui/Police, SFX, Docs) avec `SOURCES.md` ;
   - place `<Jeu>.rbxl` (copie de `E:\Roblox\Map\Baseplate.rbxl`, non versionné), ouvert dans Studio, et `rojo serve` lancé.
   Le pont signale le dossier au dashboard (`set_cwd`), puis lance le manager.
3. Le manager fait écrire le design par le game designer, rédige `docs/Plan.md`, puis **présente le plan et attend l'OK d'un Owner** (choix du studio) avant de lancer le reste de l'équipe.
4. Il délègue avec `tools/agents/team.mjs` (`delegate`, `message`, `status`) ; chaque membre apparaît sur la page, rattaché au jeu. À la fin de chaque exécution d'un membre, son rapport est envoyé au manager (`agent_messages.from_agent_id`), ce qui le relance. Statut du manager entre deux : « Attend l'équipe » ou « T'attend ».

Garde-fous : seul un manager lancé par un Owner peut déléguer (vérifié côté serveur), les membres ne délèguent pas, 8 membres au plus en file ou au travail par manager, 3 exécutions en même temps sur le PC. Les agents ne publient jamais et ne poussent jamais sur GitHub.

À faire par la personne : cliquer sur « Connect » dans le plugin Rojo de Studio au début d'une session de travail ; importer les sons dans Roblox (pas d'outil d'envoi audio) et donner leurs IDs ; publier.

## Outils sur le PC

| Fichier | Rôle |
|---|---|
| `tools/agents/setup.mjs` | Installation : enregistre le PC (jeton aléatoire, seule son empreinte SHA-256 va en base), installe les hooks, enregistre le serveur MCP Roblox Studio, ajoute le pont au démarrage de Windows |
| `tools/agents/hook.mjs` | Hook Claude Code : envoie un résumé de chaque événement ; ajoute au début de chaque session la commande de partage de captures |
| `tools/agents/bridge.mjs` | Pont : poll, lancement et arrêt des exécutions, journal `~/.dashboard-agents/bridge.log` |
| `tools/agents/share.mjs` + `capture-window.ps1` | Partage d'une image (`--file`) ou capture d'une fenêtre (`--window studio`, `--window blender`) |
| `tools/agents/new-game.mjs` | Crée un jeu depuis le modèle (projet, assets, place, Studio, Rojo) — lancé par le pont ; chemins réglables dans `config.json` (`gamesDir`, `assetsDir`, `templateDir`, `baseplate`) |
| `tools/agents/team.mjs` | Commandes d'équipe du manager (`delegate`, `message`, `status`), identifié par `DASHBOARD_AGENT_ID` |

Le jeton du PC est dans `~/.dashboard-agents/config.json` (jamais dans le dépôt). Les erreurs des hooks vont dans `~/.dashboard-agents/hooks.log` et n'interrompent jamais Claude.

### Installer sur un PC

```powershell
$env:PATH = "$env:LOCALAPPDATA\Programs\nodejs;$env:PATH"
node tools/agents/setup.mjs --machine-name "PC du studio"
```

Puis, une seule fois dans **Roblox Studio** : Assistant → « … » → *Manage MCP Servers* → activer **Enable Studio as MCP server**. Studio doit être ouvert sur un place pour que les agents s'en servent ; Blender doit être ouvert avec l'add-on MCP.

Désinstaller : `node tools/agents/setup.mjs --uninstall` (retire les hooks et le démarrage automatique ; une copie de `settings.json` est gardée à chaque modification).

## Limites connues

- Il n'existe pas de moyen officiel d'écrire dans la fenêtre de chat VS Code depuis l'extérieur : d'où la livraison en fin d'étape, ou la suite en arrière-plan (fork).
- Le PC doit être allumé, le pont lancé (`node tools/agents/bridge.mjs`, ou au démarrage de Windows).
- `--window studio` capture toute la fenêtre de Studio (panneaux compris).
