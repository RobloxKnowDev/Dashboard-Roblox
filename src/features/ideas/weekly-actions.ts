"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { messages } from "@/i18n/messages";
import { getRequestLocale } from "@/i18n/server";
import type { ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { runIdeasPipeline, startIdeasRun } from "./pipeline";
import { mondayOf, type WeeklyIdea } from "./weekly-types";

/** Owner only: generates this week's ideas now (runs after the response, 1–3 min). */
export async function generateIdeasNow(): Promise<ActionResult> {
  const t = messages[await getRequestLocale()].ideas.weekly.errors;
  const access = await checkAccess("owner");
  if (access.status !== "allowed") return { ok: false, message: t.ownerOnly };
  const now = new Date();
  const started = await startIdeasRun("manual", access.user.id, now);
  if ("error" in started) return { ok: false, message: t[started.error] };
  const userId = access.user.id;
  after(() => runIdeasPipeline(started.runId, userId, now.toISOString().slice(0, 10)));
  return { ok: true };
}

/**
 * Copies a weekly idea into the studio's library (developers and above), in
 * the language the user is reading it in. Written with the secret key because
 * RLS only lets members insert ideas of origin "manual".
 */
export async function saveWeeklyIdea(ideaId: string): Promise<ActionResult> {
  const locale = await getRequestLocale();
  const t = messages[locale].ideas.weekly.errors;
  const access = await checkAccess("developer");
  if (access.status !== "allowed") return { ok: false, message: t.developerOnly };
  if (!z.uuid().safeParse(ideaId).success) return { ok: false, message: t.failed };

  const supabase = await createClient();
  const { data } = await supabase.from("weekly_ideas").select("id, score, content, steam, idea_runs(week_of)").eq("id", ideaId).maybeSingle();
  if (!data) return { ok: false, message: t.failed };
  const content = (data.content as unknown as WeeklyIdea["content"])[locale];
  const steam = data.steam as unknown as WeeklyIdea["steam"];

  const admin = createAdminClient();
  const { data: existing } = await admin.from("game_ideas").select("id").eq("origin", "ai").eq("title", content.title).limit(1);
  if (existing && existing.length > 0) return { ok: false, message: t.alreadySaved };

  const run = data.idea_runs as unknown as { week_of: string } | null;
  const { error } = await admin.from("game_ideas").insert({
    title: content.title.slice(0, 160),
    pitch: [content.pitch, content.why, `Steam: ${steam.name} — ${steam.url}`].join("\n\n").slice(0, 1000),
    genre: content.genre.slice(0, 60),
    target_audience: content.targetAudience.slice(0, 200),
    core_loop: content.coreLoop.slice(0, 1000),
    monetization: content.monetization.slice(0, 1000),
    score: data.score,
    week_of: run?.week_of ?? mondayOf(new Date().toISOString().slice(0, 10)),
    origin: "ai",
    status: "saved",
    created_by: access.user.id,
  });
  if (error) return { ok: false, message: t.failed };
  revalidatePath("/discover/ideas");
  return { ok: true };
}
