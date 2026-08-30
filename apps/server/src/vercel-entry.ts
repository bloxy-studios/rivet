/**
 * Vercel entry point (Bun runtime, `/api` deployment model).
 *
 * Vercel deploys this file as a single Bun Function; the catch-all rewrite in
 * vercel.json funnels every path to it, and the Hono app routes by the
 * original request URL. Local/self-hosted runs use src/index.ts instead —
 * this file exists only for Vercel and is intentionally thin.
 *
 * Required project env vars: DATABASE_URL, RIVET_AUTH_SECRET, RIVET_BASE_URL
 * (see .env.example at the repository root). A misconfigured deployment
 * still boots and answers every request with a 500 that names the missing
 * variables (names only, never values) instead of crash-looping opaquely.
 */
import { createServerFromEnv } from "./bootstrap";
import { loadEnv } from "./env";
import { consoleLogger } from "./logging";

let fetchHandler: (request: Request) => Response | Promise<Response>;

try {
  const env = loadEnv(process.env);
  const { app } = createServerFromEnv(env, consoleLogger);
  fetchHandler = app.fetch;
} catch (error) {
  const message = error instanceof Error ? error.message : "Invalid server configuration.";
  consoleLogger.error({ msg: "boot failed", error: message });
  fetchHandler = () =>
    Response.json({ error: { message: `Server not configured: ${message}` } }, { status: 500 });
}

Bun.serve({ fetch: fetchHandler });
