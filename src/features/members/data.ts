import "server-only";
import { cache } from "react";
import { getT } from "@/i18n/server";
import type { AppRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/* LIVE: sign-in accounts (profiles) — read by administrators and owners only. */

export type Account = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  /** null = pending approval. */
  role: AppRole | null;
  createdAt: string;
  lastSignInAt: string | null;
  teamMemberId: string | null;
};

/** Caller must have checked the admin role (last sign-in comes from the Auth admin API). */
export const listAccounts = cache(async (): Promise<Account[] | null> => {
  const supabase = await createClient();
  const [{ data, error }, members] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, avatar_url, role, created_at").order("created_at"),
    supabase.from("team_members").select("id, profile_id").not("profile_id", "is", null),
  ]);
  if (error) return null;
  const t = await getT();

  const lastSignIn = new Map<string, string | null>();
  try {
    const { data: users } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
    for (const u of users?.users ?? []) lastSignIn.set(u.id, u.last_sign_in_at ?? null);
  } catch {
    // Without the secret key the list still works, minus last sign-in.
  }
  const cards = new Map((members.data ?? []).map((m) => [m.profile_id, m.id]));

  return data.map((p) => ({
    id: p.id,
    name: p.full_name.trim() || (p.email ?? "").split("@")[0] || t.settings.members.fallbackName,
    email: p.email ?? "",
    avatarUrl: p.avatar_url,
    role: p.role,
    createdAt: p.created_at,
    lastSignInAt: lastSignIn.get(p.id) ?? null,
    teamMemberId: cards.get(p.id) ?? null,
  }));
});
