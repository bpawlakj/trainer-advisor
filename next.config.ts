import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal production bundle at .next/standalone (server.js + node_modules
  // trimmed to runtime deps). The Dockerfile copies that bundle into the final
  // image — keeps the published GHCR image small. See:
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/output
  output: "standalone",
};

export default nextConfig;
