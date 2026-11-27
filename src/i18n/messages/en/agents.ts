/** AI agents (demo data): list, status tiles, agent cards, agent page, event timeline. */
export const agents = {
  page: {
    description: "Live status of every AI agent working for the studio.",
    banner:
      "No agent reports to the dashboard yet. In Phase 2, agents will send their status and events through an authenticated API, and this page will show them live. Everything below is illustrative.",
    emptyTitle: "No agents",
    emptyStatusTitle: (status: string) => `No ${status.toLowerCase()} agents`,
    emptyDescription: "Pick another status above.",
  },
  card: {
    started: "Started",
    lastActivity: "Last activity",
    runningFor: "Running for",
  },
  duration: {
    minutes: (minutes: number) => `${minutes} min`,
    hours: (hours: number, minutes: number) => `${hours} h ${minutes} min`,
    days: (days: number) => `${days} days`,
  },
  events: {
    started: "Started",
    progress: "Progress",
    waiting: "Waiting",
    completed: "Completed",
    error: "Error",
    log: "Log",
    status_change: "Status",
  },
  detail: {
    metaTitle: "AI Agent",
    project: "Project",
    model: "Model",
    started: "Started",
    lastActivity: "Last activity",
    events: "Events",
    historyTitle: "Event history",
    historyDescription: "Everything the agent reported, newest first",
  },
};
