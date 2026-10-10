# static

A minimal static site: one `index.html` and a `404.html`, built with Vite, for Cloudflare.
Live at `static.amitkaps.com`.

```sh
# needs Node 26 — package.json (devEngines) pins it; pnpm fetches its pinned version
pnpm install
pnpm dev          # local dev server
pnpm build        # writes .cloudflare/output/
pnpm preview      # serve the build locally
pnpm verify       # check + build: what every deploy runs
pnpm ship         # upload the last build (normally left to the Git integration)
```

Cloudflare settings live in `cloudflare.config.ts`: the Worker name, compatibility
date, custom domain and asset handling. The Vite plugin reads it and writes them
into the build output, so no wrangler config file is needed. Wrangler is not used.

## Deploy

Deploys come from a Git-connected Worker named `static`. Each push to `main`
builds and deploys it. Set these in the Worker's dashboard:

```text
Build command    pnpm run verify
Deploy command   pnpm run ship
Root directory   /
NODE_VERSION     26
```

The two commands are the same in every project; `package.json` decides what they
run. `verify` fails on a bad check, so a failing check never deploys. Write
`pnpm run ship`, never `pnpm deploy`, which is a built-in pnpm command.

## Beta packages

Two packages are still beta. Check them with `pnpm view <name> dist-tags`:

| Package                   | Pinned                     | Status (2026-10-09)                 | Done when                      |
| ------------------------- | -------------------------- | ----------------------------------- | ------------------------------ |
| `@cloudflare/vite-plugin` | `2.0.0-beta.sha-91c870c02` | `beta` tag only; `latest` is 1.63.1 | `latest` is a 2.x release      |
| `cf`                      | `1.0.0-beta.14`            | `latest` is the beta                | `latest` is a non-beta release |

When a package graduates, update the pins in `package.json` and the
table above. Then run `pnpm run verify` and a deploy from the Git-connected
Worker before you rely on it.
