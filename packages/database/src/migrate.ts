import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "./client";

/** Absolute path to the committed SQL migrations directory. */
export const MIGRATIONS_FOLDER = fileURLToPath(new URL("../migrations", import.meta.url));

/**
 * Applies all pending migrations to the database at `url`.
 * Safe to run repeatedly: already-applied migrations are skipped via
 * Drizzle's journal table (idempotent by design, ADR-0006).
 */
export async function runMigrations(url: string): Promise<void> {
  const { db, close } = createDatabase(url, { max: 1 });
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await close();
  }
}
