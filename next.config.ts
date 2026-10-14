import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.LITTLE_READERS_TEST === "1" ? ".next-test" : ".next",
  cacheComponents: true,
  experimental: {
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
  partialPrefetching: true,
  serverExternalPackages: ["@electric-sql/pglite"],
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
