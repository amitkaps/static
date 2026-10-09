import { defineConfig } from "vite-plus";
import { cloudflare } from "@cloudflare/vite-plugin";

// Workers Builds sets WORKERS_CI_COMMIT_SHA; local builds fall back to "dev".
const commit = (process.env.WORKERS_CI_COMMIT_SHA ?? "dev").slice(0, 7);

export default defineConfig({
  build: {
    // Vite builds only index.html unless other pages are listed as inputs.
    rollupOptions: {
      input: ["index.html", "404.html"],
    },
  },
  plugins: [
    {
      name: "commit",
      transformIndexHtml: (html) => html.replaceAll("__COMMIT__", commit),
    },
    cloudflare({
      assetsOnly: true,
      config: {
        name: "static",
        compatibilityDate: "2026-10-09",
        domains: ["static.amitkaps.com"],
        assets: {
          // Serve 404.html for any missing address.
          notFoundHandling: "404-page",
        },
      },
    }),
  ],
});
