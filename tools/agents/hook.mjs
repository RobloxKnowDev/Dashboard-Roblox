// Claude Code hook → studio dashboard (docs/AGENTS.md).
// Installed in ~/.claude/settings.json by setup.mjs for: SessionStart, UserPromptSubmit,
// PostToolUse, Notification, Stop, StopFailure, SessionEnd. Reads the event on stdin.
// Only short fields are sent (never file contents or command output). Never fails
// the session: any error is logged to ~/.dashboard-agents/hooks.log and ignored.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, log, postJson, readStdin } from "./lib.mjs";

const SHARE_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "share.mjs");
const TEAM_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "team.mjs");

function pick(input, keys, max) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string") out[key] = value.slice(0, max);
  }
  return out;
}

function short(value, max) {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}

/** The subset of the hook event the dashboard needs. */
function trim(event) {
  const model = typeof event.model === "string" ? event.model : (event.model?.id ?? event.model?.display_name);
  return {
    hook_event_name: event.hook_event_name,
    session_id: event.session_id,
    cwd: short(event.cwd, 500),
    permission_mode: short(event.permission_mode, 40),
    model: short(model, 100),
    source: short(event.source, 20),
    prompt: short(event.prompt, 4000),
    tool_name: short(event.tool_name, 200),
    tool_input: event.tool_name ? pick(event.tool_input, ["file_path", "notebook_path", "description", "command", "query", "url", "subagent_type"], 300) : undefined,
    last_assistant_message: short(event.last_assistant_message, 8000),
    message: short(event.message, 1000),
    notification_type: short(event.notification_type, 60),
    reason: short(event.reason, 60),
    error: short(event.error, 60),
  };
}

/** Context added to every session: how to show an image on the dashboard. */
function shareContext(sessionId, agentId) {
  const node = process.execPath;
  const agent = agentId ? ` --agent ${agentId}` : "";
  return [
    "## Studio dashboard",
    `This Claude Code session reports to the studio's dashboard (session ${sessionId}).`,
    "When your instructions or the person ask for an image on the dashboard (for example a screenshot of a UI you built), share it with one of:",
    `  "${node}" "${SHARE_SCRIPT}" --session ${sessionId}${agent} --window studio --caption "<short caption>"   (captures the Roblox Studio window; --window blender for Blender)`,
    `  "${node}" "${SHARE_SCRIPT}" --session ${sessionId}${agent} --file "<path to a PNG or JPEG>" --caption "<short caption>"`,
    ...(agentId
      ? [
          "Team command (game managers only — members' reports come back to the manager as messages):",
          `  "${node}" "${TEAM_SCRIPT}" delegate --role <game_designer|build|ui|sfx|scripting|qa|art> --title "<short title>" --file <brief.md>`,
          `  "${node}" "${TEAM_SCRIPT}" message --to <member agent id> --file <message.md>`,
          `  "${node}" "${TEAM_SCRIPT}" status`,
        ]
      : []),
  ].join("\n");
}

/** Writes to stdout and waits for the flush (process.exit right after a write can lose it). */
function emit(data) {
  return new Promise((resolve) => process.stdout.write(JSON.stringify(data), () => resolve()));
}

const raw = await readStdin();
let event;
try {
  event = JSON.parse(raw);
} catch {
  process.exit(0);
}
const config = loadConfig();
if (!config || !event?.session_id || !event?.hook_event_name) process.exit(0);

const name = event.hook_event_name;
const agentId = process.env.DASHBOARD_AGENT_ID || undefined;
const timeouts = { SessionStart: 3000, Stop: 12_000, SessionEnd: 3000 };

try {
  if (name === "SessionStart") {
    await emit({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: shareContext(event.session_id, agentId) } });
  }
  const reply = await postJson(config, "/api/agents/ingest", { type: "hook", agentId, event: trim(event) }, timeouts[name] ?? 8000);
  // A dashboard message waiting for this agent: Claude continues with it.
  if (name === "Stop" && reply?.decision === "block" && typeof reply.reason === "string") {
    await emit({ decision: "block", reason: reply.reason });
  }
} catch (error) {
  log("hooks.log", `${name} ${event.session_id}: ${error instanceof Error ? error.message : String(error)}`);
}
process.exit(0);
