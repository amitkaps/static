# static

A minimal static site: one `index.html` and a `404.html`, built with Vite, for Cloudflare.
Live at `static.amitkaps.com`.

```sh
# needs Node 26 + pnpm 12.9+ — package.json (devEngines) pins both
pnpm install
pnpm dev          # local dev server
pnpm build        # writes .cloudflare/output/
pnpm preview      # serve the build locally
```

Cloudflare settings live in `vite.config.ts`, in the plugin's `config`: the Worker
name, compatibility date, custom domain and asset handling. The plugin writes them
into the build output, so no wrangler config file is needed. Wrangler is not used.

## Deploy

Deploys come from a Git-connected Worker named `static`, not from this repo. Each
push to `main` builds and deploys it. Set these in the Worker's dashboard:

```text
Build command    pnpm build
Deploy command   pnpm dlx cf@1.0.0-beta.14 deploy --prebuilt
Root directory   /
NODE_VERSION     26
```

## Beta packages

Two packages are still beta. Check them with `npm view <name> dist-tags`:

| Package | Pinned | Status (2026-10-09) | Done when |
| --- | --- | --- | --- |
| `@cloudflare/vite-plugin` | `2.0.0-beta.sha-91c870c02` | `beta` tag only; `latest` is 1.63.1 | `latest` is a 2.x release |
| `cf` | `1.0.0-beta.14` | `latest` is the beta | `latest` is a non-beta release |

When a package graduates, update the pin in `package.json`, the `cf` version in the
dashboard deploy command, and the table above. Then run `pnpm run check`, `pnpm build`
and a deploy from the Git-connected Worker before you rely on it.
