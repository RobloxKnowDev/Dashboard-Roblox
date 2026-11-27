import { Bell, KeyRound, Plug, Settings, Shield, ShieldCheck, Sparkles, User, Users, type LucideIcon } from "lucide-react";
import type { AppRole } from "@/lib/auth/roles";

export type SettingsSlug = "general" | "profile" | "members" | "permissions" | "integrations" | "api" | "ai" | "notifications" | "security";

/** Titles and descriptions live in the dictionaries: t.settings.sections[slug]. */
export type SettingsSection = {
  slug: SettingsSlug;
  icon: LucideIcon;
  minRole?: AppRole;
};

export const settingsSections: SettingsSection[] = [
  { slug: "general", icon: Settings, minRole: "admin" },
  { slug: "profile", icon: User },
  { slug: "members", icon: Users, minRole: "admin" },
  { slug: "permissions", icon: ShieldCheck },
  { slug: "integrations", icon: Plug, minRole: "admin" },
  { slug: "api", icon: KeyRound, minRole: "owner" },
  { slug: "ai", icon: Sparkles, minRole: "owner" },
  { slug: "notifications", icon: Bell },
  { slug: "security", icon: Shield },
];
