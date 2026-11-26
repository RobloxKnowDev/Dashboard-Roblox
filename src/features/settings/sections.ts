import { Bell, KeyRound, Plug, Settings, Shield, ShieldCheck, User, Users, type LucideIcon } from "lucide-react";
import type { AppRole } from "@/lib/auth/roles";

export type SettingsSection = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  minRole?: AppRole;
};

export const settingsSections: SettingsSection[] = [
  { slug: "general", title: "General", description: "Studio name, currency and timezone.", icon: Settings, minRole: "admin" },
  { slug: "profile", title: "Profile", description: "Your name, avatar and email.", icon: User },
  { slug: "members", title: "Members", description: "Create accounts and manage their access.", icon: Users, minRole: "admin" },
  { slug: "permissions", title: "Permissions", description: "What each role can see and do.", icon: ShieldCheck },
  { slug: "integrations", title: "Integrations", description: "Roblox and Claude connections.", icon: Plug, minRole: "admin" },
  { slug: "api", title: "API Configuration", description: "Server-side keys and their status.", icon: KeyRound, minRole: "owner" },
  { slug: "notifications", title: "Notifications", description: "What you get notified about.", icon: Bell },
  { slug: "security", title: "Security", description: "Password, two-factor authentication, sessions.", icon: Shield },
];
