import type { Messages } from "../index";

export const nav: Messages["nav"] = {
  sections: {
    overview: "Vue d'ensemble",
    market: "Veille marché",
    development: "Développement",
    business: "Business",
    intelligence: "Intelligence",
    system: "Système",
  },
  items: {
    overview: { title: "Vue d'ensemble", keywords: "accueil tableau de bord kpi overview" },
    discover: { title: "Roblox Discover", keywords: "tendances populaire marché" },
    releases: { title: "Sorties de la semaine", keywords: "nouveaux jeux lancements" },
    ideas: { title: "Idées de jeux", keywords: "concepts inspiration steam" },
    watchlist: { title: "Jeux suivis", keywords: "watchlist concurrents" },
    games: { title: "Mes jeux", keywords: "univers expériences" },
    projects: { title: "Projets", keywords: "roadmap feuille de route" },
    tasks: { title: "Tâches", keywords: "à faire tickets" },
    agents: { title: "Agents IA", keywords: "automatisation surveillance" },
    finance: { title: "Finances", keywords: "revenus dépenses bénéfice devex" },
    team: { title: "Équipe", keywords: "membres personnes" },
    assistant: { title: "Assistant IA", keywords: "chat claude question" },
    settings: { title: "Réglages", keywords: "préférences profil sécurité langue" },
    integrations: { title: "Intégrations", keywords: "roblox claude api" },
  },
};
