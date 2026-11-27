import type { Messages } from "../index";

export const shell: Messages["shell"] = {
  skipToContent: "Aller au contenu",
  description: "Centre de pilotage du studio — jeux, projets, équipe, veille marché et finances.",
  sidebar: {
    goToOverview: "Aller à la vue d'ensemble",
    expand: "Déplier le menu",
    collapse: "Replier le menu",
    version: "Phase 1 · v0.1",
    mainNav: "Principal",
  },
  mobileNav: { open: "Ouvrir le menu", close: "Fermer le menu", title: "Navigation", description: "Navigation principale" },
  breadcrumb: "Fil d'Ariane",
  search: {
    trigger: "Rechercher…",
    triggerLabel: "Rechercher (ouvre la palette de commandes)",
    dialogLabel: "Recherche globale",
    placeholder: "Rechercher des pages et des actions…",
    empty: "Aucun résultat.",
    internal: "Interne",
    designSystem: "Design System",
    footer: "Les projets, tâches et jeux seront recherchables une fois les données réelles connectées.",
  },
  notifications: {
    title: "Notifications",
    labelWithUnread: (count) => `Notifications, ${count} non lue${count > 1 ? "s" : ""}`,
    markAllRead: "Tout marquer comme lu",
    emptyTitle: "Tu es à jour",
    emptyDescription: "Les tâches assignées, les erreurs d'agents et les alertes de jeux apparaîtront ici.",
    updateFailed: "Les notifications n'ont pas pu être mises à jour. Réessaie.",
  },
  userMenu: {
    notSignedIn: "Non connecté",
    accountMenu: "Menu du compte",
    pendingApproval: "En attente de validation",
    profile: "Profil",
    settings: "Réglages",
    signOut: "Se déconnecter",
    language: "Langue",
  },
  access: {
    pendingTitle: "Accès en attente",
    pendingBody: (email) =>
      `Tu es connecté en tant que ${email}, mais aucun rôle n'a encore été attribué à ton compte. Un Owner doit valider ton accès avant que tu puisses voir les données du studio.`,
    deniedTitle: "Tu n'as pas accès à cette section",
    deniedBody: (required, role) =>
      `Elle nécessite le rôle ${required} ou supérieur. Ton rôle est ${role}. Demande à un Owner si tu as besoin d'accès.`,
    backToOverview: "Retour à la vue d'ensemble",
  },
  notFound: {
    title: "Cette page n'existe pas",
    description: "Le lien est peut-être périmé, ou l'élément a été supprimé.",
    back: "Retour à la vue d'ensemble",
  },
  error: {
    title: "Cette page a rencontré un problème",
    description: "Une erreur est survenue pendant son chargement. Tes données sont en sécurité — réessaie, ou reviens à la vue d'ensemble.",
    retry: "Réessayer",
    back: "Retour à la vue d'ensemble",
  },
};
