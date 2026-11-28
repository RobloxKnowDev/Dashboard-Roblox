import { NextResponse, type NextRequest } from "next/server";
import { authenticateMachine, handleHook, handlePoll, handleRunResult, ingestSchema } from "@/features/agents/ingest-server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Agent ingestion (docs/AGENTS.md): Claude Code hooks, the bridge's poll and
 * the result of each bridge run. Authenticated by the PC's machine token.
 */
const MAX_BODY_BYTES = 256 * 1024;

export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  const machine = await authenticateMachine(admin, request.headers.get("authorization"));
  if (!machine) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = ingestSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const body = parsed.data;
  try {
    switch (body.type) {
      case "hook":
        return NextResponse.json(await handleHook(admin, machine, body.agentId, body.event));
      case "poll":
        return NextResponse.json(await handlePoll(admin, machine, body.sessions, body.running));
      case "run_result":
        return NextResponse.json({ ok: await handleRunResult(admin, machine, body) });
    }
  } catch (error) {
    console.error("[agents/ingest]", body.type, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
