"use server";

import { refresh } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Marks every unread notification of the current user as read. */
export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };

  const supabase = await createClient();
  // RLS limits this to the user's own rows; the column grant limits it to read_at.
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) return { ok: false };
  refresh();
  return { ok: true };
}
