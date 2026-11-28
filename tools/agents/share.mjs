// Shows an image on an agent's dashboard page (docs/AGENTS.md).
//   node share.mjs --session <id> [--agent <id>] --file <png|jpg|webp> [--caption "..."]
//   node share.mjs --session <id> [--agent <id>] --window studio|blender|<title> [--caption "..."]
// The session id is given to Claude in its session context (SessionStart hook).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HOME_DIR, loadConfig } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const fail = (message) => {
  console.error(`share: ${message}`);
  process.exit(1);
};

const config = loadConfig();
if (!config) fail("this PC isn't connected to the dashboard (run tools/agents/setup.mjs).");
const sessionId = option("session");
if (!sessionId) fail("--session <id> is required (see the dashboard section of your session context).");
const agentId = option("agent") ?? process.env.DASHBOARD_AGENT_ID;
const caption = option("caption") ?? "";

const WINDOWS = { studio: { process: "RobloxStudioBeta" }, blender: { process: "blender" } };
let file = option("file");
let temporary = null;

if (!file) {
  const target = option("window");
  if (!target) fail("give --file <image> or --window studio|blender|<window title>.");
  mkdirSync(join(HOME_DIR, "captures"), { recursive: true });
  temporary = join(HOME_DIR, "captures", `capture-${Date.now()}.png`);
  const known = WINDOWS[target.toLowerCase()];
  const ps = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      join(here, "capture-window.ps1"),
      ...(known ? ["-Process", known.process] : ["-Title", target]),
      "-Out",
      temporary,
    ],
    { encoding: "utf8", windowsHide: true, timeout: 30_000 },
  );
  if (ps.status !== 0 || !existsSync(temporary)) fail(`capture failed: ${(ps.stderr || ps.stdout || "").trim().split("\n")[0]}`);
  file = temporary;
}

if (!existsSync(file)) fail(`file not found: ${file}`);
const types = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
const type = types[extname(file).toLowerCase()];
if (!type) fail("PNG, JPEG or WebP only.");

const form = new FormData();
form.set("sessionId", sessionId);
if (agentId) form.set("agentId", agentId);
form.set("caption", caption);
form.set("file", new Blob([readFileSync(file)], { type }), `image${extname(file).toLowerCase()}`);

try {
  const response = await fetch(new URL("/api/agents/media", config.url), {
    method: "POST",
    headers: { authorization: `Bearer ${config.token}` },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  const reply = await response.json().catch(() => ({}));
  if (!response.ok) fail(reply.error ?? `HTTP ${response.status}`);
  console.log("Shared on the dashboard (agent page, conversation).");
} finally {
  if (temporary) rmSync(temporary, { force: true });
}
