import { ORG_ROLES, SERVICE_CRITICALITIES } from "@rivet/types";
import { count, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "./schema";
import { createTestDatabase, type TestDatabaseHandle } from "./testing";

let handle: TestDatabaseHandle;

beforeEach(async () => {
  handle = await createTestDatabase();
});

afterEach(async () => {
  await handle.close();
});

async function insertOrg(slug = "acme") {
  const [org] = await handle.db
    .insert(schema.organizations)
    .values({ name: slug, slug })
    .returning();
  if (!org) throw new Error("org insert returned nothing");
  return org;
}

async function insertUser(email: string) {
  const [user] = await handle.db.insert(schema.users).values({ email }).returning();
  if (!user) throw new Error("user insert returned nothing");
  return user;
}

async function insertProject(orgId: string, slug = "app") {
  const [project] = await handle.db
    .insert(schema.projects)
    .values({ orgId, name: slug, slug })
    .returning();
  if (!project) throw new Error("project insert returned nothing");
  return project;
}

describe("migrations", () => {
  it("apply from zero and are re-runnable (idempotent)", async () => {
    // beforeEach already migrated from zero; a second run must be a no-op.
    await expect(handle.remigrate()).resolves.toBeUndefined();
    // The schema is actually there:
    await insertOrg();
    const rows = await handle.db.select({ n: count() }).from(schema.organizations);
    expect(rows[0]?.n).toBe(1);
  });
});

describe("tenancy constraints", () => {
  it("rejects duplicate organization slugs", async () => {
    await insertOrg("acme");
    await expect(insertOrg("acme")).rejects.toThrow();
  });

  it("enforces case-insensitive unique user emails", async () => {
    await insertUser("Founder@Example.com");
    await expect(insertUser("founder@example.COM")).rejects.toThrow();
  });

  it("allows one membership per user per org, across every valid role", async () => {
    const org = await insertOrg();
    const user = await insertUser("member@example.com");
    await handle.db
      .insert(schema.memberships)
      .values({ orgId: org.id, userId: user.id, role: "ADMIN" });
    await expect(
      handle.db
        .insert(schema.memberships)
        .values({ orgId: org.id, userId: user.id, role: "VIEWER" }),
    ).rejects.toThrow();

    // Every role in the closed set is accepted by the CHECK constraint.
    for (const role of ORG_ROLES) {
      const u = await insertUser(`${role.toLowerCase()}@example.com`);
      await expect(
        handle.db.insert(schema.memberships).values({ orgId: org.id, userId: u.id, role }),
      ).resolves.toBeDefined();
    }
  });

  it("rejects roles outside the @rivet/types closed set", async () => {
    const org = await insertOrg();
    const user = await insertUser("intruder@example.com");
    await expect(
      handle.db
        .insert(schema.memberships)
        .values({ orgId: org.id, userId: user.id, role: "JANITOR" }),
    ).rejects.toThrow();
    await expect(
      handle.db
        .insert(schema.memberships)
        .values({ orgId: org.id, userId: user.id, role: "owner" }),
    ).rejects.toThrow();
  });
});

describe("project-plane constraints", () => {
  it("scopes project slugs per organization (same slug allowed across orgs)", async () => {
    const a = await insertOrg("org-a");
    const b = await insertOrg("org-b");
    await insertProject(a.id, "checkout");
    await expect(insertProject(b.id, "checkout")).resolves.toBeDefined();
    await expect(insertProject(a.id, "checkout")).rejects.toThrow();
  });

  it("enforces unique environment names per project", async () => {
    const org = await insertOrg();
    const project = await insertProject(org.id);
    await handle.db
      .insert(schema.environments)
      .values({ projectId: project.id, name: "production" });
    await expect(
      handle.db.insert(schema.environments).values({ projectId: project.id, name: "production" }),
    ).rejects.toThrow();
  });

  it("enforces unique service names per project and the criticality CHECK", async () => {
    const org = await insertOrg();
    const project = await insertProject(org.id);
    const [svc] = await handle.db
      .insert(schema.services)
      .values({ projectId: project.id, name: "payments", criticality: "CRITICAL" })
      .returning();
    expect(svc?.criticality).toBe("CRITICAL");

    await expect(
      handle.db.insert(schema.services).values({ projectId: project.id, name: "payments" }),
    ).rejects.toThrow();

    await expect(
      handle.db
        .insert(schema.services)
        .values({ projectId: project.id, name: "shady", criticality: "EXTREME" }),
    ).rejects.toThrow();

    // Default criticality is MEDIUM and the whole closed set is accepted.
    const [defaulted] = await handle.db
      .insert(schema.services)
      .values({ projectId: project.id, name: "defaulted" })
      .returning();
    expect(defaulted?.criticality).toBe("MEDIUM");
    for (const criticality of SERVICE_CRITICALITIES) {
      await expect(
        handle.db
          .insert(schema.services)
          .values({ projectId: project.id, name: `svc-${criticality}`, criticality }),
      ).resolves.toBeDefined();
    }
  });
});

describe("credential constraints", () => {
  it("enforces globally unique DSN public keys", async () => {
    const org = await insertOrg();
    const p1 = await insertProject(org.id, "p1");
    const p2 = await insertProject(org.id, "p2");
    await handle.db.insert(schema.dsns).values({ projectId: p1.id, publicKey: "k".repeat(32) });
    await expect(
      handle.db.insert(schema.dsns).values({ projectId: p2.id, publicKey: "k".repeat(32) }),
    ).rejects.toThrow();
  });

  it("enforces unique API key hashes and defaults scopes to empty", async () => {
    const org = await insertOrg();
    const [key] = await handle.db
      .insert(schema.apiKeys)
      .values({ orgId: org.id, name: "ci", keyHash: "h".repeat(64), keyPrefix: "rvk_demo" })
      .returning();
    expect(key?.scopes).toEqual([]);
    await expect(
      handle.db
        .insert(schema.apiKeys)
        .values({ orgId: org.id, name: "ci-2", keyHash: "h".repeat(64), keyPrefix: "rvk_demo" }),
    ).rejects.toThrow();
  });
});

describe("deletion semantics (org isolation)", () => {
  it("deleting an organization cascades its tree but never touches global users", async () => {
    const org = await insertOrg("doomed");
    const survivorOrg = await insertOrg("survivor");
    const user = await insertUser("keeper@example.com");
    await handle.db
      .insert(schema.memberships)
      .values({ orgId: org.id, userId: user.id, role: "OWNER" });
    const project = await insertProject(org.id);
    await handle.db
      .insert(schema.environments)
      .values({ projectId: project.id, name: "production" });
    await handle.db.insert(schema.services).values({ projectId: project.id, name: "api" });
    await handle.db
      .insert(schema.dsns)
      .values({ projectId: project.id, publicKey: "z".repeat(32) });
    const survivorProject = await insertProject(survivorOrg.id, "safe");

    await handle.db.delete(schema.organizations).where(eq(schema.organizations.id, org.id));

    const [projects, environments, services, dsns, memberships, users] = await Promise.all([
      handle.db.select({ n: count() }).from(schema.projects),
      handle.db.select({ n: count() }).from(schema.environments),
      handle.db.select({ n: count() }).from(schema.services),
      handle.db.select({ n: count() }).from(schema.dsns),
      handle.db.select({ n: count() }).from(schema.memberships),
      handle.db.select({ n: count() }).from(schema.users),
    ]);
    expect(projects[0]?.n).toBe(1); // only the survivor org's project remains
    expect(environments[0]?.n).toBe(0);
    expect(services[0]?.n).toBe(0);
    expect(dsns[0]?.n).toBe(0);
    expect(memberships[0]?.n).toBe(0);
    expect(users[0]?.n).toBe(1); // users are global identities
    expect(survivorProject.id).toBeTruthy();
  });
});
