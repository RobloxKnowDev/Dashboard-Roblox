// Shared helpers for the PC side of the dashboard's AI agents (docs/AGENTS.md).
// The machine token lives in ~/.dashboard-agents/config.json — never in the repo.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const HOME_DIR = join(homedir(), ".dashboard-agents");
export const CONFIG_FILE = join(HOME_DIR, "config.json");

/** { url, token, machine } or null when the PC isn't set up. */
export function loadConfig() {
  try {
    const config = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
    return config && typeof config.url === "string" && typeof config.token === "string" ? config : null;
  } catch {
    return null;
  }
}

/** Appends a line to a log in ~/.dashboard-agents (rotated at 1 MB). */
export function log(file, line) {
  try {
    mkdirSync(HOME_DIR, { recursive: true });
    const path = join(HOME_DIR, file);
    if (existsSync(path) && statSync(path).size > 1024 * 1024) renameSync(path, `${path}.old`);
    appendFileSync(path, `${new Date().toISOString()} ${line}\n`);
  } catch {
    // Logging must never break a hook.
  }
}

/** POSTs JSON to the dashboard with the machine token; resolves the parsed reply. */
export async function postJson(config, path, body, timeoutMs) {
  const response = await fetch(new URL(path, config.url), {
    method: "POST",
    headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}

/** Claude Code's CLI: config override, else the newest VS Code extension's binary. */
export function findClaude(config) {
  if (config?.claudeBin && existsSync(config.claudeBin)) return config.claudeBin;
  const extensions = join(homedir(), ".vscode", "extensions");
  try {
    const dirs = readdirSync(extensions)
      .filter((name) => name.startsWith("anthropic.claude-code-"))
      .map((name) => ({ name, version: (name.match(/claude-code-(\d+)\.(\d+)\.(\d+)/) ?? []).slice(1).map(Number) }))
      .sort((a, b) => {
        for (let i = 0; i < 3; i += 1) if ((b.version[i] ?? 0) !== (a.version[i] ?? 0)) return (b.version[i] ?? 0) - (a.version[i] ?? 0);
        return 0;
      });
    for (const dir of dirs) {
      const exe = join(extensions, dir.name, "resources", "native-binary", process.platform === "win32" ? "claude.exe" : "claude");
      if (existsSync(exe)) return exe;
    }
  } catch {
    // No VS Code extensions folder.
  }
  return "claude";
}

/** Reads all of stdin as text. */
export async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
