import type { Messages } from "../index";

export const integrations: Messages["integrations"] = {
  description: "Connexions à Roblox, Claude et la base de données — état en direct.",
  status: {
    connected: "Connecté",
    notConnected: "Non connecté",
    noKey: "Aucune clé",
    noGames: "Aucun jeu",
    partial: "Partiel",
    noAccess: "Pas d'accès",
    unreachable: "Injoignable",
    setupIncomplete: "Configuration incomplète",
    running: "En marche",
    noRecentRun: "Pas d'exécution récente",
  },
  values: {
    configured: "Configurée",
    missing: "Manquante",
    notConfigured: "Non configurée",
    never: "Jamais",
    demo: "Démo",
    live: "Actif",
    off: "Désactivé",
    paused: "En pause (budget mensuel atteint)",
    readableOf: (readable, total) => `${readable} sur ${total}`,
  },
  robloxPublic: {
    name: "Stats publiques Roblox",
    description: "Joueurs en ligne, visites, favoris, notes et classements Roblox. Aucune clé nécessaire.",
    gamesTracked: "Jeux suivis",
    usedBy: "Utilisées par",
  },
  analytics: {
    name: "Statistiques Roblox Open Cloud",
    description:
      "DAU, revenus, rétention et temps de jeu, lus avec tes clés API Open Cloud (une par groupe Roblox).",
    keys: "Clés API configurées",
    readable: "Jeux lisibles",
    notReadable: "Non lisibles",
  },
  snapshots: {
    name: "Snapshots quotidiens",
    description:
      "Une tâche planifiée enregistre les classements Roblox, tes jeux suivis et tes jeux chaque jour à 06:00 UTC pour construire l'historique.",
    last: "Dernier snapshot",
    jobSecret: "Secret de la tâche",
    serverKey: "Clé serveur",
  },
  claude: {
    name: "Claude (IA)",
    description:
      "L'assistant IA répond à partir de tes vraies données (Claude Haiku 5.5) et les idées de jeux hebdomadaires viennent des tendances Steam vérifiées sur Roblox (Claude Opus 5.5). Sans clé, l'assistant fonctionne en mode démo.",
    apiKey: "Clé API",
    mode: "Mode de l'assistant",
    models: "Modèles",
  },
  supabase: {
    name: "Supabase",
    description: "Base de données, authentification et règles d'accès (row-level security) pour chaque page.",
    publicKeys: "Clés publiques",
    secretKey: "Clé secrète",
  },
};
