import { count, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "./schema";
import { DEMO, SeedConflictError, seed } from "./seed";
import { createTestDatabase, type TestDatabaseHandle } from "./testing";

let handle: TestDatabaseHandle;

beforeEach(async () => {
  handle = await createTestDatabase();
});

afterEach(async () => {
  await handle.close();
});

async function snapshotCounts() {
  const tables = [
    schema.organizations,
    schema.users,
    schema.memberships,
    schema.teams,
    schema.teamMemberships,
    schema.projects,
    schema.environments,
    schema.services,
    schema.dsns,
  ] as const;
  const rows = await Promise.all(tables.map((t) => handle.db.select({ n: count() }).from(t)));
  return rows.map((r) => r[0]?.n ?? 0);
}

describe("seed", () => {
  it("creates the demo organization tree", async () => {
    await seed(handle.db);

    const [org] = await handle.db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, "demo"));
    expect(org?.name).toBe("Demo Org");

    expect(await snapshotCounts()).toEqual([1, 2, 2, 1, 1, 1, 3, 3, 1]);

    const [dsn] = await handle.db
      .select()
      .from(schema.dsns)
      .where(eq(schema.dsns.publicKey, DEMO.dsnPublicKey));
    expect(dsn?.projectId).toBe(DEMO.project);

    const services = await handle.db.select().from(schema.services);
    expect(new Map(services.map((s) => [s.name, s.criticality]))).toEqual(
      new Map([
        ["payments", "CRITICAL"],
        ["api", "HIGH"],
        ["analytics", "LOW"],
      ]),
    );
  });

  it("fails loudly and atomically when foreign rows own demo natural keys", async () => {
    // A different row already owns the "demo" org slug.
    await handle.db.insert(schema.organizations).values({ name: "Squatter", slug: "demo" });

    await expect(seed(handle.db)).rejects.toThrow(SeedConflictError);
    await expect(seed(handle.db)).rejects.toThrow(/demo natural keys/);

    // Atomic: the failed seed wrote nothing at all.
    const [users, projects, dsns] = await Promise.all([
      handle.db.select({ n: count() }).from(schema.users),
      handle.db.select({ n: count() }).from(schema.projects),
      handle.db.select({ n: count() }).from(schema.dsns),
    ]);
    expect(users[0]?.n).toBe(0);
    expect(projects[0]?.n).toBe(0);
    expect(dsns[0]?.n).toBe(0);
  });

  it("is idempotent — re-running changes nothing", async () => {
    await seed(handle.db);
    const first = await snapshotCounts();
    await seed(handle.db);
    await seed(handle.db);
    expect(await snapshotCounts()).toEqual(first);
  });
});
