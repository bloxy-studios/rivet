import { schema } from "@rivet/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

/** Any Drizzle Postgres database over the Rivet schema (postgres.js, PGlite, …). */
export type AuthDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface CreateAuthOptions {
  /** Drizzle database over the Rivet control-plane schema. */
  db: AuthDatabase;
  /**
   * Secret for signing/encrypting cookies and tokens. Provide via
   * environment (e.g. RIVET_AUTH_SECRET); never commit it. Generate with:
   * `openssl rand -base64 32`.
   */
  secret: string;
  /** Canonical base URL of the deployment (e.g. https://rivet.example.com). */
  baseURL: string;
  /**
   * Additional origins allowed to make authenticated requests (the baseURL
   * origin is always trusted). Requests from other origins are rejected —
   * this is the CSRF boundary; never wildcard it in production.
   */
  trustedOrigins?: string[];
}

/**
 * Creates the Rivet identity engine (ADR-0007).
 *
 * Scope: identity only — signup/login, scrypt password hashing, DB-backed
 * cookie sessions, CSRF origin checks, and (later) OAuth providers.
 * Authorization is NOT here: organization roles live in Rivet's
 * `memberships` table and are enforced by the guards in `./guards`.
 */
export function createAuth(options: CreateAuthOptions) {
  return betterAuth({
    baseURL: options.baseURL,
    secret: options.secret,
    ...(options.trustedOrigins ? { trustedOrigins: options.trustedOrigins } : {}),
    database: drizzleAdapter(options.db, {
      provider: "pg",
      usePlural: true,
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    advanced: {
      // The engine silently disables origin/CSRF checks under NODE_ENV=test
      // unless these are set explicitly. Rivet pins them ON in every
      // environment: tests must exercise production security behavior, and
      // no runtime environment variable may ever weaken the CSRF boundary.
      disableOriginCheck: false,
      disableCSRFCheck: false,
      database: {
        // Match the control-plane convention: uuid primary keys.
        generateId: "uuid",
      },
    },
  });
}

export type RivetAuth = ReturnType<typeof createAuth>;
export type AuthSession = NonNullable<Awaited<ReturnType<RivetAuth["api"]["getSession"]>>>;
