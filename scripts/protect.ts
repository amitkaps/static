/** @prose
 * # Protect
 *
 * Applies the branch rules and merge settings to repositories on GitHub, so every `main` takes
 * changes the same way. `pnpm protect` does all of them, and `pnpm protect markz` does one. It
 * needs `gh` logged in as the owner.
 *
 * The rules are a ruleset named `main`, from [.github/ruleset.json](../.github/ruleset.json). It's
 * created, or replaced when it exists, so running it twice changes nothing. Classic branch
 * protection is removed, so there's one set of rules to read. The merge settings come from
 * [.github/settings.json](../.github/settings.json): squash only, branches deleted after merging,
 * and auto-merge on.
 */
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { OWNER, REPOS } from "./survey.ts";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ruleset = join(here, ".github", "ruleset.json");
const settings = join(here, ".github", "settings.json");

const gh = (...args: string[]): string => execFileSync("gh", args, { encoding: "utf8" });

const named = process.argv.slice(2);
for (const repo of named.length ? named : REPOS) {
  const api = `repos/${OWNER}/${repo}`;
  gh("api", "--method", "PATCH", api, "--input", settings);

  const sets = JSON.parse(gh("api", `${api}/rulesets`)) as { id: number; name: string }[];
  const main = sets.find((set) => set.name === "main");
  if (main) gh("api", "--method", "PUT", `${api}/rulesets/${main.id}`, "--input", ruleset);
  else gh("api", "--method", "POST", `${api}/rulesets`, "--input", ruleset);

  // Without classic protection, GitHub answers 404, which is the state we want.
  try {
    execFileSync("gh", ["api", "--method", "DELETE", `${api}/branches/main/protection`], {
      stdio: "ignore",
    });
  } catch {}

  console.log(`✓ ${repo}`);
}
