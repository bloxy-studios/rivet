import { schema } from "@rivet/database";
import { count, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addMembership,
  api,
  buildTestApp,
  createOrgViaApi,
  signUpUser,
  type TestApp,
} from "../test-helpers";

let t: TestApp;

beforeEach(async () => {
  t = await buildTestApp();
});

afterEach(async () => {
  await t.handle.close();
});

describe("organization creation", () => {
  it("creates the org with a derived slug and an OWNER membership, atomically", async () => {
    const user = await signUpUser(t, "founder@example.com", "Founder");
    const res = await api(t.app, "POST", "/api/orgs", {
      cookie: user.cookie,
      body: { name: "Acme Inc." },
    });
    expect(res.status).toBe(201);
    const org = (await res.json()) as { id: string; slug: string; role: string };
    expect(org.slug).toBe("acme-inc");
    expect(org.role).toBe("OWNER");

    const [membership] = await t.handle.db
      .select()
      .from(schema.memberships)
      .where(eq(schema.memberships.orgId, org.id));
    expect(membership?.userId).toBe(user.userId);
    expect(membership?.role).toBe("OWNER");
  });

  it("validates explicit slugs and rejects duplicates with 409", async () => {
    const user = await signUpUser(t, "founder@example.com", "Founder");
    const bad = await api(t.app, "POST", "/api/orgs", {
      cookie: user.cookie,
      body: { name: "Acme", slug: "Not A Slug!" },
    });
    expect(bad.status).toBe(400);

    const first = await api(t.app, "POST", "/api/orgs", {
      cookie: user.cookie,
      body: { name: "Acme", slug: "acme" },
    });
    expect(first.status).toBe(201);

    const dup = await api(t.app, "POST", "/api/orgs", {
      cookie: user.cookie,
      body: { name: "Acme Again", slug: "acme" },
    });
    expect(dup.status).toBe(409);

    // The failed create must not have leaked a membership (transactional).
    const memberships = await t.handle.db.select({ n: count() }).from(schema.memberships);
    expect(memberships[0]?.n).toBe(1);
  });
});

describe("organization reads", () => {
  it("lists only the caller's organizations, with their role", async () => {
    const alice = await signUpUser(t, "alice@example.com", "Alice");
    const bob = await signUpUser(t, "bob@example.com", "Bob");
    await createOrgViaApi(t, alice.cookie, "Alpha");
    await createOrgViaApi(t, alice.cookie, "Beta");
    const bobsOrg = await createOrgViaApi(t, bob.cookie, "Gamma");

    const res = await api(t.app, "GET", "/api/orgs", { cookie: bob.cookie });
    const orgs = (await res.json()) as Array<{ id: string; role: string }>;
    expect(orgs).toHaveLength(1);
    expect(orgs[0]?.id).toBe(bobsOrg.id);
    expect(orgs[0]?.role).toBe("OWNER");
  });

  it("scopes reads to members and treats malformed ids as 404", async () => {
    const owner = await signUpUser(t, "owner@example.com", "Owner");
    const outsider = await signUpUser(t, "outsider@example.com", "Outsider");
    const org = await createOrgViaApi(t, owner.cookie, "Private Org");

    const asMember = await api(t.app, "GET", `/api/orgs/${org.id}`, { cookie: owner.cookie });
    expect(asMember.status).toBe(200);

    const asOutsider = await api(t.app, "GET", `/api/orgs/${org.id}`, {
      cookie: outsider.cookie,
    });
    expect(asOutsider.status).toBe(403);

    const malformed = await api(t.app, "GET", "/api/orgs/not-a-uuid", { cookie: owner.cookie });
    expect(malformed.status).toBe(404);
  });
});

describe("organization mutations", () => {
  it("enforces ADMIN for rename and OWNER for deletion", async () => {
    const owner = await signUpUser(t, "owner@example.com", "Owner");
    const admin = await signUpUser(t, "admin@example.com", "Admin");
    const viewer = await signUpUser(t, "viewer@example.com", "Viewer");
    const org = await createOrgViaApi(t, owner.cookie, "Matrix Org");
    await addMembership(t, org.id, admin.userId, "ADMIN");
    await addMembership(t, org.id, viewer.userId, "VIEWER");

    const viewerRename = await api(t.app, "PATCH", `/api/orgs/${org.id}`, {
      cookie: viewer.cookie,
      body: { name: "Nope" },
    });
    expect(viewerRename.status).toBe(403);

    const adminRename = await api(t.app, "PATCH", `/api/orgs/${org.id}`, {
      cookie: admin.cookie,
      body: { name: "Renamed Org" },
    });
    expect(adminRename.status).toBe(200);
    expect(((await adminRename.json()) as { name: string }).name).toBe("Renamed Org");

    const adminDelete = await api(t.app, "DELETE", `/api/orgs/${org.id}`, {
      cookie: admin.cookie,
    });
    expect(adminDelete.status).toBe(403);

    const ownerDelete = await api(t.app, "DELETE", `/api/orgs/${org.id}`, {
      cookie: owner.cookie,
    });
    expect(ownerDelete.status).toBe(204);

    const list = await api(t.app, "GET", "/api/orgs", { cookie: owner.cookie });
    expect((await list.json()) as unknown[]).toHaveLength(0);
  });
});
