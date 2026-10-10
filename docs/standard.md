# The standard

How every repository builds, checks and deploys. There's one way to do each thing, and this repository is the working example of it. `pnpm drift` checks the others against it and lists where each has drifted.

The repositories are base, markz, prose, sitez and this one. Where this page gives a version, the real value is in this repository's files, and `pnpm drift` reads it from there.

## Toolchain: Vite+

One `vite.config.ts`, run through `vp`, covers dev, build, format, lint and test. A package builds with `vp pack`, which is part of Vite+, so there's no separate bundler. `defineConfig` comes from `vite-plus`.

Vite+ ships its own build of Vite. Each repository points every `vite` at it with an override in `pnpm-workspace.yaml`, and turns off pnpm's peer checks for `vite`, since that build is an npm alias. Bump `vite-plus` and the override together, in every repository at once. A version that differs between repositories is the drift that makes Vite+ painful.

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
- **Node fails loudly.** `onFail: error` stops on the wrong Node. A package's `engines` can allow an older Node than its `devEngines`, as the oldest it supports.
- **Bump deliberately, everywhere at once.** Being on the latest pnpm doesn't matter. Being on the same one does.

`pnpm-workspace.yaml` is a settings file, not a workspace. Every repository has the same three settings: `minimumReleaseAge`, `allowBuilds` (esbuild and workerd, when wrangler or the Cloudflare plugin is installed), and the Vite+ override.

## Scripts

Every repository uses these names, and runs them with `pnpm run …` in anything automated.

| Script   | Does                                                                      |
| -------- | ------------------------------------------------------------------------- |
| `dev`    | the dev server, or `vp pack --watch` for a package                        |
| `build`  | the production build                                                      |
| `check`  | format, lint and types                                                    |
| `fix`    | writes the format and lint fixes                                          |
| `test`   | the tests, when there are any                                             |
| `verify` | `check`, `test` and `build`, then the site if there is one                |
| `ship`   | uploads what `verify` built: `cf deploy --prebuilt`, or `wrangler deploy` |
| `prose`  | reads the repository as a document                                        |

`verify` is what CI runs and what Cloudflare runs before each deploy, so the two can't disagree. `ship` never builds. Some names are pnpm's own commands, and a script by one of those names is skipped by `pnpm <name>`. Don't use `deploy`, `publish`, `audit`, `ci`, `pipeline` or `pack` for a script.

## Cloudflare

A repository with a site deploys it to a Cloudflare Worker with static assets.

- **Config:** `cloudflare.config.ts`, cf's typed config, is the target. A repository that cf can't deploy yet keeps `wrangler.toml` or `wrangler.jsonc`. Either way, the file holds the Worker's name, compatibility date, domain and asset handling.
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

## CI

GitHub Actions runs one job, named `ci`, on pull requests and on `main`. It installs with `pnpm install --frozen-lockfile` and runs `pnpm run verify`, plus whatever a package adds, like publint or a size budget. Branch protection requires `ci`. Cloudflare's own check on each commit isn't required, since it runs after the merge.

## Docs

Explanations live in `@prose` comments, beside the code or setting they explain, and docs that span files live in `docs/`. Both are written in [markz](https://markz.amitkaps.com)'s Markdown, and `pnpm prose` reads them as one document. `package.json` has no comments, so its scripts are explained here. A hand-written `.html` page ships its comments, so it has no prose.
