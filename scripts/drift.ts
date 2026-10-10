/** @prose
 * # Drift
 *
 * Checks every repository against the standard and lists where each one has drifted. The
 * standard is this repository's own settings, read from its `package.json`, so there's no
 * second copy of it to keep in step. [docs/standard.md](../docs/standard.md) says what each
 * check means.
 *
 * The repositories are read from disk, as siblings of this one. `--cloudflare` also reads each
 * Worker's build settings from Cloudflare, which needs `cf` logged in and
 * `CLOUDFLARE_ACCOUNT_ID` set. It exits 1 when anything has drifted.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPOS = ["base", "markz", "prose", "sitez", "static"];

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const parent = dirname(here);
const cloudflare = process.argv.includes("--cloudflare");

type Pkg = {
  packageManager?: string;
  devEngines?: { packageManager?: { version?: string; onFail?: string } };
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  engines?: { node?: string };
};

const readPkg = (dir: string): Pkg => JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
const read = (file: string): string => (existsSync(file) ? readFileSync(file, "utf8") : "");

const standard = readPkg(here);
const pnpm = standard.packageManager?.replace(/^pnpm@/, "");
const vitePlus = standard.devDependencies?.["vite-plus"];
const nodeMajor = /\d+/.exec(standard.engines?.node ?? "")?.[0];

/** @prose
 * # A repository's Worker
 *
 * A repository deploys if it has a Cloudflare config, and the Worker's name is read from it.
 * `cloudflare.config.ts` is the target; `wrangler.jsonc` and `wrangler.toml` are the ones
 * still on wrangler. A regular expression is enough, since each file states `name` once.
 */
function worker(dir: string): { file: string; name: string } | undefined {
  for (const file of ["cloudflare.config.ts", "wrangler.jsonc", "wrangler.toml"]) {
    const text = read(join(dir, file));
    const name = /^\s*"?name"?\s*[:=]\s*"([^"]+)"/m.exec(text)?.[1];
    if (name) return { file, name };
  }
  return undefined;
}

function check(repo: string): string[] {
  const dir = join(parent, repo);
  if (!existsSync(join(dir, "package.json"))) return [`not found at ${dir}`];
  const pkg = readPkg(dir);
  const drift: string[] = [];

  if (pkg.packageManager !== `pnpm@${pnpm}`) {
    drift.push(`packageManager is ${pkg.packageManager}, not pnpm@${pnpm}`);
  }
  const engine = pkg.devEngines?.packageManager;
  if (engine?.version !== pnpm) drift.push(`devEngines pins pnpm ${engine?.version}, not ${pnpm}`);
  if (engine?.onFail !== "download") {
    drift.push(`devEngines pnpm onFail is ${engine?.onFail}, not download`);
  }

  const own = pkg.devDependencies?.["vite-plus"];
  if (!own) drift.push("not on Vite+");
  else if (own !== vitePlus) drift.push(`vite-plus is ${own}, not ${vitePlus}`);
  const override = /vite-plus-core@([\w.-]+)/.exec(read(join(dir, "pnpm-workspace.yaml")))?.[1];
  if (override && override !== vitePlus) {
    drift.push(`pnpm-workspace.yaml points vite at ${override}, not ${vitePlus}`);
  }

  const site = worker(dir);
  if (site) {
    for (const script of ["verify", "ship"]) {
      if (!pkg.scripts?.[script]) drift.push(`no ${script} script`);
    }
    if (pkg.scripts?.deploy) drift.push("has a deploy script, which pnpm deploy never runs");
    if (site.file !== "cloudflare.config.ts") drift.push(`still on wrangler (${site.file})`);
    if (cloudflare) drift.push(...builds(site.name));
  }
  return drift;
}

/** @prose
 * # The dashboard's settings
 *
 * The build and deploy commands live on the Worker, not in the repository, so they're read
 * back from Cloudflare and compared with what every Worker should have.
 */
const BUILD = {
  build_command: "pnpm run verify",
  deploy_command: "pnpm run ship",
  root_directory: "/",
  build_caching_enabled: true,
};

let workers: { id: string; name: string }[] | undefined;

function cf(...args: string[]): unknown {
  const bin = join(here, "node_modules", ".bin", "cf");
  const out = execFileSync(bin, args, { encoding: "utf8", env: { ...process.env, CF_QUIET: "1" } });
  return JSON.parse(out);
}

function builds(name: string): string[] {
  workers ??= cf("workers", "list") as { id: string; name: string }[];
  const tag = workers.find((w) => w.name === name)?.id;
  if (!tag) return [`no Worker named ${name} on Cloudflare`];
  const config = cf("builds", "workers", "get", tag) as {
    production_settings: Record<string, unknown> & {
      environment_variables: Record<string, { value?: string }>;
    };
  };
  const settings = config.production_settings;
  const drift: string[] = [];
  for (const [key, want] of Object.entries(BUILD)) {
    if (settings[key] !== want) drift.push(`Worker ${key} is ${settings[key]}, not ${want}`);
  }
  const node = settings.environment_variables.NODE_VERSION?.value;
  if (node !== nodeMajor) drift.push(`Worker NODE_VERSION is ${node}, not ${nodeMajor}`);
  return drift;
}

let drifted = false;
for (const repo of REPOS) {
  const drift = check(repo);
  drifted ||= drift.length > 0;
  console.log(drift.length ? `✗ ${repo}` : `✓ ${repo}`);
  for (const line of drift) console.log(`    ${line}`);
}
process.exitCode = drifted ? 1 : 0;
