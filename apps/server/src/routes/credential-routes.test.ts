import { schema } from "@rivet/database";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashApiKey } from "../credentials";
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
let orgId: string;
let projectId: string;

beforeEach(async () => {
  t = await buildTestApp();
  owner = await signUpUser(t, "owner@example.com", "Owner");
  developer = await signUpUser(t, "dev@example.com", "Dev");
  const org = await createOrgViaApi(t, owner.cookie, "Cred Org");
  orgId = org.id;
  await addMembership(t, orgId, developer.userId, "DEVELOPER");
  const res = await api(t.app, "POST", `/api/orgs/${orgId}/projects`, {
    cookie: owner.cookie,
    body: { name: "Cred Project" },
  });
  projectId = ((await res.json()) as { id: string }).id;
});

afterEach(async () => {
  await t.handle.close();
});

describe("API keys", () => {
  it("issues the full key exactly once and stores only its hash", async () => {
    const res = await api(t.app, "POST", `/api/orgs/${orgId}/api-keys`, {
      cookie: owner.cookie,
      body: { name: "ci" },
    });
    expect(res.status).toBe(201);
    const { key, apiKey } = (await res.json()) as {
      key: string;
      apiKey: Record<string, unknown>;
    };
    expect(key).toMatch(/^rvk_[0-9a-f]{40}$/);
    expect(apiKey.keyPrefix).toBe(key.slice(0, 12));
    expect(apiKey).not.toHaveProperty("keyHash");

    const [row] = await t.handle.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.orgId, orgId));
    expect(row?.keyHash).toBe(hashApiKey(key));
    expect(row?.keyHash).not.toBe(key);
    expect(row?.createdByUserId).toBe(owner.userId);
  });

  it("gates every key operation to ADMIN+ and never lists key material", async () => {
    const asDev = await api(t.app, "POST", `/api/orgs/${orgId}/api-keys`, {
      cookie: developer.cookie,
      body: { name: "nope" },
    });
    expect(asDev.status).toBe(403);

    await api(t.app, "POST", `/api/orgs/${orgId}/api-keys`, {
      cookie: owner.cookie,
      body: { name: "ci" },
    });
    const devList = await api(t.app, "GET", `/api/orgs/${orgId}/api-keys`, {
      cookie: developer.cookie,
    });
    expect(devList.status).toBe(403);

    const list = await api(t.app, "GET", `/api/orgs/${orgId}/api-keys`, {
      cookie: owner.cookie,
    });
    const keys = (await list.json()) as Array<Record<string, unknown>>;
    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toHaveProperty("keyHash");
    expect(keys[0]).not.toHaveProperty("key");
  });

  it("scopes project-bound keys to the org's own projects", async () => {
    const stranger = await signUpUser(t, "stranger@example.com", "Stranger");
    const otherOrg = await createOrgViaApi(t, stranger.cookie, "Other Org");
    const foreign = await api(t.app, "POST", `/api/orgs/${otherOrg.id}/projects`, {
      cookie: stranger.cookie,
      body: { name: "Foreign" },
    });
    const foreignProject = ((await foreign.json()) as { id: string }).id;

    const crossTenant = await api(t.app, "POST", `/api/orgs/${orgId}/api-keys`, {
      cookie: owner.cookie,
      body: { name: "cross", projectId: foreignProject },
    });
    expect(crossTenant.status).toBe(404);

    const scoped = await api(t.app, "POST", `/api/orgs/${orgId}/api-keys`, {
      cookie: owner.cookie,
      body: { name: "scoped", projectId },
    });
    expect(scoped.status).toBe(201);
  });

  it("revokes idempotently, preserving the first revocation timestamp", async () => {
    const created = await api(t.app, "POST", `/api/orgs/${orgId}/api-keys`, {
      cookie: owner.cookie,
      body: { name: "doomed" },
    });
    const keyId = ((await created.json()) as { apiKey: { id: string } }).apiKey.id;

    const first = await api(t.app, "DELETE", `/api/orgs/${orgId}/api-keys/${keyId}`, {
      cookie: owner.cookie,
    });
    expect(first.status).toBe(204);
    const [afterFirst] = await t.handle.db
      .select({ revokedAt: schema.apiKeys.revokedAt })
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.id, keyId));
    expect(afterFirst?.revokedAt).toBeInstanceOf(Date);

    const second = await api(t.app, "DELETE", `/api/orgs/${orgId}/api-keys/${keyId}`, {
      cookie: owner.cookie,
    });
    expect(second.status).toBe(204);
    const [afterSecond] = await t.handle.db
      .select({ revokedAt: schema.apiKeys.revokedAt })
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.id, keyId));
    expect(afterSecond?.revokedAt?.getTime()).toBe(afterFirst?.revokedAt?.getTime());

    const missing = await api(
      t.app,
      "DELETE",
      `/api/orgs/${orgId}/api-keys/${crypto.randomUUID()}`,
      {
        cookie: owner.cookie,
      },
    );
    expect(missing.status).toBe(404);
  });
});

describe("DSNs", () => {
  it("issues project-bound DSNs with a rendered DSN URL (ADMIN+), lists at DEVELOPER+", async () => {
    const asDev = await api(t.app, "POST", `/api/orgs/${orgId}/projects/${projectId}/dsns`, {
      cookie: developer.cookie,
      body: { label: "SDK" },
    });
    expect(asDev.status).toBe(403);

    const created = await api(t.app, "POST", `/api/orgs/${orgId}/projects/${projectId}/dsns`, {
      cookie: owner.cookie,
      body: { label: "SDK" },
    });
    expect(created.status).toBe(201);
    const dsn = (await created.json()) as { publicKey: string; dsn: string };
    expect(dsn.publicKey).toMatch(/^[0-9a-f]{32}$/);
    expect(dsn.dsn).toBe(`http://${dsn.publicKey}@localhost:3000/${projectId}`);

    const list = await api(t.app, "GET", `/api/orgs/${orgId}/projects/${projectId}/dsns`, {
      cookie: developer.cookie,
    });
    expect(list.status).toBe(200);
    const rows = (await list.json()) as Array<{ dsn: string }>;
    expect(rows[0]?.dsn).toContain("@localhost:3000/");
  });

  it("revokes with tenant-safe 404s", async () => {
    const created = await api(t.app, "POST", `/api/orgs/${orgId}/projects/${projectId}/dsns`, {
      cookie: owner.cookie,
      body: {},
    });
    const dsnId = ((await created.json()) as { id: string }).id;

    const revoked = await api(
      t.app,
      "DELETE",
      `/api/orgs/${orgId}/projects/${projectId}/dsns/${dsnId}`,
      { cookie: owner.cookie },
    );
    expect(revoked.status).toBe(204);
    const [row] = await t.handle.db
      .select({ revokedAt: schema.dsns.revokedAt })
      .from(schema.dsns)
      .where(eq(schema.dsns.id, dsnId));
    expect(row?.revokedAt).toBeInstanceOf(Date);

    const missing = await api(
      t.app,
      "DELETE",
      `/api/orgs/${orgId}/projects/${projectId}/dsns/${crypto.randomUUID()}`,
      { cookie: owner.cookie },
    );
    expect(missing.status).toBe(404);
  });
});
