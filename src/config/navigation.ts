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
import type { Messages } from "@/i18n/messages";
import type { AppRole } from "@/lib/auth/roles";

export type NavItemKey = keyof Messages["nav"]["items"];
export type NavSectionKey = keyof Messages["nav"]["sections"];

export type NavItem = {
  /** Title and search keywords live in the dictionaries: t.nav.items[key]. */
  key: NavItemKey;
  href: string;
  icon: LucideIcon;
  /** Minimum role required to see the page. Defaults to any signed-in member. */
  minRole?: AppRole;
};

export type NavSection = {
  key: NavSectionKey;
  items: NavItem[];
};

/**
 * Single source of truth for navigation: feeds the sidebar, the command
 * palette (global search) and page-level access checks.
 */
export const navigation: NavSection[] = [
  { key: "overview", items: [{ key: "overview", href: "/overview", icon: LayoutDashboard }] },
  {
    key: "market",
    items: [
      { key: "discover", href: "/discover", icon: Compass },
      { key: "releases", href: "/discover/releases", icon: Rocket },
      { key: "ideas", href: "/discover/ideas", icon: Lightbulb },
      { key: "watchlist", href: "/discover/watchlist", icon: Eye },
    ],
  },
  {
    key: "development",
    items: [
      { key: "games", href: "/games", icon: Gamepad2 },
      { key: "projects", href: "/projects", icon: FolderKanban },
      { key: "tasks", href: "/tasks", icon: ListTodo },
      { key: "agents", href: "/agents", icon: Bot },
    ],
  },
  {
    key: "business",
    items: [
      { key: "finance", href: "/finance", icon: Wallet, minRole: "admin" },
      { key: "team", href: "/team", icon: Users },
    ],
  },
  { key: "intelligence", items: [{ key: "assistant", href: "/assistant", icon: Sparkles }] },
  {
    key: "system",
    items: [
      { key: "settings", href: "/settings", icon: Settings },
      { key: "integrations", href: "/integrations", icon: Plug, minRole: "admin" },
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
