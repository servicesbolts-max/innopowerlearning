import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // AGENTS.md is a one-line pointer to CLAUDE.md; CLAUDE.md carries the Next.js docs note.
  agentRules: false,
  poweredByHeader: false,
  // Standalone output is only needed for the Docker image (symlinks need elevation on Windows).
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
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
