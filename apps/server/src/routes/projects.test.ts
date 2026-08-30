import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addMembership,
  api,
  buildTestApp,
  createOrgViaApi,
  signUpUser,
  type TestApp,
  type TestUser,
} from "../test-helpers";

let t: TestApp;
let owner: TestUser;
let developer: TestUser;
let viewer: TestUser;
let orgId: string;

beforeEach(async () => {
  t = await buildTestApp();
  owner = await signUpUser(t, "owner@example.com", "Owner");
  developer = await signUpUser(t, "dev@example.com", "Dev");
  viewer = await signUpUser(t, "viewer@example.com", "Viewer");
  const org = await createOrgViaApi(t, owner.cookie, "Proj Org");
  orgId = org.id;
  await addMembership(t, orgId, developer.userId, "DEVELOPER");
  await addMembership(t, orgId, viewer.userId, "VIEWER");
});

afterEach(async () => {
  await t.handle.close();
});

async function createProject(cookie: string, name: string): Promise<{ id: string }> {
  const res = await api(t.app, "POST", `/api/orgs/${orgId}/projects`, {
    cookie,
    body: { name },
  });
  expect(res.status).toBe(201);
  return (await res.json()) as { id: string };
}

describe("projects", () => {
  it("gates creation to ADMIN+, reads to VIEWER+, and scopes slugs per org", async () => {
    const asDev = await api(t.app, "POST", `/api/orgs/${orgId}/projects`, {
      cookie: developer.cookie,
      body: { name: "Checkout" },
    });
    expect(asDev.status).toBe(403);

    await createProject(owner.cookie, "Checkout");
    const dup = await api(t.app, "POST", `/api/orgs/${orgId}/projects`, {
      cookie: owner.cookie,
      body: { name: "Checkout" },
    });
    expect(dup.status).toBe(409);

    const list = await api(t.app, "GET", `/api/orgs/${orgId}/projects`, {
      cookie: viewer.cookie,
    });
    expect(list.status).toBe(200);
    expect((await list.json()) as unknown[]).toHaveLength(1);
  });

  it("never resolves another organization's project through this org's path", async () => {
    const stranger = await signUpUser(t, "stranger@example.com", "Stranger");
    const otherOrg = await createOrgViaApi(t, stranger.cookie, "Other Org");
    const foreign = await api(t.app, "POST", `/api/orgs/${otherOrg.id}/projects`, {
      cookie: stranger.cookie,
      body: { name: "Foreign" },
    });
    const foreignProject = (await foreign.json()) as { id: string };

    const crossRead = await api(t.app, "GET", `/api/orgs/${orgId}/projects/${foreignProject.id}`, {
      cookie: owner.cookie,
    });
    expect(crossRead.status).toBe(404);
  });

  it("renames (ADMIN) and deletes (ADMIN) with tenant-safe 404s", async () => {
    const project = await createProject(owner.cookie, "Renamable");
    const rename = await api(t.app, "PATCH", `/api/orgs/${orgId}/projects/${project.id}`, {
      cookie: owner.cookie,
      body: { name: "Renamed" },
    });
    expect(rename.status).toBe(200);

    const devDelete = await api(t.app, "DELETE", `/api/orgs/${orgId}/projects/${project.id}`, {
      cookie: developer.cookie,
    });
    expect(devDelete.status).toBe(403);

    const ownerDelete = await api(t.app, "DELETE", `/api/orgs/${orgId}/projects/${project.id}`, {
      cookie: owner.cookie,
    });
    expect(ownerDelete.status).toBe(204);
  });
});

describe("environments", () => {
  it("lets DEVELOPER+ manage environments and VIEWER read them", async () => {
    const project = await createProject(owner.cookie, "Env Project");
    const base = `/api/orgs/${orgId}/projects/${project.id}/environments`;

    const asViewer = await api(t.app, "POST", base, {
      cookie: viewer.cookie,
      body: { name: "production" },
    });
    expect(asViewer.status).toBe(403);

    const created = await api(t.app, "POST", base, {
      cookie: developer.cookie,
      body: { name: "production" },
    });
    expect(created.status).toBe(201);
    const env = (await created.json()) as { id: string };

    const dup = await api(t.app, "POST", base, {
      cookie: developer.cookie,
      body: { name: "production" },
    });
    expect(dup.status).toBe(409);

    const badName = await api(t.app, "POST", base, {
      cookie: developer.cookie,
      body: { name: "Not Valid!" },
    });
    expect(badName.status).toBe(400);

    const list = await api(t.app, "GET", base, { cookie: viewer.cookie });
    expect((await list.json()) as unknown[]).toHaveLength(1);

    const deleted = await api(t.app, "DELETE", `${base}/${env.id}`, {
      cookie: developer.cookie,
    });
    expect(deleted.status).toBe(204);

    const again = await api(t.app, "DELETE", `${base}/${env.id}`, {
      cookie: developer.cookie,
    });
    expect(again.status).toBe(404);
  });
});

describe("services", () => {
  it("validates criticality against the closed set and defaults to MEDIUM", async () => {
    const project = await createProject(owner.cookie, "Svc Project");
    const base = `/api/orgs/${orgId}/projects/${project.id}/services`;

    const invalid = await api(t.app, "POST", base, {
      cookie: developer.cookie,
      body: { name: "shady", criticality: "EXTREME" },
    });
    expect(invalid.status).toBe(400);

    const critical = await api(t.app, "POST", base, {
      cookie: developer.cookie,
      body: { name: "payments", criticality: "CRITICAL" },
    });
    expect(critical.status).toBe(201);
    expect(((await critical.json()) as { criticality: string }).criticality).toBe("CRITICAL");

    const defaulted = await api(t.app, "POST", base, {
      cookie: developer.cookie,
      body: { name: "api" },
    });
    expect(((await defaulted.json()) as { criticality: string }).criticality).toBe("MEDIUM");
  });

  it("updates and deletes at DEVELOPER+, rejects empty patches", async () => {
    const project = await createProject(owner.cookie, "Patch Project");
    const base = `/api/orgs/${orgId}/projects/${project.id}/services`;
    const created = await api(t.app, "POST", base, {
      cookie: developer.cookie,
      body: { name: "worker" },
    });
    const service = (await created.json()) as { id: string };

    const empty = await api(t.app, "PATCH", `${base}/${service.id}`, {
      cookie: developer.cookie,
      body: {},
    });
    expect(empty.status).toBe(400);

    const escalated = await api(t.app, "PATCH", `${base}/${service.id}`, {
      cookie: developer.cookie,
      body: { criticality: "HIGH" },
    });
    expect(escalated.status).toBe(200);
    expect(((await escalated.json()) as { criticality: string }).criticality).toBe("HIGH");

    const asViewer = await api(t.app, "DELETE", `${base}/${service.id}`, {
      cookie: viewer.cookie,
    });
    expect(asViewer.status).toBe(403);

    const deleted = await api(t.app, "DELETE", `${base}/${service.id}`, {
      cookie: developer.cookie,
    });
    expect(deleted.status).toBe(204);
  });
});
