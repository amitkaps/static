/** @prose
 * # Drift
 *
 * Prints where each repository has drifted from the standard, from what
 * [survey.ts](survey.ts) finds, and exits 1 when anything has. It reads the other repositories
 * from GitHub's `main`, as the site does, or from the folders beside this one with `--local`.
 *
 * `--cloudflare` also reads each Worker's build settings from Cloudflare, which needs `cf`
 * logged in and `CLOUDFLARE_ACCOUNT_ID` set. That check stays here and off the site, since
 * the build has no Cloudflare login.
 */
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { nodeMajor, survey } from "./survey.ts";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cloudflare = process.argv.includes("--cloudflare");
const local = process.argv.includes("--local");

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
    if (settings[key] !== want) {
      drift.push(`Worker ${key} is ${String(settings[key])}, not ${want}`);
    }
  }
  const node = settings.environment_variables.NODE_VERSION?.value;
  if (node !== nodeMajor) drift.push(`Worker NODE_VERSION is ${node}, not ${nodeMajor}`);
  return drift;
}

let drifted = false;
for (const result of await survey({ local })) {
  const drift = result.error ? [result.error] : result.findings.flatMap((f) => f?.drift ?? []);
  if (cloudflare && result.worker) drift.push(...builds(result.worker.name));
  drifted ||= drift.length > 0;
  console.log(drift.length ? `✗ ${result.repo}` : `✓ ${result.repo}`);
  for (const line of drift) console.log(`    ${line}`);
}
process.exitCode = drifted ? 1 : 0;
