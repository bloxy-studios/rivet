import { ForbiddenError, UnauthenticatedError } from "@rivet/auth";
import type { Context } from "hono";
import { ZodError, type ZodType, z } from "zod";
import type { Logger } from "./logging";

/** Route-level HTTP signaling with an explicit status. */
export class HttpError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 422,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Postgres unique-constraint violation, however the driver wraps it. */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth++) {
    if (typeof current === "object" && "code" in current && current.code === "23505") {
      return true;
    }
    current = typeof current === "object" && "cause" in current ? current.cause : undefined;
  }
  return false;
}

/**
 * Parses and validates a JSON request body. Throws typed errors that the
 * central error mapper converts to 400 responses with actionable detail.
 */
export async function parseJsonBody<T>(c: Context, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw result.error;
  return result.data;
}

interface ErrorBody {
  error: { message: string; requestId?: string; issues?: unknown };
}

/**
 * Central error mapper: typed errors become their status; unique violations
 * become 409; everything unexpected becomes an opaque 500 (logged with the
 * request id, never leaked to the client).
 */
export function mapError(logger: Logger) {
  return (err: Error, c: Context): Response => {
    const requestId = c.res.headers.get("x-request-id") ?? undefined;
    const respond = (status: number, body: ErrorBody): Response => c.json(body, status as never);

    if (err instanceof UnauthenticatedError || err instanceof ForbiddenError) {
      return respond(err.status, {
        error: { message: err.message, ...(requestId && { requestId }) },
      });
    }
    if (err instanceof HttpError) {
      return respond(err.status, {
        error: { message: err.message, ...(requestId && { requestId }) },
      });
    }
    if (err instanceof ZodError) {
      return respond(400, {
        error: {
          message: "Request validation failed.",
          issues: z.flattenError(err).fieldErrors,
          ...(requestId && { requestId }),
        },
      });
    }
    if (isUniqueViolation(err)) {
      return respond(409, {
        error: {
          message: "A resource with this unique value already exists.",
          ...(requestId && { requestId }),
        },
      });
    }
    logger.error({
      msg: "unhandled error",
      requestId,
      error: err.message,
      stack: err.stack,
    });
    return respond(500, {
      error: { message: "Internal server error.", ...(requestId && { requestId }) },
    });
  };
}
