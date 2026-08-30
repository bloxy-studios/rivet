import type { MiddlewareHandler } from "hono";

/** Minimal structured logger; stdout JSON lines by default. */
export interface Logger {
  info(entry: Record<string, unknown>): void;
  error(entry: Record<string, unknown>): void;
}

export const consoleLogger: Logger = {
  info: (entry) => console.log(JSON.stringify({ level: "info", ...entry })),
  error: (entry) => console.error(JSON.stringify({ level: "error", ...entry })),
};

/**
 * Request logging with a per-request id (returned as `x-request-id`).
 * Redaction by omission: only method, path, status, and duration are logged —
 * never headers, cookies, bodies, or query strings (DSNs and tokens travel in
 * those; see ADR-0005 §7 on secrets and logs).
 */
export function requestLogger(logger: Logger): MiddlewareHandler {
  return async (c, next) => {
    const requestId = crypto.randomUUID();
    c.header("x-request-id", requestId);
    const startedAt = performance.now();
    await next();
    logger.info({
      msg: "request",
      requestId,
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    });
  };
}
