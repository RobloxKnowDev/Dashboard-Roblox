import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runIdeasPipeline, startIdeasRun } from "@/features/ideas/pipeline";

/**
 * Weekly game ideas (Vercel Cron, Monday 07:00 UTC — see vercel.json).
 * Protected by CRON_SECRET; Steam + Roblox + Claude take 1–3 minutes.
 */
export const maxDuration = 300;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const started = await startIdeasRun("cron", null, now);
  if ("error" in started) {
    // Not an error for the scheduler when Claude isn't configured or the budget is reached.
    console.warn("[weekly-ideas] not started:", started.error);
    return NextResponse.json({ started: false, reason: started.error });
  }
  await runIdeasPipeline(started.runId, null, now.toISOString().slice(0, 10));
  return NextResponse.json({ started: true, runId: started.runId });
}
