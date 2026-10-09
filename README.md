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

Deploys come from a Git-connected Worker, not from this repo. Each push to `main`
runs the Worker's build settings: build command `pnpm build`, deploy command
`pnpm dlx cf@1.0.0-beta.14 deploy --prebuilt`, and `NODE_VERSION` 26.
