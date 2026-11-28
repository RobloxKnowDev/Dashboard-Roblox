// Creates a new game from the studio template (docs/AGENTS.md), run by the bridge
// before a new game's manager starts:
//   node new-game.mjs --name "Pet Rescue" --idea "..."
// Creates <gamesDir>\<Name> (Rojo project + local git), <assetsDir>\<Name> (asset
// folders + SOURCES.md) and the place <Name>.rbxl (copy of the Baseplate), opens it
// in Roblox Studio and starts "rojo serve". Prints {"cwd": ...} as its last line.
// Paths come from ~/.dashboard-agents/config.json (gamesDir, assetsDir, templateDir,
// baseplate), with the studio's defaults.
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { extname, join } from "node:path";
import { HOME_DIR, loadConfig, log } from "./lib.mjs";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const config = loadConfig() ?? {};
const GAMES_DIR = option("games-dir") ?? config.gamesDir ?? "E:\\Roblox\\RobloxProjects";
const ASSETS_DIR = option("assets-dir") ?? config.assetsDir ?? "E:\\Roblox\\AssetsProjects";
const TEMPLATE_DIR = config.templateDir ?? "E:\\Roblox\\Templates\\GameTemplate";
const BASEPLATE = config.baseplate ?? "E:\\Roblox\\Map\\Baseplate.rbxl";
const TEXT_FILES = new Set([".md", ".json", ".luau", ".lua", ".toml", ".txt", ".gitignore"]);

const name = (option("name") ?? "").replace(/[\\/:*?"<>|]/g, "").replace(/[. ]+$/, "").trim();
const idea = (option("idea") ?? "").trim();
if (name.length < 2) {
  console.error("new-game: --name is required");
  process.exit(1);
}

/** A folder name that doesn't clash with an unrelated existing folder. */
function projectFolder() {
  for (let i = 1; i < 50; i += 1) {
    const folder = i === 1 ? name : `${name} (${i})`;
    const path = join(GAMES_DIR, folder);
    if (!existsSync(path)) return { folder, path, fresh: true };
    // Already created for this game (the bridge retried): reuse it.
    if (existsSync(join(path, "default.project.json")) && readFileSync(join(path, "default.project.json"), "utf8").includes(`"${name}"`)) {
      return { folder, path, fresh: false };
    }
  }
  throw new Error("no free folder name");
}

function copyTemplate(from, to, values) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const source = join(from, entry);
    const target = join(to, entry);
    if (statSync(source).isDirectory()) {
      copyTemplate(source, target, values);
      continue;
    }
    const ext = entry.startsWith(".") && !extname(entry) ? entry : extname(entry);
    if (TEXT_FILES.has(ext)) {
      let text = readFileSync(source, "utf8");
      for (const [key, value] of Object.entries(values)) text = text.split(`{{${key}}}`).join(value);
      writeFileSync(target, text);
    } else {
      copyFileSync(source, target);
    }
  }
}

function studioExe() {
  const versions = join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Roblox", "Versions");
  try {
    const found = readdirSync(versions)
      .map((dir) => join(versions, dir, "RobloxStudioBeta.exe"))
      .filter((exe) => existsSync(exe))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    return found[0] ?? null;
  } catch {
    return null;
  }
}

function rojoExe() {
  const exe = join(homedir(), ".rokit", "bin", process.platform === "win32" ? "rojo.exe" : "rojo");
  return existsSync(exe) ? exe : "rojo";
}

const { folder, path: projectDir, fresh } = projectFolder();
const assetsDir = join(ASSETS_DIR, folder);
const place = join(projectDir, `${folder}.rbxl`);

if (fresh) {
  if (!existsSync(TEMPLATE_DIR)) {
    console.error(`new-game: template not found: ${TEMPLATE_DIR}`);
    process.exit(1);
  }
  copyTemplate(TEMPLATE_DIR, projectDir, { GAME_NAME: name, GAME_IDEA: idea.replace(/\s+/g, " "), ASSETS_DIR: assetsDir });
  mkdirSync(join(projectDir, "docs", "briefs"), { recursive: true });
  writeFileSync(join(projectDir, "docs", "Plan.md"), `# Plan — ${name}\n\nIdée principale : ${idea}\n\nLe manager tient ce plan à jour (jalons, tâches par rôle, avancement).\n`);
  writeFileSync(join(projectDir, "docs", "briefs", ".gitkeep"), "");
}

for (const sub of ["Icon", "Ui/Logo", "Ui/Frame", "Ui/Icon", "Ui/Inspiration", "Ui/Police", "SFX", "Docs"]) mkdirSync(join(assetsDir, sub), { recursive: true });
if (!existsSync(join(assetsDir, "SOURCES.md"))) {
  writeFileSync(
    join(assetsDir, "SOURCES.md"),
    `# Sources des assets — ${name}\n\nUne ligne par fichier utilisé dans le jeu : fichier · origine (pack du studio, bibliothèque SFX, ui-resources.com + lien, créé par…) · licence.\n\n| Fichier | Origine | Licence |\n|---|---|---|\n`,
  );
}

if (!existsSync(place) && existsSync(BASEPLATE)) copyFileSync(BASEPLATE, place);

// The E: drive records no file ownership: git needs each repository listed as safe (like the studio's other games).
const safePath = projectDir.split("\\").join("/");
if (fresh && !args.includes("--no-open")) spawnSync("git", ["config", "--global", "--add", "safe.directory", safePath], { windowsHide: true });
if (fresh) {
  const git = (...gitArgs) => spawnSync("git", ["-c", `safe.directory=${safePath}`, ...gitArgs], { cwd: projectDir, encoding: "utf8", windowsHide: true });
  git("init", "-q");
  git("add", "-A");
  const commit = git("commit", "-q", "-m", `Nouveau jeu : ${name}`);
  if (commit.status !== 0) log("new-game.log", `git commit failed in ${projectDir}: ${(commit.stderr || commit.stdout).trim()}`);
}

// Open the place in Studio and start syncing code with Rojo (both detached; --no-open for tests).
const open = !args.includes("--no-open");
const studio = open ? studioExe() : null;
if (studio && existsSync(place)) spawn(studio, [place], { detached: true, stdio: "ignore" }).unref();
mkdirSync(HOME_DIR, { recursive: true });
const rojoLog = openSync(join(HOME_DIR, `rojo-${folder.replace(/[^A-Za-z0-9_-]/g, "_")}.log`), "a");
if (open) spawn(rojoExe(), ["serve"], { cwd: projectDir, detached: true, stdio: ["ignore", rojoLog, rojoLog], windowsHide: true }).unref();

log("new-game.log", `${fresh ? "created" : "reused"} ${projectDir} (assets ${assetsDir})`);
console.log(JSON.stringify({ cwd: projectDir, assetsDir, place, fresh }));
