import type { NextConfig } from "next";

/**
 * The web app talks to the API server through a same-origin proxy: the
 * browser only ever sees this origin, so session cookies are first-party and
 * no CORS is involved. The API's baseURL/origin checks are configured to the
 * web origin (see docs/development/vercel-deployment.md and apps/web/README).
 */
const apiUrl = process.env.RIVET_API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
