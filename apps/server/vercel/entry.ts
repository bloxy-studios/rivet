/// <reference path="../src/runtime.d.ts" />
/**
 * Vercel entry point — source of the Build Output API function.
 *
 * vercel/build.sh (invoked by vercel.json's buildCommand) bundles this file
 * (self-contained, `bun build --target=bun`) into
 * `.vercel/output/functions/index.func/` and copies the committed
 * `vc-config.json` / `output-config.json` beside it, so the deployment is
 * fully declared by the Build Output API: one Bun Function,
 * a catch-all route to it, and nothing left to framework detection. Calling
 * `Bun.serve()` once at module startup is the documented handler contract
 * for Bun Functions; `port` is ignored on Vercel.
 *
 * `"framework": null` in vercel.json is what keeps this the ONLY function:
 * with `hono` in dependencies and a well-known filename importing it
 * (src/app.ts), Vercel otherwise auto-selects the Hono preset, whose builder
 * deploys its own trace of the source tree — where workspace imports like
 * `@rivet/auth` cannot resolve at runtime — and routes every path to it.
 *
 * Local/self-hosted runs use src/main.ts instead; this file exists only for
 * Vercel. Required project env vars: DATABASE_URL, RIVET_AUTH_SECRET,
 * RIVET_BASE_URL (see .env.example at the repository root). A misconfigured
 * deployment still boots and answers every request with a 500 that names the
 * missing variables (names only, never values) instead of crash-looping.
 */
import { createServerFromEnv } from "../src/bootstrap";
import { loadEnv } from "../src/env";
import { consoleLogger } from "../src/logging";

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
