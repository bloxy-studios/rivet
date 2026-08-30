/// <reference path="./runtime.d.ts" />
/**
 * Bun entry point — the only file that touches Bun APIs (ADR-0008).
 * Run with: bun apps/server/src/index.ts (or `bun run dev` for watch mode).
 */
import { createServerFromEnv } from "./bootstrap";
import { loadEnv } from "./env";
import { consoleLogger } from "./logging";

const env = loadEnv(process.env);
const { app, close } = createServerFromEnv(env, consoleLogger);

const server = Bun.serve({ port: env.port, fetch: app.fetch });
consoleLogger.info({
  msg: "server listening",
  port: server.port,
  baseUrl: env.baseUrl,
  hint: "run `bun run db:migrate` first if /readyz reports the database unreachable",
});

async function shutdown(signal: string): Promise<void> {
  consoleLogger.info({ msg: "shutting down", signal });
  await server.stop();
  await close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
