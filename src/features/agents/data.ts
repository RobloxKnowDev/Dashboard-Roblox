import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { ActionSummary } from "./ingest";
import { isAgentRole, type AgentRole } from "./roles";

/*
 * LIVE agent data for the pages. Queries run as the signed-in user, so RLS
 * decides what comes back (Owner and Admin see agents). Callers render under
 * <Suspense>. Screenshots are private: signed URLs are made with the secret
 * key only for events the user could read.
 */

type Enums = Database["public"]["Enums"];
export type AgentStatus = Enums["agent_status"];
export type AgentEventType = Enums["agent_event_type"];
export type AgentOrigin = "claude_code" | "mission" | "manual";

export type AgentSummary = {
  id: string;
  name: string;
  origin: AgentOrigin;
  role: AgentRole;
  status: AgentStatus;
  waitingReason: "input" | "permission" | "bridge" | null;
  mission: string | null;
  cwd: string | null;
  model: string | null;
  machineName: string | null;
  startedAt: string | null;
  lastActivityAt: string | null;
  endedAt: string | null;
  stopRequested: boolean;
  /** Latest timeline line, for the cards. */
  lastEvent: AgentEvent | null;
};

export type AgentEvent = {
  id: string;
  type: AgentEventType;
  message: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  imageUrl: string | null;
};

export type AgentMessage = {
  id: string;
  body: string;
  status: "pending" | "delivered" | "cancelled" | "failed";
  createdAt: string;
};

export type AgentMachine = { id: string; name: string; lastSeenAt: string | null };

/** The bridge polls every 10 s: silent for longer than this = offline. */
export const BRIDGE_ONLINE_MS = 60_000;

const AGENT_COLUMNS =
  "id, name, origin, role, status, waiting_reason, mission, cwd, model, started_at, last_activity_at, ended_at, stop_requested, agent_machines(name)";

type AgentRowWithMachine = Pick<
  Database["public"]["Tables"]["agents"]["Row"],
  "id" | "name" | "origin" | "role" | "status" | "waiting_reason" | "mission" | "cwd" | "model" | "started_at" | "last_activity_at" | "ended_at" | "stop_requested"
> & { agent_machines: { name: string } | null };

function toSummary(row: AgentRowWithMachine, lastEvent: AgentEvent | null): AgentSummary {
  const origin = row.origin === "claude_code" || row.origin === "mission" ? row.origin : "manual";
  const waiting = row.waiting_reason === "input" || row.waiting_reason === "permission" || row.waiting_reason === "bridge" ? row.waiting_reason : null;
  return {
    id: row.id,
    name: row.name,
    origin,
    role: isAgentRole(row.role) ? row.role : "general",
    status: row.status,
    waitingReason: waiting,
    mission: row.mission,
    cwd: row.cwd,
    model: row.model,
    machineName: row.agent_machines?.name ?? null,
    startedAt: row.started_at,
    lastActivityAt: row.last_activity_at,
    endedAt: row.ended_at,
    stopRequested: row.stop_requested,
    lastEvent,
  };
}

function toEvent(row: Pick<Database["public"]["Tables"]["agent_events"]["Row"], "id" | "type" | "message" | "payload" | "created_at" | "image_path">, imageUrl: string | null): AgentEvent {
  const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? (row.payload as Record<string, unknown>) : {};
  return { id: row.id, type: row.type, message: row.message, payload, createdAt: row.created_at, imageUrl };
}

/** Is the signed-in user the one person allowed to talk to agents? */
export async function isAgentController(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("studio_settings").select("agent_controller_id").limit(1).maybeSingle();
  return Boolean(data?.agent_controller_id && data.agent_controller_id === userId);
}

/** All agents, most recently active first, with their latest timeline line. Null = query failed. */
export async function listAgents(limit = 60): Promise<AgentSummary[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select(AGENT_COLUMNS)
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error || !data) return null;
  const rows = data as unknown as AgentRowWithMachine[];
  if (rows.length === 0) return [];

  // Latest meaningful line of each agent (actions are frequent: look at a window).
  const { data: events } = await supabase
    .from("agent_events")
    .select("id, agent_id, type, message, payload, created_at, image_path")
    .in(
      "agent_id",
      rows.map((r) => r.id),
    )
    .in("type", ["instruction", "reply", "waiting", "error", "screenshot", "completed", "action"])
    .order("created_at", { ascending: false })
    .limit(rows.length * 6);
  const latest = new Map<string, AgentEvent>();
  for (const event of events ?? []) {
    if (!latest.has(event.agent_id)) latest.set(event.agent_id, toEvent(event, null));
  }
  return rows.map((row) => toSummary(row, latest.get(row.id) ?? null));
}

export type AgentDetail = {
  agent: AgentSummary;
  events: AgentEvent[];
  /** Older events not shown. */
  hiddenEvents: number;
  pending: AgentMessage[];
};

const TIMELINE_LIMIT = 250;

export async function getAgentDetail(id: string): Promise<AgentDetail | null> {
  const supabase = await createClient();
  const { data: row } = await supabase.from("agents").select(AGENT_COLUMNS).eq("id", id).maybeSingle();
  if (!row) return null;

  const [{ data: events, count }, { data: messages }] = await Promise.all([
    supabase
      .from("agent_events")
      .select("id, type, message, payload, created_at, image_path", { count: "exact" })
      .eq("agent_id", id)
      .order("created_at", { ascending: false })
      .limit(TIMELINE_LIMIT),
    supabase.from("agent_messages").select("id, body, status, created_at").eq("agent_id", id).eq("status", "pending").order("created_at"),
  ]);

  // The row was readable under RLS: sign its screenshots (private bucket).
  const paths = (events ?? []).map((e) => e.image_path).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await createAdminClient().storage.from("agent-media").createSignedUrls(paths, 3600);
    for (const entry of signed ?? []) if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
  }

  const ordered = [...(events ?? [])].reverse().map((e) => toEvent(e, e.image_path ? (urls.get(e.image_path) ?? null) : null));
  return {
    agent: toSummary(row as unknown as AgentRowWithMachine, null),
    events: ordered,
    hiddenEvents: Math.max(0, (count ?? ordered.length) - ordered.length),
    pending: (messages ?? []).map((m) => ({ id: m.id, body: m.body, status: m.status as AgentMessage["status"], createdAt: m.created_at })),
  };
}

/** PCs connected to the dashboard (Admin+). */
export async function listMachines(): Promise<AgentMachine[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("agent_machines").select("id, name, last_seen_at, revoked_at").order("last_seen_at", { ascending: false, nullsFirst: false });
  return (data ?? []).filter((m) => !m.revoked_at).map((m) => ({ id: m.id, name: m.name, lastSeenAt: m.last_seen_at }));
}

/** Project folders already seen on the PCs (suggestions for a new mission). */
export async function knownFolders(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("agents").select("cwd").not("cwd", "is", null).order("last_activity_at", { ascending: false, nullsFirst: false }).limit(200);
  const seen = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.cwd && !seen.has(row.cwd.toLowerCase())) seen.set(row.cwd.toLowerCase(), row.cwd);
  }
  return [...seen.values()].slice(0, 20);
}

export function isActionSummary(payload: Record<string, unknown>): payload is ActionSummary & Record<string, unknown> {
  return typeof payload.kind === "string" && typeof payload.target === "string";
}
