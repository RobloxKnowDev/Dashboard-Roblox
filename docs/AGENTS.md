# Agents IA (Claude Code en direct)

La page **Agents IA** montre en direct ce que fait Claude Code sur le PC du studio, et permet au **pilote des agents** de lui écrire ou de lui confier une mission.

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
| Écrire à un agent, lancer ou arrêter une mission | **le pilote des agents uniquement** ||||

- Le **pilote des agents** est un compte précis (`studio_settings.agent_controller_id`), pas un rôle. Il ne se change qu'avec la clé secrète (trigger `guard_agent_controller`), via le script d'installation. Les politiques RLS (`is_agent_controller()`) et les Server Actions appliquent la même règle.
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
| UI | Interfaces Roblox, vérifiées en playtest avec `screen_capture` (téléphone, tablette, PC), **capture finale partagée sur le dashboard** |
| Construction | Maps, niveaux, décors dans Studio |
| Scripts | Luau, testé en playtest (console sans erreur) |
| QA | Teste et signale les bugs avec étapes de reproduction |
| Art 3D | Blender (MCP), rendu partagé sur le dashboard |

- **Mode de permissions auto** (choix du studio) : Claude agit seul, les actions risquées sont bloquées par le classifieur de Claude Code.
- Le pont retire `ANTHROPIC_API_KEY` de l'environnement : les missions utilisent la connexion Claude Code du PC (abonnement), pas les crédits API.
- Deux exécutions en parallèle au maximum. Bouton **Arrêter** : le pont tue l'arbre de processus (`taskkill /T /F`).

## Outils sur le PC

| Fichier | Rôle |
|---|---|
| `tools/agents/setup.mjs` | Installation : enregistre le PC (jeton aléatoire, seule son empreinte SHA-256 va en base), désigne le pilote, installe les hooks, enregistre le serveur MCP Roblox Studio, ajoute le pont au démarrage de Windows |
| `tools/agents/hook.mjs` | Hook Claude Code : envoie un résumé de chaque événement ; ajoute au début de chaque session la commande de partage de captures |
| `tools/agents/bridge.mjs` | Pont : poll, lancement et arrêt des exécutions, journal `~/.dashboard-agents/bridge.log` |
| `tools/agents/share.mjs` + `capture-window.ps1` | Partage d'une image (`--file`) ou capture d'une fenêtre (`--window studio`, `--window blender`) |

Le jeton du PC est dans `~/.dashboard-agents/config.json` (jamais dans le dépôt). Les erreurs des hooks vont dans `~/.dashboard-agents/hooks.log` et n'interrompent jamais Claude.

### Installer sur un PC

```powershell
$env:PATH = "$env:LOCALAPPDATA\Programs\nodejs;$env:PATH"
node tools/agents/setup.mjs --controller-email <e-mail du compte pilote> --machine-name "PC du studio"
```

Puis, une seule fois dans **Roblox Studio** : Assistant → « … » → *Manage MCP Servers* → activer **Enable Studio as MCP server**. Studio doit être ouvert sur un place pour que les agents s'en servent ; Blender doit être ouvert avec l'add-on MCP.

Désinstaller : `node tools/agents/setup.mjs --uninstall` (retire les hooks et le démarrage automatique ; une copie de `settings.json` est gardée à chaque modification).

## Limites connues

- Il n'existe pas de moyen officiel d'écrire dans la fenêtre de chat VS Code depuis l'extérieur : d'où la livraison en fin d'étape, ou la suite en arrière-plan (fork).
- Le PC doit être allumé, le pont lancé (`node tools/agents/bridge.mjs`, ou au démarrage de Windows).
- `--window studio` capture toute la fenêtre de Studio (panneaux compris).
