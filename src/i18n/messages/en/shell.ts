/** App chrome: sidebar, top bar, menus, search, notifications, access screens. */
export const shell = {
  skipToContent: "Skip to content",
  description: "Studio control center — games, projects, team, market intelligence and finance.",
  sidebar: {
    goToOverview: "Go to overview",
    expand: "Expand sidebar",
    collapse: "Collapse sidebar",
    version: "Phase 1 · v0.1",
    mainNav: "Main",
  },
  mobileNav: { open: "Open navigation", close: "Close navigation", title: "Navigation", description: "Main navigation" },
  breadcrumb: "Breadcrumb",
  search: {
    trigger: "Search…",
    triggerLabel: "Search (opens command palette)",
    dialogLabel: "Global search",
    placeholder: "Search pages and actions…",
    empty: "No results.",
    internal: "Internal",
    designSystem: "Design System",
    footer: "Projects, tasks and games become searchable once live data is connected.",
  },
  notifications: {
    title: "Notifications",
    labelWithUnread: (count: number) => `Notifications, ${count} unread`,
    markAllRead: "Mark all as read",
    emptyTitle: "You're all caught up",
    emptyDescription: "Task assignments, agent errors and game alerts will appear here.",
    updateFailed: "Notifications couldn't be updated. Try again.",
  },
  userMenu: {
    notSignedIn: "Not signed in",
    accountMenu: "Account menu",
    pendingApproval: "Pending approval",
    profile: "Profile",
    settings: "Settings",
    signOut: "Sign out",
    language: "Language",
  },
  access: {
    pendingTitle: "Access pending",
    pendingBody: (email: string) =>
      `You're signed in as ${email}, but no role has been assigned to your account yet. An owner needs to approve your access before you can see studio data.`,
    deniedTitle: "You don't have access to this section",
    deniedBody: (required: string, role: string) =>
      `It requires the ${required} role or above. Your role is ${role}. Ask an owner if you need access.`,
    backToOverview: "Back to overview",
  },
  notFound: {
    title: "This page doesn't exist",
    description: "The link may be outdated, or the item was deleted.",
    back: "Back to overview",
  },
  error: {
    title: "This page ran into a problem",
    description: "Something went wrong while loading it. Your data is safe — try again, or go back to the overview.",
    retry: "Try again",
    back: "Back to overview",
  },
};
