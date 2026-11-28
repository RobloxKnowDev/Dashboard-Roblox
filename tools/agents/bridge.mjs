// The bridge (docs/AGENTS.md): runs on the studio's PC, started with Windows.
// Every 10 s it tells the dashboard which Claude Code sessions are open, and
// runs what the dashboard asks: new missions, and messages for conversations
// that aren't working right now (claude -p, auto permission mode, the user's
// Claude Code login — ANTHROPIC_API_KEY is removed so it never bills the API).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { attachmentNote, findClaude, HOME_DIR, loadConfig, log, postJson } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const LOG = "bridge.log";
const LOCK = join(HOME_DIR, "bridge.pid");
const PROMPTS = join(HOME_DIR, "prompts");

const config = loadConfig();
if (!config) {
  log(LOG, "not configured: run tools/agents/setup.mjs");
  process.exit(1);
}

// One bridge per PC.
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
mkdirSync(PROMPTS, { recursive: true });
if (existsSync(LOCK)) {
  const pid = Number(readFileSync(LOCK, "utf8"));
  if (pid && pid !== process.pid && alive(pid)) {
    console.log(`bridge already running (pid ${pid})`);
    process.exit(0);
  }
}
writeFileSync(LOCK, String(process.pid));
const cleanup = () => {
  try {
    if (Number(readFileSync(LOCK, "utf8")) === process.pid) rmSync(LOCK, { force: true });
  } catch {
    // Already gone.
  }
};
process.on("exit", cleanup);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => process.exit(0));

const claude = findClaude(config);
log(LOG, `started (pid ${process.pid}, claude ${claude})`);

/** agentId → { child, stopped, tail } */
const runs = new Map();

/** Open Claude Code sessions on this PC (`claude agents --json`, the supported listing). */
function openSessions() {
  const result = spawnSync(claude, ["agents", "--json"], { encoding: "utf8", windowsHide: true, timeout: 20_000 });
  if (result.status !== 0) return [];
  try {
    const list = JSON.parse(result.stdout);
    return (Array.isArray(list) ? list : [])
      .filter((s) => typeof s.sessionId === "string")
      .slice(0, 100)
      .map((s) => ({ sessionId: s.sessionId, status: typeof s.status === "string" ? s.status.slice(0, 20) : undefined }));
  } catch {
    return [];
  }
}

async function report(agentId, result) {
  try {
    await postJson(config, "/api/agents/ingest", { type: "run_result", agentId, ...result }, 15_000);
  } catch (error) {
    log(LOG, `run_result ${agentId} failed: ${error.message}`);
  }
}

/** New game: create the project from the studio template, then tell the dashboard its folder. */
async function scaffold(item) {
  const result = spawnSync(process.execPath, [join(here, "new-game.mjs"), "--name", item.scaffold.name, "--idea", item.scaffold.idea], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 120_000,
  });
  const last = (result.stdout ?? "").trim().split("\n").at(-1) ?? "";
  let cwd = null;
  try {
    cwd = JSON.parse(last).cwd ?? null;
  } catch {
    // Reported below.
  }
  if (result.status !== 0 || !cwd) {
    const error = `Project creation failed: ${(result.stderr || result.stdout || "").trim().slice(0, 400)}`;
    log(LOG, `scaffold ${item.agentId} failed: ${error}`);
    await report(item.agentId, { exitCode: null, error });
    return null;
  }
  try {
    await postJson(config, "/api/agents/ingest", { type: "set_cwd", agentId: item.agentId, cwd }, 15_000);
  } catch (error) {
    log(LOG, `set_cwd ${item.agentId} failed: ${error.message}`);
  }
  log(LOG, `scaffold ${item.agentId}: ${cwd}`);
  return cwd;
}

async function startRun(item) {
  if (runs.has(item.agentId)) return;
  if (!item.cwd && item.scaffold) {
    runs.set(item.agentId, { child: null, stopped: false, tail: "", result: null });
    const cwd = await scaffold(item);
    runs.delete(item.agentId);
    if (!cwd) return;
    item = { ...item, cwd };
  }
  if (!item.cwd || !existsSync(item.cwd)) {
    log(LOG, `folder not found for ${item.agentId}: ${item.cwd}`);
    void report(item.agentId, { exitCode: null, error: `Folder not found on the PC: ${item.cwd}` });
    return;
  }
  const promptFile = join(PROMPTS, `${item.agentId}.md`);
  writeFileSync(promptFile, item.systemPrompt ?? "");
  const args = ["-p", "--permission-mode", "auto", "--output-format", "stream-json", "--verbose", "--append-system-prompt-file", promptFile];
  if (item.resume) args.push("--resume", item.resume);
  if (item.resume && item.fork) args.push("--fork-session");

  const env = { ...process.env, DASHBOARD_AGENT_ID: item.agentId };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.CLAUDECODE;

  // Attached images are downloaded before the run starts; the prompt says where they are.
  const prompt = item.prompt + (await attachmentNote(item.attachments, item.agentId, LOG));
  const child = spawn(claude, args, { cwd: item.cwd, env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  const run = { child, stopped: false, tail: "", result: null };
  runs.set(item.agentId, run);
  log(LOG, `run ${item.agentId} started (pid ${child.pid}${item.resume ? `, resume ${item.resume}${item.fork ? " fork" : ""}` : ""}) in ${item.cwd}`);

  // The instruction goes through stdin: no command-line quoting or length issues.
  child.stdin.end(prompt);

  let buffer = "";
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("{")) continue;
      try {
        const message = JSON.parse(line);
        if (message.type === "result") run.result = message;
      } catch {
        // Partial or non-JSON line.
      }
    }
  });
  child.stderr.on("data", (chunk) => {
    run.tail = (run.tail + chunk.toString("utf8")).slice(-2000);
  });
  child.on("error", (error) => {
    run.tail = `${run.tail}\n${error.message}`.slice(-2000);
  });
  child.on("close", (code) => {
    runs.delete(item.agentId);
    rmSync(promptFile, { force: true });
    const failed = code !== 0 || run.result?.is_error === true;
    const error = failed ? (typeof run.result?.result === "string" && run.result.result) || run.tail.trim() || `exit code ${code}` : undefined;
    log(LOG, `run ${item.agentId} ended (code ${code}${run.stopped ? ", stopped" : ""}${run.result?.total_cost_usd ? `, est. $${run.result.total_cost_usd.toFixed(2)}` : ""})`);
    void report(item.agentId, { exitCode: failed && code === 0 ? 1 : code, stopped: run.stopped, error });
  });
}

function stopRun(agentId) {
  const run = runs.get(agentId);
  if (!run || run.stopped || !run.child) return;
  run.stopped = true;
  log(LOG, `run ${agentId} stop requested`);
  // Kill the whole tree (Claude Code may have started tools or sub-processes).
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(run.child.pid), "/T", "/F"], { windowsHide: true });
  else run.child.kill("SIGTERM");
}

async function tick() {
  let next = 10_000;
  try {
    const reply = await postJson(config, "/api/agents/ingest", { type: "poll", sessions: openSessions(), running: [...runs.keys()] }, 20_000);
    for (const id of reply.stop ?? []) stopRun(id);
    for (const item of reply.work ?? []) void startRun(item);
    if (typeof reply.pollMs === "number" && reply.pollMs >= 3000) next = reply.pollMs;
  } catch (error) {
    log(LOG, `poll failed: ${error.message}`);
    next = 30_000;
  }
  setTimeout(tick, next);
}

void tick();
