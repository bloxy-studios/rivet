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
} as const;

/**
 * Seeds the demo organization used by local development and examples.
 * Idempotent: every insert targets fixed IDs/unique keys with
 * ON CONFLICT DO NOTHING.
 */
export async function seed(db: SeedableDatabase): Promise<void> {
  await db
    .insert(schema.organizations)
    .values({ id: DEMO.org, name: "Demo Org", slug: "demo" })
    .onConflictDoNothing();

  await db
    .insert(schema.users)
    .values([
      { id: DEMO.ownerUser, email: "demo-owner@rivet.local", name: "Demo Owner" },
      { id: DEMO.developerUser, email: "demo-developer@rivet.local", name: "Demo Developer" },
    ])
    .onConflictDoNothing();

  await db
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
    .onConflictDoNothing();

  await db
    .insert(schema.teams)
    .values({ id: DEMO.team, orgId: DEMO.org, name: "Platform", slug: "platform" })
    .onConflictDoNothing();

  await db
    .insert(schema.teamMemberships)
    .values({ id: DEMO.teamMembership, teamId: DEMO.team, userId: DEMO.developerUser })
    .onConflictDoNothing();

  await db
    .insert(schema.projects)
    .values({ id: DEMO.project, orgId: DEMO.org, name: "Demo App", slug: "demo-app" })
    .onConflictDoNothing();

  await db
    .insert(schema.environments)
    .values([
      { id: DEMO.envProduction, projectId: DEMO.project, name: "production" },
      { id: DEMO.envStaging, projectId: DEMO.project, name: "staging" },
      { id: DEMO.envDevelopment, projectId: DEMO.project, name: "development" },
    ])
    .onConflictDoNothing();

  await db
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
      { id: DEMO.serviceAnalytics, projectId: DEMO.project, name: "analytics", criticality: "LOW" },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.dsns)
    .values({
      id: DEMO.dsn,
      projectId: DEMO.project,
      publicKey: DEMO.dsnPublicKey,
      label: "Demo DSN (local development only)",
    })
    .onConflictDoNothing();
}
