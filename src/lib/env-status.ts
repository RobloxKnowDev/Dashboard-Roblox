import "server-only";

/**
 * Which server variables are set — names and presence only, never values.
 * Callers must run at request time (await connection() first), otherwise the
 * build-time environment would be reported.
 */

/** What each variable is for; the label is t.settings.api.purposes[id]. */
export type EnvVarId =
  | "supabaseUrl"
  | "supabasePublishableKey"
  | "siteUrl"
  | "supabaseSecretKey"
  | "robloxKeys"
  | "cronSecret"
  | "anthropicKey";

export type EnvVarStatus = {
  id: EnvVarId;
  name: string;
  scope: "public" | "server";
  required: boolean;
  configured: boolean;
};

const ROBLOX_KEY_SUFFIXES = ["", "_2", "_3", "_4", "_5"];

const set = (value: string | undefined) => typeof value === "string" && value.trim().length > 0;

/** Number of Roblox Open Cloud keys configured (one per Roblox group). */
export function robloxKeyCount(): number {
  return ROBLOX_KEY_SUFFIXES.filter((suffix) => set(process.env[`ROBLOX_OPEN_CLOUD_API_KEY${suffix}`])).length;
}

export function environmentStatus(): EnvVarStatus[] {
  return [
    { id: "supabaseUrl", name: "NEXT_PUBLIC_SUPABASE_URL", scope: "public", required: true, configured: set(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    {
      id: "supabasePublishableKey",
      name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      scope: "public",
      required: true,
      configured: set(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    },
    { id: "siteUrl", name: "NEXT_PUBLIC_SITE_URL", scope: "public", required: true, configured: set(process.env.NEXT_PUBLIC_SITE_URL) },
    {
      id: "supabaseSecretKey",
      name: "SUPABASE_SECRET_KEY",
      scope: "server",
      required: true,
      configured: set(process.env.SUPABASE_SECRET_KEY),
    },
    {
      id: "robloxKeys",
      name: "ROBLOX_OPEN_CLOUD_API_KEY (+ _2 … _5)",
      scope: "server",
      required: false,
      configured: robloxKeyCount() > 0,
    },
    { id: "cronSecret", name: "CRON_SECRET", scope: "server", required: true, configured: set(process.env.CRON_SECRET) },
    { id: "anthropicKey", name: "ANTHROPIC_API_KEY", scope: "server", required: false, configured: set(process.env.ANTHROPIC_API_KEY) },
  ];
}
