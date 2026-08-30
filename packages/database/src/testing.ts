import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

export type TestDatabase = PgliteDatabase<typeof schema>;

export interface TestDatabaseHandle {
  db: TestDatabase;
  /** Re-runs the migrator (used to assert idempotency). */
  remigrate: () => Promise<void>;
  close: () => Promise<void>;
}

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../migrations", import.meta.url));

/**
 * Creates a fresh in-process Postgres (PGlite — real Postgres compiled to
 * WASM) and applies the committed SQL migrations from zero. This is what
 * lets constraint tests run in CI with no Docker and no external services
 * while still exercising genuine Postgres semantics (ADR-0006).
 */
export async function createTestDatabase(): Promise<TestDatabaseHandle> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  const remigrate = async () => {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  };
  await remigrate();
  return { db, remigrate, close: () => client.close() };
}
