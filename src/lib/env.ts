import { z } from "zod";

/**
 * Environment variables, validated on first use with a clear error message.
 * Public values (NEXT_PUBLIC_*) are inlined at build time and safe for the
 * browser; everything else must only be read on the server.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ error: "NEXT_PUBLIC_SUPABASE_URL is missing or isn't your Supabase project URL" }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string({ error: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing" }).min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string({ error: "SUPABASE_SECRET_KEY is missing" }).min(1, "SUPABASE_SECRET_KEY is missing"),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function format(error: z.ZodError): string {
  return error.issues.map((issue) => `  • ${issue.message}`).join("\n");
}

let cachedPublic: PublicEnv | undefined;

export function publicEnv(): PublicEnv {
  if (cachedPublic) return cachedPublic;
  // Each NEXT_PUBLIC_ variable must be referenced literally to be inlined.
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
  if (!parsed.success) {
    throw new Error(`Invalid public environment — see .env.example:\n${format(parsed.error)}`);
  }
  cachedPublic = parsed.data;
  return cachedPublic;
}

export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must never be called in the browser");
  }
  const parsed = serverSchema.safeParse({ SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY });
  if (!parsed.success) {
    throw new Error(`Invalid server environment — see .env.example:\n${format(parsed.error)}`);
  }
  return parsed.data;
}

/** True when the Supabase public variables are present (used to show setup hints). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
