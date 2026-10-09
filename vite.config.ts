import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  build: {
    // Vite builds only index.html unless other pages are listed as inputs.
    rollupOptions: {
      input: ["index.html", "404.html"],
    },
  },
  plugins: [
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
