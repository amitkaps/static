# static

A minimal static site: one `index.html`, built with Vite, for Cloudflare.
Live at `static.amitkaps.com`.

```sh
# needs Node 26 + pnpm 12.9+ — package.json (devEngines) pins both
pnpm install
pnpm dev          # local dev server
pnpm build        # writes .cloudflare/output/
pnpm preview      # serve the build locally
pnpm run deploy   # build, then upload with a pinned `cf` (dry-run: add --dry-run)
```

All Cloudflare settings live in `vite.config.ts`, in the plugin's `config`:
the Worker name, the compatibility date and the custom domain (`domains`).
`@cloudflare/vite-plugin` (2.0 beta) writes them into the build output, so no
wrangler config file is needed. `cf` is not a dependency: `deploy` fetches the
pinned `cf@1.0.0-beta.14` with `pnpm dlx`. Wrangler is not used at all.

For a Git-connected deploy, set the build command to `pnpm build` and the deploy
command to `pnpm dlx cf@1.0.0-beta.14 deploy --prebuilt`. Not yet tested on a Git build.
