import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";
import { agentNameFromCwd, bridgePlan, clip, deliveredInstruction, missionFromPrompt, redactSecrets, sniffImage, summarizeTool } from "./ingest";
import { isAgentRole, missionSystemPrompt } from "./roles";

/**
 * Agent ingestion (docs/AGENTS.md): what the PC's Claude Code hooks and the
 * bridge send to /api/agents/*. Authenticated by a machine token, written with
 * the secret key — so every check (machine ownership, sizes) is done here.
 */

type Admin = ReturnType<typeof createAdminClient>;
type AgentRow = Database["public"]["Tables"]["agents"]["Row"];
type AgentUpdate = Database["public"]["Tables"]["agents"]["Update"];
type EventInsert = Omit<Database["public"]["Tables"]["agent_events"]["Insert"], "agent_id">;

export type Machine = { id: string; name: string };

/** Runs the bridge may do at the same time on one PC. */
export const MAX_PARALLEL_RUNS = 2;
/** How often the bridge polls (ms). */
export const POLL_INTERVAL_MS = 10_000;
/** A session missing from the PC's list for this long is considered closed. */
const GONE_GRACE_MS = 120_000;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function authenticateMachine(admin: Admin, authorization: string | null): Promise<Machine | null> {
  const match = /^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(authorization ?? "");
  if (!match) return null;
  const { data } = await admin.from("agent_machines").select("id, name, revoked_at").eq("token_hash", hashToken(match[1]!)).maybeSingle();
  if (!data || data.revoked_at) return null;
  return { id: data.id, name: data.name };
}

/* ────────────────────────────── Payloads ────────────────────────────── */

const hookEvent = z.object({
  hook_event_name: z.string().min(1).max(40),
  session_id: z.string().min(1).max(100),
  cwd: z.string().max(500).optional(),
  permission_mode: z.string().max(40).optional(),
  model: z.string().max(100).optional(),
  source: z.string().max(20).optional(),
  prompt: z.string().max(20_000).optional(),
  tool_name: z.string().max(200).optional(),
  tool_input: z.record(z.string(), z.unknown()).optional(),
  last_assistant_message: z.string().max(20_000).optional(),
  message: z.string().max(2000).optional(),
  notification_type: z.string().max(60).optional(),
  reason: z.string().max(60).optional(),
  error: z.string().max(60).optional(),
});

export type HookEvent = z.infer<typeof hookEvent>;

export const ingestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hook"), agentId: z.uuid().optional(), event: hookEvent }),
  z.object({
    type: z.literal("poll"),
    sessions: z.array(z.object({ sessionId: z.string().min(1).max(100), status: z.string().max(20).optional() })).max(100),
    running: z.array(z.uuid()).max(10),
  }),
  z.object({
    type: z.literal("run_result"),
    agentId: z.uuid(),
    exitCode: z.number().int().nullable(),
    stopped: z.boolean().optional(),
    error: z.string().max(2000).optional(),
  }),
]);

/* ─────────────────────────────── Agents ─────────────────────────────── */

/** The agent a session belongs to (this machine's only), linking a bridge run on first sight. */
async function findAgent(admin: Admin, machine: Machine, sessionId: string, agentId: string | undefined): Promise<AgentRow | null> {
  const { data: link } = await admin.from("agent_sessions").select("agent_id").eq("session_id", sessionId).maybeSingle();
  const id = link?.agent_id ?? agentId;
  if (!id) return null;
  const { data: agent } = await admin.from("agents").select("*").eq("id", id).maybeSingle();
  if (!agent || (agent.machine_id && agent.machine_id !== machine.id)) return null;
  if (link) return agent;

  // First event of a bridge run: this session now continues the agent's conversation.
  await admin.from("agent_sessions").upsert({ session_id: sessionId, agent_id: agent.id }, { onConflict: "session_id", ignoreDuplicates: true });
  const { data: updated } = await admin.from("agents").update({ session_id: sessionId, machine_id: machine.id }).eq("id", agent.id).select("*").single();
  return updated ?? agent;
}

/** A conversation opened by a person (VS Code, terminal) appears on its first real activity. */
async function createSessionAgent(admin: Admin, machine: Machine, event: HookEvent): Promise<AgentRow | null> {
  const now = new Date().toISOString();
  const { data: agent } = await admin
    .from("agents")
    .insert({
      name: agentNameFromCwd(event.cwd),
      origin: "claude_code",
      machine_id: machine.id,
      session_id: event.session_id,
      cwd: event.cwd ? clip(event.cwd, 500) : null,
      status: "working",
      started_at: now,
      model: event.model ? clip(event.model, 80) : null,
      permission_mode: event.permission_mode ?? null,
    })
    .select("*")
    .single();
  if (!agent) return null;
  // Hooks run in parallel: the session's primary key decides which insert wins.
  const { error } = await admin.from("agent_sessions").insert({ session_id: event.session_id, agent_id: agent.id });
  if (error) {
    await admin.from("agents").delete().eq("id", agent.id);
    return findAgent(admin, machine, event.session_id, undefined);
  }
  await admin.from("agent_events").insert({ agent_id: agent.id, type: "started", payload: { kind: "session" } });
  return agent;
}

/** Claims every pending message of an agent (oldest first) for one delivery. */
async function claimPending(admin: Admin, agentId: string, via: "hook" | "bridge"): Promise<{ body: string; author: string | null; bodies: string[] } | null> {
  const { data: pending } = await admin
    .from("agent_messages")
    .select("id, body, created_by")
    .eq("agent_id", agentId)
    .eq("status", "pending")
    .order("created_at")
    .limit(10);
  if (!pending?.length) return null;
  const { data: claimed } = await admin
    .from("agent_messages")
    .update({ status: "delivered", delivered_at: new Date().toISOString(), delivered_via: via })
    .in(
      "id",
      pending.map((m) => m.id),
    )
    .eq("status", "pending")
    .select("id, body, created_by, created_at");
  if (!claimed?.length) return null;
  claimed.sort((a, b) => a.created_at.localeCompare(b.created_at));
  const authorId = claimed[0]!.created_by;
  const { data: profile } = authorId ? await admin.from("profiles").select("full_name, email").eq("id", authorId).maybeSingle() : { data: null };
  const author = profile ? profile.full_name.trim() || profile.email?.split("@")[0] || null : null;
  const bodies = claimed.map((m) => m.body);
  return { body: bodies.join("\n\n---\n\n"), author, bodies };
}

async function apply(admin: Admin, agentId: string, events: EventInsert[], update: AgentUpdate): Promise<void> {
  if (events.length) await admin.from("agent_events").insert(events.map((event) => ({ ...event, agent_id: agentId })));
  await admin
    .from("agents")
    .update({ ...update, last_activity_at: new Date().toISOString() })
    .eq("id", agentId);
}

/* ──────────────────────────────── Hooks ─────────────────────────────── */

/** What the hook script prints back to Claude Code (Stop: deliver a dashboard message). */
export type HookResponse = { decision?: "block"; reason?: string };

export async function handleHook(admin: Admin, machine: Machine, agentId: string | undefined, event: HookEvent): Promise<HookResponse> {
  const name = event.hook_event_name;
  const fromBridge = Boolean(agentId);
  let agent = await findAgent(admin, machine, event.session_id, agentId);
  if (!agent && !fromBridge && (name === "UserPromptSubmit" || name === "PostToolUse" || name === "Stop")) {
    agent = await createSessionAgent(admin, machine, event);
  }
  if (!agent) return {};

  const now = new Date().toISOString();
  const events: EventInsert[] = [];
  const update: AgentUpdate = {};
  let response: HookResponse = {};
  // Status follows the conversation's latest session (a fork may have taken over).
  const isLatest = fromBridge || agent.session_id === event.session_id;

  switch (name) {
    case "SessionStart":
      if (event.model) update.model = clip(event.model, 80);
      if (event.permission_mode) update.permission_mode = event.permission_mode;
      if (fromBridge) Object.assign(update, { status: "working", waiting_reason: null, ended_at: null });
      else if (event.source === "resume") events.push({ type: "status_change", payload: { kind: "resumed" } });
      break;

    case "UserPromptSubmit":
      // A bridge run's prompt is the dashboard message, already on the timeline.
      if (!fromBridge && event.prompt) events.push({ type: "instruction", message: clip(redactSecrets(event.prompt), 1500), payload: { via: "claude_code" } });
      if (!agent.mission && event.prompt) update.mission = missionFromPrompt(event.prompt);
      if (event.permission_mode) update.permission_mode = event.permission_mode;
      // The session someone types in becomes the conversation's latest one.
      Object.assign(update, { session_id: event.session_id, status: "working", waiting_reason: null, ended_at: null });
      break;

    case "PostToolUse": {
      const summary = event.tool_name ? summarizeTool(event.tool_name, event.tool_input) : null;
      if (summary) events.push({ type: "action", payload: summary as unknown as NonNullable<Json> });
      if (isLatest && (agent.status !== "working" || agent.waiting_reason)) Object.assign(update, { status: "working", waiting_reason: null });
      break;
    }

    case "Notification":
      if (event.notification_type === "permission_prompt" && isLatest) {
        Object.assign(update, { status: "waiting", waiting_reason: "permission" });
        events.push({ type: "waiting", message: event.message ? clip(event.message, 300) : null, payload: { kind: "permission" } });
      }
      break;

    case "Stop": {
      if (event.last_assistant_message) events.push({ type: "reply", message: clip(event.last_assistant_message, 4000) });
      const delivered = isLatest ? await claimPending(admin, agent.id, "hook") : null;
      if (delivered) {
        for (const body of delivered.bodies) events.push({ type: "instruction", message: body, payload: { via: "dashboard", author: delivered.author } });
        Object.assign(update, { status: "working", waiting_reason: null });
        response = { decision: "block", reason: deliveredInstruction(delivered.body, delivered.author) };
      } else if (!fromBridge && isLatest) {
        // A bridge run ends right after: its exit sets the final status.
        Object.assign(update, { status: "waiting", waiting_reason: "input" });
      }
      break;
    }

    case "StopFailure":
      events.push({ type: "error", payload: { kind: "stop_failure", error: event.error ?? "unknown" } });
      if (isLatest) Object.assign(update, { status: "error", waiting_reason: null });
      break;

    case "SessionEnd":
      if (!fromBridge && isLatest) {
        Object.assign(update, { status: "completed", waiting_reason: null, ended_at: now });
        events.push({ type: "status_change", payload: { kind: "ended" } });
      }
      break;

    default:
      return {};
  }

  await apply(admin, agent.id, events, update);
  return response;
}

/* ─────────────────────────────── Bridge ─────────────────────────────── */

export type WorkItem = {
  agentId: string;
  prompt: string;
  cwd: string;
  /** Claude Code session to continue (null = new conversation). */
  resume: string | null;
  /** Continue in a new session id (the original is still open in VS Code). */
  fork: boolean;
  systemPrompt: string;
};

export type PollResponse = { work: WorkItem[]; stop: string[]; pollMs: number };

export async function handlePoll(admin: Admin, machine: Machine, sessions: { sessionId: string }[], running: string[]): Promise<PollResponse> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  await admin.from("agent_machines").update({ last_seen_at: nowIso }).eq("id", machine.id);
  const alive = new Set(sessions.map((s) => s.sessionId));
  const runningSet = new Set(running);
  const stale = (iso: string | null) => !iso || now - Date.parse(iso) > GONE_GRACE_MS;

  // Windows closed without a SessionEnd, and bridge runs lost (PC restarted).
  const { data: open } = await admin
    .from("agents")
    .select("id, origin, status, session_id, last_activity_at")
    .eq("machine_id", machine.id)
    .in("status", ["working", "waiting"]);
  const closed: string[] = [];
  const interrupted: string[] = [];
  for (const agent of open ?? []) {
    if (runningSet.has(agent.id) || !stale(agent.last_activity_at)) continue;
    if (agent.origin === "claude_code" && agent.session_id && !alive.has(agent.session_id)) closed.push(agent.id);
    if (agent.origin === "mission" && agent.status === "working") interrupted.push(agent.id);
  }
  if (closed.length) await admin.from("agents").update({ status: "completed", waiting_reason: null, ended_at: nowIso }).in("id", closed);
  for (const id of interrupted) await apply(admin, id, [{ type: "error", payload: { kind: "interrupted" } }], { status: "error", waiting_reason: null });

  const stop = running.length
    ? ((await admin.from("agents").select("id").in("id", running).eq("stop_requested", true)).data ?? []).map((row) => row.id)
    : [];

  // Pending messages this PC should run (an agent at work gets them from its Stop hook).
  const work: WorkItem[] = [];
  let capacity = MAX_PARALLEL_RUNS - running.length;
  if (capacity > 0) {
    const { data: pending } = await admin.from("agent_messages").select("agent_id, created_at").eq("status", "pending").order("created_at").limit(50);
    const agentIds = [...new Set((pending ?? []).map((m) => m.agent_id))].filter((id) => !runningSet.has(id));
    const { data: candidates } = agentIds.length ? await admin.from("agents").select("*").in("id", agentIds) : { data: [] };
    const byId = new Map((candidates ?? []).map((a) => [a.id, a]));
    for (const id of agentIds) {
      if (capacity <= 0) break;
      const agent = byId.get(id);
      if (!agent || !agent.cwd) continue;
      if (agent.machine_id && agent.machine_id !== machine.id) continue;
      if (agent.origin === "claude_code" && agent.status === "working") continue;
      const delivered = await claimPending(admin, agent.id, "bridge");
      if (!delivered) continue;
      const plan = bridgePlan(agent, alive);
      await apply(
        admin,
        agent.id,
        delivered.bodies.map((body) => ({ type: "instruction" as const, message: body, payload: { via: "dashboard", author: delivered.author } })),
        { status: "working", waiting_reason: null, stop_requested: false, machine_id: machine.id, ended_at: null, started_at: agent.started_at ?? nowIso },
      );
      work.push({
        agentId: agent.id,
        prompt: delivered.body,
        cwd: agent.cwd,
        resume: plan.resume,
        fork: plan.fork,
        systemPrompt: missionSystemPrompt(isAgentRole(agent.role) ? agent.role : "general"),
      });
      capacity -= 1;
    }
  }

  return { work, stop, pollMs: POLL_INTERVAL_MS };
}

export async function handleRunResult(
  admin: Admin,
  machine: Machine,
  result: { agentId: string; exitCode: number | null; stopped?: boolean; error?: string },
): Promise<boolean> {
  const { data: agent } = await admin.from("agents").select("id, machine_id").eq("id", result.agentId).maybeSingle();
  if (!agent || agent.machine_id !== machine.id) return false;
  if (result.stopped) {
    await apply(admin, agent.id, [{ type: "status_change", payload: { kind: "stopped" } }], { status: "completed", waiting_reason: null, stop_requested: false });
  } else if (result.exitCode === 0) {
    await apply(admin, agent.id, [{ type: "completed", payload: { kind: "run_finished" } }], { status: "completed", waiting_reason: null });
  } else {
    const detail = clip(redactSecrets(result.error ?? `exit code ${result.exitCode ?? "?"}`), 500);
    await apply(admin, agent.id, [{ type: "error", message: detail, payload: { kind: "run_failed" } }], { status: "error", waiting_reason: null });
  }
  return true;
}

/* ─────────────────────────────── Images ─────────────────────────────── */

export type MediaResult = { ok: true; eventId: string } | { ok: false; status: number; error: string };

export async function handleMedia(admin: Admin, machine: Machine, form: FormData): Promise<MediaResult> {
  const sessionId = form.get("sessionId");
  const agentId = form.get("agentId");
  const caption = form.get("caption");
  const file = form.get("file");
  if (typeof sessionId !== "string" || !sessionId || sessionId.length > 100) return { ok: false, status: 400, error: "sessionId required" };
  if (!(file instanceof File)) return { ok: false, status: 400, error: "file required" };
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) return { ok: false, status: 413, error: "image must be under 8 MB" };
  const parsedAgentId = typeof agentId === "string" && z.uuid().safeParse(agentId).success ? agentId : undefined;

  const agent = await findAgent(admin, machine, sessionId, parsedAgentId);
  if (!agent) return { ok: false, status: 404, error: "unknown session: the agent appears after its first instruction" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, status: 415, error: "PNG, JPEG or WebP only" };

  const path = `${agent.id}/${randomUUID()}.${kind.ext}`;
  const { error: uploadError } = await admin.storage.from("agent-media").upload(path, bytes, { contentType: kind.mime, upsert: false });
  if (uploadError) return { ok: false, status: 500, error: "upload failed" };

  const { data: event } = await admin
    .from("agent_events")
    .insert({ agent_id: agent.id, type: "screenshot", message: typeof caption === "string" && caption.trim() ? clip(caption, 300) : null, image_path: path })
    .select("id")
    .single();
  await admin.from("agents").update({ last_activity_at: new Date().toISOString() }).eq("id", agent.id);
  return event ? { ok: true, eventId: event.id } : { ok: false, status: 500, error: "event not saved" };
}
