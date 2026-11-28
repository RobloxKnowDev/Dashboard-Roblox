import type { Messages } from "../index";

export const earnings: Messages["earnings"] = {
  page: {
    title: "Gains",
    description: "Ce que gagne le studio, en dollars.",
    info: "Les gains de tous les jeux additionnés et convertis en dollars au taux réglé dans Réglages → Général. C'est une estimation, avant frais.",
    present: "Plein écran",
    exitPresent: "Quitter le plein écran",
    loading: "Chargement des gains",
  },
  hero: {
    summary: "Résumé des gains",
    title: "Gains totaux",
    info: "Tout ce que le studio a gagné sur la période, en dollars.",
  },
  figures: {
    perDay: "Par jour en moyenne",
    perDayInfo: "Les gains totaux divisés par le nombre de jours de la période.",
    bestDay: "Meilleur jour",
    bestMonth: "Meilleur mois",
    bestInfo: "Les plus gros gains en une seule journée (en un seul mois sur 12 mois) pendant la période.",
    pace: "Rythme sur un an",
    paceInfo: "Ce que le studio gagnerait en un an à la moyenne quotidienne actuelle.",
    lastDay: "Dernier jour",
    lastMonth: "Dernier mois",
    lastInfo: "Les gains du jour (ou du mois) le plus récent qui a des chiffres.",
    over: (range) => `Sur les ${range}`,
    atThisPace: "À ce rythme",
  },
  charts: {
    perDay: "Gains par jour",
    perMonth: "Gains par mois",
    perPeriodInfo: "Les dollars gagnés chaque jour (chaque mois sur 12 mois).",
    perPeriodLabel: (range) => `Gains en dollars sur les ${range}`,
    growth: "Progression des gains",
    growthInfo: "Le total cumulé des gains depuis le début de la période : plus ça monte, mieux c'est.",
    growthLabel: (range) => `Total cumulé des gains en dollars sur les ${range}`,
    series: "Gains",
    total: "Total cumulé",
  },
  empty: {
    title: "Pas encore de gains à afficher",
    description: "Les gains apparaissent ici dès que tes jeux ont des statistiques.",
    errorTitle: "Gains indisponibles",
    errorDescription: "Les chiffres n'ont pas pu être chargés. Actualise la page dans un instant.",
  },
};
