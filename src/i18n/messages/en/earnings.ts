/**
 * Earnings page: the studio's earnings in dollars only. Made to be shown off,
 * so nothing on it names the platform, its currency or the games.
 */
export const earnings = {
  page: {
    title: "Earnings",
    description: "What the studio earns, in dollars.",
    info: "Every game's earnings added up and converted to dollars at the conversion rate set in Settings → General. An estimate, before fees.",
    present: "Full screen",
    exitPresent: "Exit full screen",
    loading: "Loading earnings",
  },
  hero: {
    summary: "Earnings summary",
    title: "Total earnings",
    info: "Everything the studio earned over the period, in dollars.",
  },
  figures: {
    perDay: "Per day on average",
    perDayInfo: "Total earnings divided by the number of days in the period.",
    bestDay: "Best day",
    bestMonth: "Best month",
    bestInfo: "The highest earnings in a single day (a single month over 12 months) during the period.",
    pace: "Yearly pace",
    paceInfo: "What the studio would earn in a year at the current daily average.",
    lastDay: "Latest day",
    lastMonth: "Latest month",
    lastInfo: "Earnings of the most recent day (or month) with figures.",
    over: (range: string) => `Over the ${range}`,
    atThisPace: "At this pace",
  },
  charts: {
    perDay: "Earnings per day",
    perMonth: "Earnings per month",
    perPeriodInfo: "Dollars earned each day (each month over 12 months).",
    perPeriodLabel: (range: string) => `Earnings in dollars, ${range}`,
    growth: "Earnings growth",
    growthInfo: "Running total of the earnings since the start of the period: the higher, the better.",
    growthLabel: (range: string) => `Running total of the earnings in dollars, ${range}`,
    series: "Earnings",
    total: "Running total",
  },
  empty: {
    title: "No earnings to show yet",
    description: "Earnings appear here as soon as your games have statistics.",
    errorTitle: "Earnings unavailable",
    errorDescription: "The figures couldn't be loaded. Refresh the page in a moment.",
  },
};
