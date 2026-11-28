// Team command for a game manager agent (docs/AGENTS.md). Identifies the manager
// with DASHBOARD_AGENT_ID (set by the bridge for its runs).
//   node team.mjs delegate --role ui --title "Shop screen" --file docs/briefs/shop.md
//   node team.mjs message --to <member agent id> --file docs/briefs/fix.md   (or --text "...")
//   node team.mjs status
import { readFileSync } from "node:fs";
import { loadConfig, postJson } from "./lib.mjs";

const [command, ...rest] = process.argv.slice(2);
const option = (name) => {
  const index = rest.indexOf(`--${name}`);
  return index >= 0 ? rest[index + 1] : undefined;
};
const fail = (message) => {
  console.error(`team: ${message}`);
  process.exit(1);
};

const config = loadConfig();
if (!config) fail("this PC isn't connected to the dashboard.");
const agentId = process.env.DASHBOARD_AGENT_ID;
if (!agentId) fail("DASHBOARD_AGENT_ID is not set: team commands only work inside a mission run by the bridge.");

function text() {
  const file = option("file");
  if (file) return readFileSync(file, "utf8");
  const inline = option("text");
  if (inline) return inline;
  return fail("give --file <path> or --text \"...\".");
}

async function send(body) {
  try {
    const reply = await postJson(config, "/api/agents/ingest", { ...body, agentId }, 20_000);
    if (reply.ok === false) fail(reply.error ?? "refused");
    return reply.data;
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

switch (command) {
  case "delegate": {
    const role = option("role");
    const title = option("title");
    if (!role || !title) fail("delegate needs --role and --title.");
    const data = await send({ type: "delegate", role, title, instruction: text() });
    console.log(`Delegated to ${data.name} (agent id ${data.agentId}). Its report will come back to you as a message — end your turn when you have nothing else to do.`);
    break;
  }
  case "message": {
    const to = option("to");
    if (!to) fail("message needs --to <member agent id>.");
    await send({ type: "message", toAgentId: to, body: text() });
    console.log("Message queued for the member (delivered at the end of its current step, or it starts again).");
    break;
  }
  case "status": {
    const members = await send({ type: "team" });
    if (!members.length) console.log("No member yet.");
    for (const m of members) {
      console.log(`- ${m.name} [${m.role}] ${m.status}${m.waitingReason ? ` (${m.waitingReason})` : ""} — id ${m.agentId}`);
      if (m.mission) console.log(`  task: ${m.mission}`);
      if (m.lastReport) console.log(`  last report: ${m.lastReport.replace(/\s+/g, " ").slice(0, 400)}`);
    }
    break;
  }
  default:
    fail("usage: team.mjs delegate|message|status (see the dashboard section of your session context).");
}
