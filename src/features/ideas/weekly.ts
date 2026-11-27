import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CandidateRecord, WeeklyIdea } from "./weekly-types";

export type IdeaRunInfo = {
  id: string;
  status: "running" | "succeeded" | "failed";
  createdAt: string;
  finishedAt: string | null;
  weekOf: string;
  trigger: "cron" | "manual";
  costUsd: number;
  error: string | null;
};

export type WeeklyIdeasData = {
  /** Latest successful run with its ideas and examined Steam games. */
  latest: (IdeaRunInfo & { ideas: WeeklyIdea[]; candidates: CandidateRecord[] }) | null;
  /** Most recent run of any status (to show "generating…" or a failure). */
  lastRun: IdeaRunInfo | null;
  /** A run started less than 10 minutes ago is still going. */
  generating: boolean;
};

type RunRow = {
  id: string;
  status: string;
  created_at: string;
  finished_at: string | null;
  week_of: string;
  trigger: string;
  cost_usd: number;
  error: string | null;
};

const toInfo = (r: RunRow): IdeaRunInfo => ({
  id: r.id,
  status: r.status as IdeaRunInfo["status"],
  createdAt: r.created_at,
  finishedAt: r.finished_at,
  weekOf: r.week_of,
  trigger: r.trigger as IdeaRunInfo["trigger"],
  costUsd: Number(r.cost_usd),
  error: r.error,
});

const RUN_COLUMNS = "id, status, created_at, finished_at, week_of, trigger, cost_usd, error";

/** Weekly ideas for the Game Ideas page (RLS: every member can read). Null on failure. */
export async function getWeeklyIdeas(): Promise<WeeklyIdeasData | null> {
  const supabase = await createClient();
  const [last, latest] = await Promise.all([
    supabase.from("idea_runs").select(RUN_COLUMNS).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("idea_runs")
      .select(`${RUN_COLUMNS}, candidates, weekly_ideas(id, rank, score, steam, content, roblox_check)`)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (last.error || latest.error) return null;

  const run = latest.data;
  const lastRun = last.data ? toInfo(last.data) : null;
  return {
    lastRun,
    generating: lastRun?.status === "running" && Date.now() - Date.parse(lastRun.createdAt) < 10 * 60_000,
    latest: run
      ? {
          ...toInfo(run),
          candidates: (run.candidates as unknown as CandidateRecord[]) ?? [],
          ideas: (run.weekly_ideas ?? [])
            .map((i) => ({
              id: i.id,
              rank: i.rank,
              score: i.score,
              steam: i.steam as unknown as WeeklyIdea["steam"],
              content: i.content as unknown as WeeklyIdea["content"],
              robloxCheck: i.roblox_check as unknown as WeeklyIdea["robloxCheck"],
            }))
            .sort((a, b) => a.rank - b.rank),
        }
      : null,
  };
}
