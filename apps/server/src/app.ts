import { type AuthDatabase, ForbiddenError, type RivetAuth } from "@rivet/auth";
import { sql } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { mapError } from "./errors";
import { consoleLogger, type Logger, requestLogger } from "./logging";
import { buildOpenApiStub } from "./openapi";
import { organizationsRoutes } from "./routes/organizations";
import type { AppDeps, AppEnv } from "./routes/shared";

export interface CreateAppOptions {
  db: AuthDatabase;
  auth: RivetAuth;
  baseUrl: string;
  /** Extra origins allowed to make state-changing requests (CSRF boundary). */
  trustedOrigins?: string[];
  logger?: Logger;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF origin guard for the management API, mirroring the identity engine's
 * policy (ADR-0007) for our own cookie-authenticated mutations: a browser
 * always sends `Origin` on cross-origin state-changing requests, so an
 * untrusted Origin is rejected. Requests without an Origin header are
 * non-browser clients (CLI, server-to-server) where CSRF does not apply —
 * session cookies additionally carry SameSite=Lax as defense in depth.
 * `/api/auth/*` is excluded: the identity engine enforces its own checks.
 */
function originGuard(allowedOrigins: ReadonlySet<string>): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (SAFE_METHODS.has(c.req.method) || c.req.path.startsWith("/api/auth/")) {
      return next();
    }
    const origin = c.req.header("origin");
    if (origin && !allowedOrigins.has(origin)) {
      throw new ForbiddenError("Origin not allowed.");
    }
    return next();
  };
}

/**
 * Builds the Rivet API as a fetch-native Hono app (ADR-0008). Everything is
 * dependency-injected, so tests drive `app.request()` in-process against
 * PGlite — no sockets, no mocks of the real middleware/route stack.
 *
 * Module layout note (architecture overview §9): this is the `api` module of
 * the single server process; `ingest` and `worker` modules join it in later
 * phases and remain splittable behind flags.
 */
export function createApp(options: CreateAppOptions): Hono<AppEnv> {
  const logger = options.logger ?? consoleLogger;
  const deps: AppDeps = {
    db: options.db,
    auth: options.auth,
    logger,
    baseUrl: options.baseUrl,
  };

  const app = new Hono<AppEnv>();

  const allowedOrigins = new Set([
    new URL(options.baseUrl).origin,
    ...(options.trustedOrigins ?? []),
  ]);

  app.use(requestLogger(logger));
  app.use("/api/*", originGuard(allowedOrigins));
  app.onError(mapError(logger));
  app.notFound((c) => c.json({ error: { message: "Not found." } }, 404));

  // Liveness: the process is up. Readiness: dependencies are reachable.
  app.get("/healthz", (c) => c.json({ status: "ok" }));
  app.get("/readyz", async (c) => {
    try {
      await deps.db.execute(sql`SELECT 1`);
      return c.json({ status: "ready" });
    } catch {
      return c.json({ status: "unavailable", reason: "database unreachable" }, 503);
    }
  });

  // Identity engine (ADR-0007) — fetch handler mounted directly.
  app.all("/api/auth/*", (c) => deps.auth.handler(c.req.raw));

  app.get("/api/openapi.json", (c) => c.json(buildOpenApiStub(deps.baseUrl)));

  app.route("/api/orgs", organizationsRoutes(deps));

  return app;
}
