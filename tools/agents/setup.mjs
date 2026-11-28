// Connects this PC's Claude Code to the dashboard (docs/AGENTS.md). Run once, from the repo:
//   node tools/agents/setup.mjs [--machine-name "Studio PC"]      (the dashboard's Owners pilot the agents)
//   node tools/agents/setup.mjs --uninstall        (removes hooks + startup entry; keeps the token)
// Options: --url <dashboard URL> (default: production), --skip-hooks, --skip-startup, --skip-mcp, --no-start.
// Reads the Supabase secret key from .env.local (never printed) to register the PC.
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG_FILE, findClaude, HOME_DIR, loadConfig } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const NODE = process.execPath;
const HOOK = join(here, "hook.mjs");
const BRIDGE = join(here, "bridge.mjs");
const SETTINGS = join(homedir(), ".claude", "settings.json");
const STARTUP = join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "dashboard-agents-bridge.vbs");
const DEFAULT_URL = "https://dashboard-roblox-olive.vercel.app";

/** Hook events → handler options. Sync where Claude Code reads the output. */
const HOOK_EVENTS = {
  SessionStart: { timeout: 10 },
  UserPromptSubmit: { async: true },
  PostToolUse: { async: true },
  Notification: { async: true },
  Stop: { timeout: 20 },
  StopFailure: { async: true },
  SessionEnd: { timeout: 5 },
};

const isOurs = (handler) => typeof handler?.command === "string" && [handler.command, ...(handler.args ?? [])].some((part) => String(part).replace(/\\/g, "/").includes("tools/agents/hook.mjs"));

function readSettings() {
  if (!existsSync(SETTINGS)) return {};
  return JSON.parse(readFileSync(SETTINGS, "utf8"));
}

function writeSettings(settings) {
  mkdirSync(dirname(SETTINGS), { recursive: true });
  if (existsSync(SETTINGS)) copyFileSync(SETTINGS, `${SETTINGS}.bak-dashboard-${Date.now()}`);
  writeFileSync(SETTINGS, `${JSON.stringify(settings, null, 2)}\n`);
}

/** Removes our hook handlers (and groups left empty) from the settings. */
function withoutOurHooks(settings) {
  const hooks = { ...(settings.hooks ?? {}) };
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) continue;
    const kept = groups
      .map((group) => ({ ...group, hooks: (group.hooks ?? []).filter((handler) => !isOurs(handler)) }))
      .filter((group) => group.hooks.length > 0);
    if (kept.length) hooks[event] = kept;
    else delete hooks[event];
  }
  return { ...settings, hooks };
}

function installHooks() {
  const settings = withoutOurHooks(readSettings());
  for (const [event, extra] of Object.entries(HOOK_EVENTS)) {
    const handler = { type: "command", command: NODE, args: [HOOK], ...extra };
    settings.hooks[event] = [...(settings.hooks[event] ?? []), { hooks: [handler] }];
  }
  writeSettings(settings);
  console.log(`✓ Claude Code hooks installed in ${SETTINGS} (backup kept next to it)`);
}

function installStartup() {
  mkdirSync(dirname(STARTUP), { recursive: true });
  const quote = (path) => `""${path}""`;
  writeFileSync(STARTUP, `' Starts the dashboard's agent bridge, hidden (docs/AGENTS.md).\r\nCreateObject("WScript.Shell").Run "${quote(NODE)} ${quote(BRIDGE)}", 0, False\r\n`);
  console.log(`✓ Bridge starts with Windows (${STARTUP})`);
}

function startBridge() {
  const child = spawn("wscript.exe", [STARTUP], { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
  console.log("✓ Bridge started in the background (log: ~/.dashboard-agents/bridge.log)");
}

function installRobloxMcp() {
  const claude = findClaude(loadConfig());
  const bat = join(process.env.LOCALAPPDATA ?? "", "Roblox", "mcp.bat");
  if (!existsSync(bat)) {
    console.log("· Roblox Studio MCP launcher not found (install Roblox Studio first) — skipped");
    return;
  }
  const existing = spawnSync(claude, ["mcp", "get", "Roblox_Studio"], { encoding: "utf8", windowsHide: true });
  if (existing.status === 0) {
    console.log("✓ Roblox Studio MCP server already registered in Claude Code");
    return;
  }
  const added = spawnSync(claude, ["mcp", "add", "--scope", "user", "Roblox_Studio", "--", "cmd.exe", "/c", bat], { encoding: "utf8", windowsHide: true });
  console.log(added.status === 0 ? "✓ Roblox Studio MCP server registered in Claude Code (user scope)" : `✗ Roblox Studio MCP: ${(added.stderr || added.stdout).trim()}`);
}

function readEnv() {
  const text = readFileSync(join(repo, ".env.local"), "utf8");
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => /^[A-Z0-9_]+=/.test(line))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1).trim().replace(/^"|"$/g, "")];
      }),
  );
}

async function rest(env, path, init = {}) {
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SECRET_KEY,
      authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${path.split("?")[0]}: HTTP ${response.status} ${body?.message ?? ""}`);
  return body;
}

async function registerMachine(env, url) {
  const existing = loadConfig();
  if (existing?.token) {
    const hash = createHash("sha256").update(existing.token).digest("hex");
    const rows = await rest(env, `agent_machines?token_hash=eq.${hash}&revoked_at=is.null&select=id,name`);
    if (rows.length) {
      writeFileSync(CONFIG_FILE, JSON.stringify({ ...existing, url }, null, 2));
      console.log(`✓ PC already registered as "${rows[0].name}"`);
      return;
    }
  }
  const name = (option("machine-name") ?? hostname()).slice(0, 80);
  const token = randomBytes(32).toString("base64url");
  await rest(env, "agent_machines", { method: "POST", body: JSON.stringify({ name, token_hash: createHash("sha256").update(token).digest("hex") }) });
  mkdirSync(HOME_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify({ url, token, machine: name }, null, 2));
  console.log(`✓ PC registered as "${name}" (token saved in ${CONFIG_FILE})`);
}

if (flag("uninstall")) {
  writeSettings(withoutOurHooks(readSettings()));
  console.log("✓ Dashboard hooks removed from Claude Code settings");
  rmSync(STARTUP, { force: true });
  console.log("✓ Startup entry removed (stop the running bridge from the Task Manager: node.exe)");
  process.exit(0);
}

const url = option("url") ?? loadConfig()?.url ?? DEFAULT_URL;
const env = readEnv();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  console.error("✗ .env.local must define NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");
  process.exit(1);
}
try {
  await registerMachine(env, url);
  if (option("controller-email")) console.log("• --controller-email is no longer needed: every Owner of the dashboard pilots the agents");
  if (!flag("skip-hooks")) installHooks();
  if (!flag("skip-mcp")) installRobloxMcp();
  if (!flag("skip-startup")) {
    installStartup();
    if (!flag("no-start")) startBridge();
  }
  console.log(`\nDone. Agents report to ${url}/agents`);
} catch (error) {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
