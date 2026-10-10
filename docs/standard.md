# The standard

How every repository builds, checks and deploys. There's one way to do each thing, and this repository is the working example of it. `pnpm drift` checks the others against it and lists where each has drifted, and the home page at ship.amitkaps.com shows the same as tables.

The repositories are base, markz, prose, sitez and this one. Where this page gives a version, the real value is in this repository's files, and `pnpm drift` reads it from there.

## Toolchain: Vite+

One `vite.config.ts`, run through `vp`, covers dev, build, format, lint and test. A package builds with `vp pack`, which is part of Vite+, so there's no separate bundler. `defineConfig` comes from `vite-plus`.

Vite+ ships its own build of Vite. Each repository points every `vite` at it with an override in `pnpm-workspace.yaml`, and turns off pnpm's peer checks for `vite`, since that build is an npm alias. Bump `vite-plus` and the override together, in every repository at once. A version that differs between repositories is the drift that makes Vite+ painful.

Formatting runs at oxfmt's defaults, written as an empty `fmt: {}` so the config says so. Lint is type-aware and type-checks too, so `check` covers types without a separate `tsc`:

```ts
lint: {
  plugins: ["typescript", "unicorn", "import"],
  categories: { correctness: "error" },
  options: { typeAware: true, typeCheck: true },
},
```

The types come from `tsconfig.json`, and every one turns on the same strict options: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules` and `forceConsistentCasingInFileNames`. This repository's [tsconfig.json](../tsconfig.json) is the example. The rest of a tsconfig, like `include` and `types`, is the repository's own.

base, the SvelteKit starter, left Vite+ for the standalone tools. It goes back, and `pnpm drift` lists it until then.

## pnpm and Node

`package.json` is the one place for both versions.

```json
"devEngines": {
  "packageManager": { "name": "pnpm", "version": "12.9.1", "onFail": "download" },
  "runtime": { "name": "node", "version": ">=26", "onFail": "error" }
},
"engines": { "node": ">=26" },
"packageManager": "pnpm@12.9.1"
```

- **pnpm is pinned exactly, with `onFail: download`.** Whatever pnpm is installed globally, pnpm fetches and runs the pinned one, so a new pnpm release never breaks a checkout. CI reads `packageManager`, so keep the two equal.
- **Node fails loudly.** `onFail: error` stops on the wrong Node.
- **One Node, for building and for using.** `engines` says the same `>=26` as `devEngines`. A package supports the Node it's built and tested on, and nothing older, so CI runs on one Node. Node 26 is the LTS release from October 2026. When the next LTS arrives, every repository moves to it at once, and for a package that's a breaking release.
- **Bump deliberately, everywhere at once.** Being on the latest pnpm doesn't matter. Being on the same one does.

## Other versions

The tools every repository shares are on one version. Where this repository uses a tool, its version is the standard. Where it doesn't, the standard is npm's latest release.

| Tool                                 | Version                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `@types/node`                        | the major of the Node that `engines` allows, so code can't use newer APIs     |
| `vite-plus`                          | this repository's, with the override at the same version and no direct `vite` |
| `cf`, `@cloudflare/vite-plugin`      | this repository's, in any repository that deploys with cf                     |
| `typescript`                         | npm's latest, where a repository has it                                       |
| `@amitkaps/prose`, `@amitkaps/markz` | npm's latest, so a new release of ours shows up everywhere it's used          |
| `wrangler`                           | npm's latest, while a repository is still on it                               |
| `publint`                            | npm's latest, in every package                                                |

A repository's own libraries, like svelte or micromark, are its own to choose.

## Held

When a tool a repository depends on can't support the standard yet, the check is held: it shows amber on the home page with its reason, and doesn't fail `pnpm drift`. Each hold says when to look again, like svelte-check accepting TypeScript 7. Holds are listed in [scripts/survey.ts](../scripts/survey.ts).

A hold is for what a tool can't do, never for a preference. The point of one standard is that a choice like Vite+ is made once and paid for once, not argued again in each repository. A hold whose check stops drifting fails `pnpm drift` until it's removed, so none outlives its reason.

`pnpm-workspace.yaml` is a settings file, not a workspace. Every repository has the same three settings: `minimumReleaseAge`, `allowBuilds` (esbuild and workerd, when wrangler or the Cloudflare plugin is installed), and the Vite+ override.

## Scripts

Every repository uses these names, and runs them with `pnpm run …` in anything automated.

| Script   | Does                                                                      |
| -------- | ------------------------------------------------------------------------- |
| `dev`    | the dev server, or `vp pack --watch` for a package                        |
| `build`  | the production build                                                      |
| `check`  | format, lint and types: `vp check`, and a framework's own checker         |
| `fix`    | writes the format and lint fixes: `vp check --fix`                        |
| `test`   | the tests, when there are any                                             |
| `verify` | `check`, `test` and `build`, then the site if there is one                |
| `ship`   | uploads what `verify` built: `cf deploy --prebuilt`, or `wrangler deploy` |
| `prose`  | reads the repository as a document: `prose`, so `pnpm prose build` works  |

`dev`, `build`, `check`, `fix`, `verify` and `prose` are in every repository. `test` is there when there are tests, and `ship` when there's a site. Any other script is the repository's own, like a package's `size` or `fuzz`. On Vite+, `fix` is exactly `vp check --fix`, and `check` runs `vp check`. A framework can add its own steps around it, like SvelteKit's `svelte-kit sync` before and `svelte-check` after, but no second formatter or linter, and no separate `lint` or `fmt` scripts. The home page lists every script side by side, so two repositories using one name for different jobs shows up.

`verify` is what CI runs and what Cloudflare runs before each deploy, so the two can't disagree. `ship` never builds. Some names are pnpm's own commands, and a script by one of those names is skipped by `pnpm <name>`. Don't use `deploy`, `publish`, `audit`, `ci`, `pipeline` or `pack` for a script.

## Cloudflare

A repository with a site deploys it to a Cloudflare Worker with static assets.

- **Config:** `cloudflare.config.ts`, cf's typed config, is the target. A repository that cf can't deploy yet keeps `wrangler.toml`, never `wrangler.jsonc`, since prose reads comments in TOML but not in JSONC. Either way, the file holds the Worker's name, compatibility date, domain and asset handling.
- **Deploys:** the Worker's Git integration (Workers Builds) builds and deploys `main`. There's no deploy step in GitHub Actions, and no API token or secret.
- **The Worker's settings** are the same on every Worker. Cloudflare's config has no field for them, so they're set in the dashboard, or with `cf builds triggers update`, and `pnpm drift --cloudflare` checks them.

```text
Build command      pnpm run verify
Deploy command     pnpm run ship
Root directory     /
NODE_VERSION       26
Build cache        on
Previews           off
```

`verify` fails on a failing check, so a merge that breaks one doesn't deploy. Previews stay off because CI already checks every pull request. If a repository turns them on, it sets the preview deploy command too: `pnpm exec wrangler versions upload`, or `pnpm exec cf workers versions create --prebuilt`.

## GitHub

Every `main` takes changes the same way. Work happens on a branch, in a pull request, and `ci` has to pass on a branch that's up to date with `main`. The pull request is squash-merged, so `main` reads as one commit per change, and nobody pushes to it, admins included.

- **Branch rules:** one ruleset, named `main`, from [.github/ruleset.json](../.github/ruleset.json). It requires a pull request with no approvals, since there's one maintainer, and the `ci` check. It keeps history linear, and blocks force pushes and deleting the branch. Nobody bypasses it.
- **Merge settings:** from [.github/settings.json](../.github/settings.json). Squash is the only merge, a branch is deleted once it's merged, and auto-merge is on.

`pnpm protect` applies both, to every repository or to the ones named, and removes any classic branch protection. The home page checks the rules, which GitHub shows to anyone. `pnpm drift --github` checks the merge settings too, which only the owner can read.

## Agents

Every `AGENTS.md` opens with the same two sections as [this repository's](../AGENTS.md), word for word. "Standard" points at this page, and says how changes reach `main`. "Prose" points at the rules in [prose's usage](https://prose.amitkaps.com/docs/usage.md#for-agents). The rules live there, once, and aren't copied into each repository, since the copies had already started to differ. The rest of an `AGENTS.md` is the repository's own. A `CLAUDE.md` holds only `@AGENTS.md`, so Claude Code reads the same file.

## Releases

markz, prose and sitez are packages, published to npm. A package is any repository whose `package.json` isn't private, and every one releases the same way.

- **The release files** are [package/](../package/README.md)'s, copied into the package unchanged: the release workflow and `.github/release.yml`, which groups the notes. They name no package, so the copies stay identical and the survey checks them word for word.
- **Packing:** `files` is `["dist"]`, `prepack` is `vp pack`, and `publishConfig.access` is `public`. publint runs inside `vp pack`, with `pack: { publint: { strict: true } }` and `publint` as a dev dependency, so `build` fails on a package npm would serve badly, and there's no separate publint step.
- **Our own packages are bundled, not depended on.** prose and sitez have markz as a dev dependency, and `vp pack` puts it inside `dist/`. So a package's users never install a second markz, and each package releases on its own, in any order. Picking up a new markz takes a release of the package that bundles it.

To release, open a pull request that bumps `version`, titled `vX.Y.Z` and labelled `internal`. Its description, down to the first `---` line, is the release's summary, like what to change in a breaking release. Once it's merged, tag that commit and push the tag.

```sh
git switch main && git pull && git tag v0.5.0 && git push origin v0.5.0
```

The workflow runs `pnpm run verify`, packs the tarball and stages it on npm with trusted publishing. It then publishes a GitHub Release, with the summary above notes generated from the merged pull requests. You approve the staged version with 2FA, in the **Staged Packages** tab on npmjs.com or with `npm stage approve <id>`. A version with a pre-release part, like `-rc.0`, goes to npm's `next` tag and is marked a pre-release.

### Release notes

There's no changelog file. Each pull request carries one label, which files it under a heading in the notes. `pnpm protect` creates the labels, from [.github/labels.json](../.github/labels.json).

| Label      | Heading            | For                                            |
| ---------- | ------------------ | ---------------------------------------------- |
| `breaking` | Breaking           | a change that needs users to update their code |
| `added`    | Added              | a new feature or warning                       |
| `fixed`    | Fixed              | a bug fix users would notice                   |
| `improved` | Faster and smaller | the same behaviour, faster or smaller          |
| `docs`     | Documentation      | documentation readers use                      |
| `internal` | left out           | tests, tooling, site and lessons               |

A pull request's title is its line in the notes, so a user-facing one is written for the package's users. One with no label falls under Other, so a missed label shows.

### Setting up a new package

Copy in `package/`'s files, and run `pnpm protect <repo>` for the labels. On npmjs.com, add a trusted publisher for the repository and the workflow `release.yml`, with direct publishing and dist-tags left unchecked, so staging is all it can do. npm may not take that before the package exists. Then publish the first version by hand, from a folder outside the repository, since `npm` refuses to run where `devEngines` names pnpm.

```sh
pnpm pack && cd /tmp && npm login && npm publish ~/code/<repo>/amitkaps-<repo>-<version>.tgz --access public
```

## CI

GitHub Actions runs one job, named `ci`, on pull requests and on `main`. It installs with `pnpm install --frozen-lockfile` and runs `pnpm run verify`, plus whatever a package adds, like publint or a size budget. Branch protection requires `ci`. Cloudflare's own check on each commit isn't required, since it runs after the merge.

## Docs

Explanations live in `@prose` comments, beside the code or setting they explain, and docs that span files live in `docs/`. Both are written in [markz](https://markz.amitkaps.com)'s Markdown, and `pnpm prose` reads them as one document. `package.json` has no comments, so its scripts are explained here. A hand-written `.html` page ships its comments, so it has no prose.
