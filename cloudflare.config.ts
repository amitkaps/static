import { defineConfig } from "cf/config";

// No entrypoint: the Worker only serves the built assets.
export default defineConfig({
  worker: {
    name: "static",
    compatibilityDate: "2026-10-09",
    domains: ["static.amitkaps.com"],
    assets: {
      // Serve 404.html for any missing address.
      notFoundHandling: "404-page",
    },
  },
});
