import { and, eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/** Any Drizzle Postgres database over the Rivet schema (postgres.js, PGlite, …). */
export type SeedableDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Deterministic IDs so the seed is idempotent: re-running inserts nothing new.
 * These are demo fixtures for local development — clearly labeled, never for
 * production use.
 */
export const DEMO = {
  org: "d0000000-0000-4000-8000-000000000001",
  ownerUser: "d0000000-0000-4000-8000-000000000011",
  developerUser: "d0000000-0000-4000-8000-000000000012",
  ownerMembership: "d0000000-0000-4000-8000-000000000021",
  developerMembership: "d0000000-0000-4000-8000-000000000022",
  team: "d0000000-0000-4000-8000-000000000031",
  teamMembership: "d0000000-0000-4000-8000-000000000032",
  project: "d0000000-0000-4000-8000-000000000041",
  envProduction: "d0000000-0000-4000-8000-000000000051",
  envStaging: "d0000000-0000-4000-8000-000000000052",
  envDevelopment: "d0000000-0000-4000-8000-000000000053",
  servicePayments: "d0000000-0000-4000-8000-000000000061",
  serviceApi: "d0000000-0000-4000-8000-000000000062",
  serviceAnalytics: "d0000000-0000-4000-8000-000000000063",
  dsn: "d0000000-0000-4000-8000-000000000071",
  dsnPublicKey: "demo0000000000000000000000000000",
  ownerEmail: "demo-owner@rivet.local",
  developerEmail: "demo-developer@rivet.local",
} as const;

/**
 * Thrown when the target database already contains rows that own the demo
 * fixtures' natural keys under different IDs — a strong sign this is not a
 * demo/dev database. The seed refuses to touch it rather than blindly
 * skipping parents and failing halfway through.
 */
export class SeedConflictError extends Error {
  readonly conflicts: readonly string[];

  constructor(conflicts: readonly string[]) {
    super(
      "Refusing to seed: existing rows own demo natural keys under different ids:\n" +
        conflicts.map((c) => `  - ${c}`).join("\n") +
        "\nThis database does not look like a demo/dev target. Use a fresh database or remove the conflicting rows.",
    );
    this.name = "SeedConflictError";
    this.conflicts = conflicts;
  }
}

/** Natural-key probes: each existing row must carry the expected fixed ID. */
async function findConflicts(db: SeedableDatabase): Promise<string[]> {
  const conflicts: string[] = [];
  const expect = (label: string, rows: ReadonlyArray<{ id: string }>, expectedId: string): void => {
    for (const row of rows) {
      if (row.id !== expectedId) conflicts.push(`${label} is owned by row ${row.id}`);
    }
  };

  expect(
    'organization slug "demo"',
    await db
      .select({ id: schema.organizations.id })
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, "demo")),
    DEMO.org,
  );

  for (const [email, expectedId] of [
    [DEMO.ownerEmail, DEMO.ownerUser],
    [DEMO.developerEmail, DEMO.developerUser],
  ] as const) {
    expect(
      `user email "${email}"`,
      await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(sql`lower(${schema.users.email}) = ${email}`),
      expectedId,
    );
  }

  expect(
    'team slug "platform" in the demo org',
    await db
      .select({ id: schema.teams.id })
      .from(schema.teams)
      .where(and(eq(schema.teams.orgId, DEMO.org), eq(schema.teams.slug, "platform"))),
    DEMO.team,
  );

  expect(
    'project slug "demo-app" in the demo org',
    await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(and(eq(schema.projects.orgId, DEMO.org), eq(schema.projects.slug, "demo-app"))),
    DEMO.project,
  );

  for (const [name, expectedId] of [
    ["production", DEMO.envProduction],
    ["staging", DEMO.envStaging],
    ["development", DEMO.envDevelopment],
  ] as const) {
    expect(
      `environment "${name}" in the demo project`,
      await db
        .select({ id: schema.environments.id })
        .from(schema.environments)
        .where(
          and(eq(schema.environments.projectId, DEMO.project), eq(schema.environments.name, name)),
        ),
      expectedId,
    );
  }

  for (const [name, expectedId] of [
    ["payments", DEMO.servicePayments],
    ["api", DEMO.serviceApi],
    ["analytics", DEMO.serviceAnalytics],
  ] as const) {
    expect(
      `service "${name}" in the demo project`,
      await db
        .select({ id: schema.services.id })
        .from(schema.services)
        .where(and(eq(schema.services.projectId, DEMO.project), eq(schema.services.name, name))),
      expectedId,
    );
  }

  for (const [userId, expectedId] of [
    [DEMO.ownerUser, DEMO.ownerMembership],
    [DEMO.developerUser, DEMO.developerMembership],
  ] as const) {
    expect(
      "demo org membership",
      await db
        .select({ id: schema.memberships.id })
        .from(schema.memberships)
        .where(and(eq(schema.memberships.orgId, DEMO.org), eq(schema.memberships.userId, userId))),
      expectedId,
    );
  }

  expect(
    "demo team membership",
    await db
      .select({ id: schema.teamMemberships.id })
      .from(schema.teamMemberships)
      .where(
        and(
          eq(schema.teamMemberships.teamId, DEMO.team),
          eq(schema.teamMemberships.userId, DEMO.developerUser),
        ),
      ),
    DEMO.teamMembership,
  );

  expect(
    "demo DSN public key",
    await db
      .select({ id: schema.dsns.id })
      .from(schema.dsns)
      .where(eq(schema.dsns.publicKey, DEMO.dsnPublicKey)),
    DEMO.dsn,
  );

  return conflicts;
}

/**
 * Seeds the demo organization used by local development and examples.
 *
 * Atomic and idempotent by construction: the whole run executes in one
 * transaction; natural keys are validated up front (SeedConflictError on
 * foreign ownership, nothing written); inserts target primary-key conflicts
 * only, so a re-run over an existing demo tree is a clean no-op while any
 * unexpected uniqueness violation aborts the transaction loudly.
 */
export async function seed(db: SeedableDatabase): Promise<void> {
  await db.transaction(async (tx) => {
    const conflicts = await findConflicts(tx);
    if (conflicts.length > 0) throw new SeedConflictError(conflicts);

    await tx
      .insert(schema.organizations)
      .values({ id: DEMO.org, name: "Demo Org", slug: "demo" })
      .onConflictDoNothing({ target: schema.organizations.id });

    await tx
      .insert(schema.users)
      .values([
        { id: DEMO.ownerUser, email: DEMO.ownerEmail, name: "Demo Owner" },
        { id: DEMO.developerUser, email: DEMO.developerEmail, name: "Demo Developer" },
      ])
      .onConflictDoNothing({ target: schema.users.id });

    await tx
      .insert(schema.memberships)
      .values([
        { id: DEMO.ownerMembership, orgId: DEMO.org, userId: DEMO.ownerUser, role: "OWNER" },
        {
          id: DEMO.developerMembership,
          orgId: DEMO.org,
          userId: DEMO.developerUser,
          role: "DEVELOPER",
        },
      ])
      .onConflictDoNothing({ target: schema.memberships.id });

    await tx
      .insert(schema.teams)
      .values({ id: DEMO.team, orgId: DEMO.org, name: "Platform", slug: "platform" })
      .onConflictDoNothing({ target: schema.teams.id });

    await tx
      .insert(schema.teamMemberships)
      .values({
        id: DEMO.teamMembership,
        teamId: DEMO.team,
        orgId: DEMO.org,
        userId: DEMO.developerUser,
      })
      .onConflictDoNothing({ target: schema.teamMemberships.id });

    await tx
      .insert(schema.projects)
      .values({ id: DEMO.project, orgId: DEMO.org, name: "Demo App", slug: "demo-app" })
      .onConflictDoNothing({ target: schema.projects.id });

    await tx
      .insert(schema.environments)
      .values([
        { id: DEMO.envProduction, projectId: DEMO.project, name: "production" },
        { id: DEMO.envStaging, projectId: DEMO.project, name: "staging" },
        { id: DEMO.envDevelopment, projectId: DEMO.project, name: "development" },
      ])
      .onConflictDoNothing({ target: schema.environments.id });

    await tx
      .insert(schema.services)
      .values([
        // Criticality mirrors the mandate's example: payments critical, analytics low.
        {
          id: DEMO.servicePayments,
          projectId: DEMO.project,
          name: "payments",
          criticality: "CRITICAL",
        },
        { id: DEMO.serviceApi, projectId: DEMO.project, name: "api", criticality: "HIGH" },
        {
          id: DEMO.serviceAnalytics,
          projectId: DEMO.project,
          name: "analytics",
          criticality: "LOW",
        },
      ])
      .onConflictDoNothing({ target: schema.services.id });

    await tx
      .insert(schema.dsns)
      .values({
        id: DEMO.dsn,
        projectId: DEMO.project,
        publicKey: DEMO.dsnPublicKey,
        label: "Demo DSN (local development only)",
      })
      .onConflictDoNothing({ target: schema.dsns.id });
  });
}
