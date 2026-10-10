/** @prose
 * # The build
 *
 * One Vite+ config builds the two pages and hands them to Cloudflare. Vite+ also runs the
 * format and lint checks, so there's no other tool config. The Worker itself is described in
 * [cloudflare.config.ts](cloudflare.config.ts), not here.
 *
 * `defineConfig` comes from `vite-plus`, not `vite`, so the `fmt` and `lint` blocks it allows
 * would type-check here too. They aren't needed yet: both run at their defaults.
 */
import { defineConfig } from "vite-plus";
import { cloudflare } from "@cloudflare/vite-plugin";

/** @prose
 * # The commit in the footer
 *
 * Each page shows the commit it was built from, so a glance at the live site says whether the
 * last push deployed. Workers Builds sets `WORKERS_CI_COMMIT_SHA`, and a local build says `dev`.
 */
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
    /** @prose
     * # Assets only
     *
     * `assetsOnly` makes the plugin write an assets-only Build Output into
     * `.cloudflare/output/`, which `cf deploy --prebuilt` uploads as it is. There's no Worker
     * code: Cloudflare serves the files, and the 404 page for a missing address.
     */
    cloudflare({ assetsOnly: true }),
  ],
});
