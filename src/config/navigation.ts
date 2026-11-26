import {
  Bot,
  Compass,
  Eye,
  FolderKanban,
  Gamepad2,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  Plug,
  Rocket,
  Settings,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/lib/auth/roles";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Extra words that should match this page in the global search. */
  keywords?: string[];
  /** Minimum role required to see the page. Defaults to any signed-in member. */
  minRole?: AppRole;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

/**
 * Single source of truth for navigation: feeds the sidebar, the command
 * palette (global search) and page-level access checks.
 */
export const navigation: NavSection[] = [
  {
    title: "Overview",
    items: [{ title: "Overview", href: "/overview", icon: LayoutDashboard, keywords: ["home", "dashboard", "kpi"] }],
  },
  {
    title: "Market Intelligence",
    items: [
      { title: "Roblox Discover", href: "/discover", icon: Compass, keywords: ["trending", "popular", "market"] },
      { title: "Weekly Releases", href: "/discover/releases", icon: Rocket, keywords: ["new games", "launches"] },
      { title: "Game Ideas", href: "/discover/ideas", icon: Lightbulb, keywords: ["concepts", "inspiration"] },
      { title: "Watchlist", href: "/discover/watchlist", icon: Eye, keywords: ["tracked games", "competitors"] },
    ],
  },
  {
    title: "Development",
    items: [
      { title: "My Games", href: "/games", icon: Gamepad2, keywords: ["universe", "experiences"] },
      { title: "Projects", href: "/projects", icon: FolderKanban, keywords: ["roadmap"] },
      { title: "Tasks", href: "/tasks", icon: ListTodo, keywords: ["todo", "issues"] },
      { title: "AI Agents", href: "/agents", icon: Bot, keywords: ["automation", "monitoring"] },
    ],
  },
  {
    title: "Business",
    items: [
      { title: "Finance", href: "/finance", icon: Wallet, keywords: ["revenue", "expenses", "profit", "devex"], minRole: "admin" },
      { title: "Team", href: "/team", icon: Users, keywords: ["members", "people"] },
    ],
  },
  {
    title: "Intelligence",
    items: [{ title: "AI Assistant", href: "/assistant", icon: Sparkles, keywords: ["chat", "claude", "ask"] }],
  },
  {
    title: "System",
    items: [
      { title: "Settings", href: "/settings", icon: Settings, keywords: ["preferences", "profile", "security"] },
      { title: "Integrations", href: "/integrations", icon: Plug, keywords: ["roblox", "claude", "api"], minRole: "admin" },
    ],
  },
];

export const allNavItems: NavItem[] = navigation.flatMap((section) => section.items);

/** The nav item that owns a pathname (longest matching prefix wins). */
export function findNavItem(pathname: string): NavItem | undefined {
  return allNavItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
