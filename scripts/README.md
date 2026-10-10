# Scripts

Tools for keeping the repositories in step. Each runs with Node, which reads TypeScript as it is, so there's no build.

`pnpm drift` checks every repository against [the standard](../docs/standard.md), from the copies next to this one on disk. `pnpm drift --cloudflare` also checks each Worker's build settings, and needs `cf` logged in and `CLOUDFLARE_ACCOUNT_ID` set.
