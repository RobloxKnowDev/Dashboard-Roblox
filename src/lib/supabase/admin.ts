import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Privileged Supabase client using the SECRET key — it bypasses RLS.
 *
 * Only for trusted server-side operations that RLS cannot express (inviting a
 * member, bootstrapping the first owner, integration sync jobs). Every caller
 * must check the current user's permission itself before using it.
 * Never import this from a Client Component ("server-only" enforces it).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
