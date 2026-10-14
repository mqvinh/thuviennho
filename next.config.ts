import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import path from "node:path";

if (process.env.NODE_ENV === "development" && process.env.VERCEL !== "1" && !process.env.LITTLE_READERS_BACKEND_URL && !process.env.LITTLE_READERS_BACKEND_TOKEN) {
  void initOpenNextCloudflareForDev({ persist: { path: path.resolve(process.env.LITTLE_READERS_STATE_DIR || ".wrangler/state","v3") } });
}

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_MEDIA_LIMIT_MB: process.env.VERCEL === "1" ? "4" : "5" },
  distDir: process.env.LITTLE_READERS_TEST === "1" ? ".next-test" : ".next",
  // Next 16.4 Cache Components shares request-bound timers across Workers requests.
  // Use the stable dynamic server rendering path until the adapter supports it.
  cacheComponents: false,
  experimental: {
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
  partialPrefetching: false,
  output: "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
