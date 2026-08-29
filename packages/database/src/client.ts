import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

export interface DatabaseHandle {
  db: Database;
  /** Closes the underlying connection pool. Always call on shutdown. */
  close: () => Promise<void>;
}

export interface CreateDatabaseOptions {
  /** Max pool connections (default 10; use 1 for migration runs). */
  max?: number;
}

/**
 * Creates a Drizzle client over postgres.js for the given connection URL.
 * postgres.js is used (rather than a native driver) so the package runs
 * identically on Bun and Node (ADR-0006).
 */
export function createDatabase(url: string, options: CreateDatabaseOptions = {}): DatabaseHandle {
  const client = postgres(url, {
    max: options.max ?? 10,
    onnotice: () => {}, // silence NOTICE chatter (e.g. IF NOT EXISTS) in CLIs
  });
  return {
    db: drizzle(client, { schema }),
    close: () => client.end(),
  };
}

/** Reads DATABASE_URL or throws with actionable guidance. */
export function requireDatabaseUrl(env: Record<string, string | undefined>): string {
  const url = env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Start the dev database (docker compose -f infrastructure/compose/dev.yml up -d) " +
        "and export DATABASE_URL, e.g. postgres://rivet:rivet@localhost:5432/rivet — see packages/database/README.md.",
    );
  }
  return url;
}
