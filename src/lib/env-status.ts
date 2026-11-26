import "server-only";

/**
 * Which server variables are set — names and presence only, never values.
 * Callers must run at request time (await connection() first), otherwise the
 * build-time environment would be reported.
 */

export type EnvVarStatus = {
  name: string;
  purpose: string;
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
  const keys = robloxKeyCount();
  return [
    { name: "NEXT_PUBLIC_SUPABASE_URL", purpose: "Supabase project URL", scope: "public", required: true, configured: set(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    {
      name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      purpose: "Supabase key for the browser (RLS applies)",
      scope: "public",
      required: true,
      configured: set(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    },
    { name: "NEXT_PUBLIC_SITE_URL", purpose: "Links in authentication emails", scope: "public", required: true, configured: set(process.env.NEXT_PUBLIC_SITE_URL) },
    {
      name: "SUPABASE_SECRET_KEY",
      purpose: "Account creation and the daily snapshot job",
      scope: "server",
      required: true,
      configured: set(process.env.SUPABASE_SECRET_KEY),
    },
    {
      name: "ROBLOX_OPEN_CLOUD_API_KEY (+ _2 … _5)",
      purpose: keys > 0 ? `Roblox analytics — ${keys} ${keys === 1 ? "key" : "keys"} configured` : "Roblox analytics (DAU, revenue, retention)",
      scope: "server",
      required: false,
      configured: keys > 0,
    },
    { name: "CRON_SECRET", purpose: "Protects the daily snapshot job", scope: "server", required: true, configured: set(process.env.CRON_SECRET) },
    { name: "ANTHROPIC_API_KEY", purpose: "Claude for the AI Assistant (not connected yet)", scope: "server", required: false, configured: set(process.env.ANTHROPIC_API_KEY) },
  ];
}
