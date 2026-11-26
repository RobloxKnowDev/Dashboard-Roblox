import { connection } from "next/server";
import type { ReactNode } from "react";
import { AccessDenied, PendingAccess } from "@/components/feedback/access";
import { signOut } from "@/features/auth/actions";
import { markAllNotificationsRead } from "@/features/notifications/actions";
import type { AppRole } from "@/lib/auth/roles";
import { checkAccess, getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils/format";
import { NotificationCenter } from "./notification-center";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

/*
 * Session-aware server widgets. Each reads the session, so each must be
 * rendered inside a <Suspense> boundary (the layout provides them).
 * getSessionUser() is memoized per request: one auth check for all of them.
 */

/** Navigation filtered by the user's role. */
export async function SessionSidebarNav() {
  const user = await getSessionUser();
  return <SidebarNav role={user ? user.role : undefined} />;
}

export async function SessionUserMenu() {
  const user = await getSessionUser();
  return <UserMenu user={user} signOut={signOut} />;
}

/** Latest notifications of the signed-in user (RLS: own rows only). */
export async function SessionNotifications() {
  const user = await getSessionUser();
  if (!user?.role) return <NotificationCenter />;

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  await connection();
  const now = new Date();
  const notifications = (data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body ?? undefined,
    href: n.link ?? undefined,
    time: formatRelative(n.created_at, now),
    read: n.read_at !== null,
  }));

  return <NotificationCenter notifications={notifications} markAllRead={markAllNotificationsRead} />;
}

/**
 * Second security layer for every private page: verifies the session on the
 * server (anonymous → /login) and blocks accounts still pending approval.
 */
export async function AccessGate({ children }: { children: ReactNode }) {
  const access = await checkAccess("viewer");
  if (access.status === "pending") return <PendingAccess email={access.user.email} />;
  return <>{children}</>;
}

/** Restricts a page section to a minimum role (matches the RLS policies). */
export async function RequireRole({ min, children }: { min: AppRole; children: ReactNode }) {
  const access = await checkAccess(min);
  if (access.status === "pending") return <PendingAccess email={access.user.email} />;
  if (access.status === "denied") return <AccessDenied required={min} role={access.user.role} />;
  return <>{children}</>;
}
