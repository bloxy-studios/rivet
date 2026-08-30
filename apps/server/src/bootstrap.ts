import { createAuth } from "@rivet/auth";
import { createDatabase } from "@rivet/database";
import type { Hono } from "hono";
import { createApp } from "./app";
import type { ServerEnv } from "./env";
import { consoleLogger, type Logger } from "./logging";
import type { AppEnv } from "./routes/shared";

export interface BootstrappedServer {
  app: Hono<AppEnv>;
  close: () => Promise<void>;
}

/**
 * Builds the fully wired application from validated configuration — the
 * single place where environment values fan out into dependencies, so the
 * wiring itself is regression-testable (see bootstrap.test.ts: trusted
 * origins must reach BOTH the identity engine and the management API's
 * origin guard). The Bun-only entry point (main.ts) adds nothing but
 * Bun.serve and signal handling on top of this.
 */
export function createServerFromEnv(
  env: ServerEnv,
  logger: Logger = consoleLogger,
): BootstrappedServer {
  const { db, close } = createDatabase(env.databaseUrl);
  const auth = createAuth({
    db,
    secret: env.authSecret,
    baseURL: env.baseUrl,
    trustedOrigins: env.trustedOrigins,
  });
  const app = createApp({
    db,
    auth,
    baseUrl: env.baseUrl,
    trustedOrigins: env.trustedOrigins,
    logger,
  });
  return { app, close };
}
