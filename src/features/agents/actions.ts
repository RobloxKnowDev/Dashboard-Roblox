"use server";

import { z } from "zod";
import { messages } from "@/i18n/messages";
import { getRequestLocale } from "@/i18n/server";
import { slugify, type ActionResult } from "@/lib/action-result";
import { checkAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { baseName, clip, missionFromPrompt } from "./ingest";
import { isAgentController } from "./data";
import { MISSION_ROLES } from "./roles";

/*
 * Talking to agents — the agent controller only (one account, set in the
 * database). RLS enforces the same rule; these checks give clear messages.
 */

async function controller() {
  const locale = await getRequestLocale();
  const t = messages[locale].agents.errors;
  const access = await checkAccess("admin");
  if (access.status !== "allowed" || !(await isAgentController(access.user.id))) return { ok: false as const, t, locale };
  return { ok: true as const, t, locale, user: access.user };
}

const bodySchema = z.string().trim().min(1).max(8000);

/** Queues a message: delivered by the Stop hook (agent at work) or the bridge. */
export async function sendAgentMessage(agentId: string, body: string): Promise<ActionResult> {
  const who = await controller();
  if (!who.ok) return { ok: false, message: who.t.controllerOnly };
  const text = bodySchema.safeParse(body);
  if (!z.uuid().safeParse(agentId).success || !text.success) return { ok: false, message: who.t.invalid };
  const supabase = await createClient();
  const { error } = await supabase.from("agent_messages").insert({ agent_id: agentId, body: text.data, created_by: who.user.id });
  if (error) return { ok: false, message: who.t.failed };
  return { ok: true };
}

export async function cancelAgentMessage(messageId: string): Promise<ActionResult> {
  const who = await controller();
  if (!who.ok) return { ok: false, message: who.t.controllerOnly };
  if (!z.uuid().safeParse(messageId).success) return { ok: false, message: who.t.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase.from("agent_messages").update({ status: "cancelled" }).eq("id", messageId).eq("status", "pending").select("id");
  if (error) return { ok: false, message: who.t.failed };
  if (!data?.length) return { ok: false, message: who.t.alreadyDelivered };
  return { ok: true };
}

/** Asks the bridge to stop a run in progress (missions and background continuations). */
export async function stopAgent(agentId: string): Promise<ActionResult> {
  const who = await controller();
  if (!who.ok) return { ok: false, message: who.t.controllerOnly };
  if (!z.uuid().safeParse(agentId).success) return { ok: false, message: who.t.invalid };
  const supabase = await createClient();
  const { error } = await supabase.from("agents").update({ stop_requested: true }).eq("id", agentId);
  return error ? { ok: false, message: who.t.failed } : { ok: true };
}

const missionSchema = z.object({
  cwd: z
    .string()
    .trim()
    .min(3)
    .max(500)
    .regex(/^(?:[A-Za-z]:[\\/]|\/)/),
  role: z.enum(MISSION_ROLES),
  instruction: z.string().trim().min(3).max(8000),
});

export type MissionInput = z.input<typeof missionSchema>;

/** Creates a mission agent and its first message; the PC's bridge starts it. */
export async function startMission(input: MissionInput): Promise<ActionResult<{ agentId: string }>> {
  const who = await controller();
  if (!who.ok) return { ok: false, message: who.t.controllerOnly };
  const parsed = missionSchema.safeParse(input);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { ok: false, message: field === "cwd" ? who.t.badFolder : who.t.invalid };
  }
  const { cwd, role, instruction } = parsed.data;
  const t = messages[who.locale].agents;
  const supabase = await createClient();

  // The PC seen most recently runs it.
  const { data: machine } = await supabase
    .from("agent_machines")
    .select("id")
    .is("revoked_at", null)
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!machine) return { ok: false, message: who.t.noMachine };

  const { data: agent, error } = await supabase
    .from("agents")
    .insert({
      name: clip(t.mission.agentName(t.roles[role].label, baseName(cwd)), 120),
      origin: "mission",
      role,
      cwd,
      mission: missionFromPrompt(instruction),
      status: "waiting",
      waiting_reason: "bridge",
      machine_id: machine.id,
      created_by: who.user.id,
    })
    .select("id")
    .single();
  if (error || !agent) return { ok: false, message: who.t.failed };

  const { error: messageError } = await supabase.from("agent_messages").insert({ agent_id: agent.id, body: instruction, created_by: who.user.id });
  if (messageError) return { ok: false, message: who.t.failed };
  return { ok: true, data: { agentId: agent.id } };
}

const gameSchema = z.object({
  // Becomes a folder name on the PC: no characters Windows forbids.
  name: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[^\/:*?"<>|]+$/)
    .refine((value) => !/[. ]$/.test(value)),
  idea: z.string().trim().min(10).max(4000),
});

export type GameInput = z.input<typeof gameSchema>;

/**
 * New game: a project (the game) and its manager agent. The PC's bridge
 * creates the Rojo project, the assets folder and the place from the studio
 * template, then starts the manager, which builds the team.
 */
export async function startGame(input: GameInput): Promise<ActionResult<{ agentId: string }>> {
  const who = await controller();
  if (!who.ok) return { ok: false, message: who.t.controllerOnly };
  const parsed = gameSchema.safeParse(input);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { ok: false, message: field === "name" ? who.t.badName : who.t.invalid };
  }
  const { name, idea } = parsed.data;
  const supabase = await createClient();

  const { data: machine } = await supabase
    .from("agent_machines")
    .select("id")
    .is("revoked_at", null)
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!machine) return { ok: false, message: who.t.noMachine };

  const slug = slugify(name) || `game-${Date.now()}`;
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({ name, slug, description: idea, status: "planning", created_by: who.user.id })
    .select("id")
    .single();
  if (projectError?.code === "23505") return { ok: false, message: who.t.nameTaken };
  if (projectError || !project) return { ok: false, message: who.t.failed };

  const { data: agent, error } = await supabase
    .from("agents")
    .insert({
      name: clip(`Manager · ${name}`, 120),
      origin: "mission",
      role: "manager",
      project_id: project.id,
      mission: missionFromPrompt(idea),
      status: "waiting",
      waiting_reason: "bridge",
      machine_id: machine.id,
      created_by: who.user.id,
    })
    .select("id")
    .single();
  if (error || !agent) return { ok: false, message: who.t.failed };

  const brief = `New game: ${name}\n\nThe person's main idea:\n${idea}`;
  const { error: messageError } = await supabase.from("agent_messages").insert({ agent_id: agent.id, body: brief, created_by: who.user.id });
  if (messageError) return { ok: false, message: who.t.failed };
  return { ok: true, data: { agentId: agent.id } };
}
