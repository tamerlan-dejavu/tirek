import type { NextConfig } from "next";

const apiInternal = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // In dev the browser talks to Next only; /api is proxied so cookies stay same-origin.
  // In production nginx routes /api to the backend directly.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiInternal}/api/:path*/` }];
  },
  skipTrailingSlashRedirect: true,
};

export default config;
