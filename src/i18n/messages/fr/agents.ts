import type { Messages } from "../index";

export const agents: Messages["agents"] = {
  page: {
    description: "Statut en direct de chaque agent IA qui travaille pour le studio.",
    banner:
      "Aucun agent ne remonte encore d'informations au dashboard. En phase 2, les agents enverront leur statut et leurs événements via une API authentifiée, et cette page les affichera en direct. Tout ce qui suit est illustratif.",
    emptyTitle: "Aucun agent",
    emptyStatusTitle: (status) => `Aucun agent au statut « ${status} »`,
    emptyDescription: "Choisis un autre statut ci-dessus.",
  },
  card: {
    started: "Lancé",
    lastActivity: "Dernière activité",
    runningFor: "Durée",
  },
  duration: {
    minutes: (minutes) => `${minutes} min`,
    hours: (hours, minutes) => `${hours} h ${minutes} min`,
    days: (days) => `${days} jours`,
  },
  events: {
    started: "Lancement",
    progress: "Progression",
    waiting: "Attente",
    completed: "Terminé",
    error: "Erreur",
    log: "Log",
    status_change: "Statut",
  },
  detail: {
    metaTitle: "Agent IA",
    project: "Projet",
    model: "Modèle",
    started: "Lancé le",
    lastActivity: "Dernière activité",
    events: "Événements",
    historyTitle: "Historique des événements",
    historyDescription: "Tout ce que l'agent a remonté, du plus récent au plus ancien",
  },
};
