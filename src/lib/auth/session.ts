import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "./roles";
import { hasMinRole } from "./roles";

/** The signed-in user as the app sees it — narrow on purpose. */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  /** null = pending approval: signed in, but no access to studio data. */
  role: AppRole | null;
};

/**
 * Data Access Layer entry point. Verifies the JWT (getClaims) and loads the
 * profile. Memoized per request with React cache(); never cached across
 * requests, so a role change applies on the very next request.
 *
 * Reads cookies → callers must render under a <Suspense> boundary.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (typeof userId !== "string") return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  const email = profile.email ?? "";
  return {
    id: profile.id,
    email,
    name: profile.full_name.trim() || email.split("@")[0] || "Member",
    avatarUrl: profile.avatar_url,
    role: profile.role,
  };
});

/** Signed-in user or redirect to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export type AccessCheck =
  | { status: "allowed"; user: SessionUser & { role: AppRole } }
  | { status: "pending"; user: SessionUser }
  | { status: "denied"; user: SessionUser & { role: AppRole } };

/** Checks the current user against a minimum role (redirects anonymous visitors). */
export async function checkAccess(minRole: AppRole = "viewer"): Promise<AccessCheck> {
  const user = await requireUser();
  if (!user.role) return { status: "pending", user };
  const withRole = { ...user, role: user.role };
  return hasMinRole(user.role, minRole) ? { status: "allowed", user: withRole } : { status: "denied", user: withRole };
}
