/**
 * Pure helpers for agent ingestion (no I/O — tested in ingest.test.ts).
 * Claude Code hooks report what a session does; we keep short summaries only:
 * never file contents, command output or anything that looks like a secret.
 */

/** What a tool call becomes on the agent's timeline (rendered with t.agents.actions). */
export type ActionSummary =
  | { kind: "edit"; target: string }
  | { kind: "command"; target: string }
  | { kind: "search"; target: string }
  | { kind: "fetch"; target: string }
  | { kind: "subagent"; target: string }
  | { kind: "mcp"; server: string; target: string }
  | { kind: "tool"; target: string };

/** Tools too frequent or too internal to be worth a line on the timeline. */
const SKIPPED_TOOLS = new Set([
  "Read",
  "Grep",
  "Glob",
  "LS",
  "TodoWrite",
  "ToolSearch",
  "Skill",
  "TaskCreate",
  "TaskUpdate",
  "TaskList",
  "TaskGet",
  "TaskOutput",
  "TaskStop",
  "Monitor",
  "ListMcpResourcesTool",
  "ReadMcpResourceTool",
  "ExitPlanMode",
  "EnterPlanMode",
]);

/** Cuts a text to `max` characters (on a word boundary when possible). */
export function clip(text: string, max: number): string {
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${space > max * 0.7 ? cut.slice(0, space) : cut}…`;
}

/**
 * Masks what looks like a credential: key=value pairs whose key mentions a
 * secret, bearer tokens, and long opaque strings (API keys, JWTs).
 */
export function redactSecrets(text: string): string {
  return text
    .replace(/\bbearer\s+[^\s'"]+/gi, "Bearer •••")
    .replace(/\b(authorization)\s*[:=]\s*(?!bearer\b)[^\s'"]+/gi, "$1: •••")
    .replace(/\b([A-Za-z_]*(?:key|token|secret|password|passwd|pwd)[A-Za-z_]*)\s*[:=]\s*("[^"]*"|'[^']*'|\S+)/gi, "$1=•••")
    .replace(/\b(?:sk|pk|rk|ghp|gho|xox[bp])[-_][A-Za-z0-9_-]{12,}/g, "•••")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, "•••")
    .replace(/[A-Za-z0-9+_-]{40,}={0,2}/g, "•••");
}

/** Last segment of a Windows or POSIX path. */
export function baseName(path: string): string {
  const parts = path.split(/[\\/]+/).filter(Boolean);
  return parts.at(-1) ?? path;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** One line for a tool call, or null when the call isn't worth showing. */
export function summarizeTool(toolName: string, input: Record<string, unknown> | undefined): ActionSummary | null {
  const name = toolName.trim();
  if (!name || SKIPPED_TOOLS.has(name)) return null;
  const data = input ?? {};

  const mcp = /^mcp__(.+?)__(.+)$/.exec(name);
  if (mcp) return { kind: "mcp", server: clip(mcp[1]!.replace(/_/g, " "), 60), target: clip(mcp[2]!, 80) };

  switch (name) {
    case "Edit":
    case "Write":
    case "MultiEdit":
    case "NotebookEdit": {
      const file = str(data.file_path) ?? str(data.notebook_path);
      return { kind: "edit", target: file ? clip(baseName(file), 120) : "?" };
    }
    case "Bash":
    case "PowerShell": {
      const description = str(data.description);
      const command = str(data.command);
      const line = description ?? (command ? command.split("\n")[0]! : "?");
      return { kind: "command", target: clip(redactSecrets(line), 140) };
    }
    case "WebSearch":
      return { kind: "search", target: clip(str(data.query) ?? "?", 140) };
    case "WebFetch": {
      const url = str(data.url);
      let host = "?";
      if (url) {
        try {
          host = new URL(url).hostname;
        } catch {
          host = clip(url, 80);
        }
      }
      return { kind: "fetch", target: host };
    }
    case "Agent":
    case "Task":
      return { kind: "subagent", target: clip(str(data.description) ?? str(data.subagent_type) ?? "?", 140) };
    default:
      return { kind: "tool", target: clip(name, 80) };
  }
}

/** Name of a new agent seen through hooks: the project folder it runs in. */
export function agentNameFromCwd(cwd: string | undefined): string {
  return cwd ? clip(baseName(cwd), 120) || "Claude Code" : "Claude Code";
}

/** First line of an instruction, used as the agent's mission. */
export function missionFromPrompt(prompt: string): string {
  const first = prompt.replace(/\r\n?/g, "\n").trim().split("\n").find((line) => line.trim()) ?? prompt;
  return clip(redactSecrets(first), 200);
}

/** How the bridge should run a message for an agent. */
export function bridgePlan(agent: { origin: string; session_id: string | null }, aliveSessionIds: ReadonlySet<string>): { resume: string | null; fork: boolean } {
  if (!agent.session_id) return { resume: null, fork: false };
  // A VS Code session still open keeps its own history: continue in a fork.
  const fork = agent.origin === "claude_code" && aliveSessionIds.has(agent.session_id);
  return { resume: agent.session_id, fork };
}

/** The instruction Claude receives when a dashboard message is delivered by the Stop hook. */
export function deliveredInstruction(body: string, author: string | null): string {
  return `${author ? `${author} sent you a message` : "New message"} from the studio dashboard. Treat it as the user's next instruction:\n\n${body}`;
}

/** Image types accepted for screenshots, detected from the file's first bytes. */
export function sniffImage(bytes: Uint8Array): { mime: "image/png" | "image/jpeg" | "image/webp"; ext: "png" | "jpg" | "webp" } | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: "image/png", ext: "png" };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (
    bytes.length >= 12 &&
    String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!) === "RIFF" &&
    String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!) === "WEBP"
  )
    return { mime: "image/webp", ext: "webp" };
  return null;
}
