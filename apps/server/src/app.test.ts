import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api, buildTestApp, createOrgViaApi, signUpUser, type TestApp } from "./test-helpers";

let t: TestApp;

beforeEach(async () => {
  t = await buildTestApp();
});

afterEach(async () => {
  await t.handle.close();
});

describe("health", () => {
  it("reports liveness and attaches a request id", async () => {
    const res = await api(t.app, "GET", "/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(res.headers.get("x-request-id")).toMatch(/[0-9a-f-]{36}/);
  });

  it("reports readiness while the database is reachable, 503 after it is not", async () => {
    const ready = await api(t.app, "GET", "/readyz");
    expect(ready.status).toBe(200);

    await t.handle.close();
    const gone = await api(t.app, "GET", "/readyz");
    expect(gone.status).toBe(503);
    expect(((await gone.json()) as { status: string }).status).toBe("unavailable");
    // afterEach close() tolerated: PGlite close is idempotent via our handle.
    t = await buildTestApp();
  });
});

describe("identity engine mount", () => {
  it("serves /api/auth/* through the app", async () => {
    const user = await signUpUser(t, "mounted@example.com", "Mounted");
    expect(user.cookie).toContain("session_token");

    const session = await api(t.app, "GET", "/api/auth/get-session", { cookie: user.cookie });
    expect(session.status).toBe(200);
    expect(((await session.json()) as { user: { email: string } }).user.email).toBe(
      "mounted@example.com",
    );
  });
});

describe("api surface basics", () => {
  it("returns JSON 404 for unknown routes", async () => {
    const res = await api(t.app, "GET", "/api/nope");
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { message: string } }).error.message).toBe("Not found.");
  });

  it("rejects unauthenticated access to the management API", async () => {
    const res = await api(t.app, "GET", "/api/orgs");
    expect(res.status).toBe(401);
  });

  it("serves the OpenAPI stub with implemented paths", async () => {
    const res = await api(t.app, "GET", "/api/openapi.json");
    expect(res.status).toBe(200);
    const spec = (await res.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.paths["/api/orgs"]).toBeDefined();
    expect(spec.paths["/api/orgs/{orgId}/projects/{projectId}/dsns"]).toBeDefined();
  });
});

describe("origin guard for the management API", () => {
  it("rejects cookie-bearing mutations from untrusted origins, allows non-browser clients", async () => {
    const user = await signUpUser(t, "guarded@example.com", "Guarded");
    const org = await createOrgViaApi(t, user.cookie, "Guarded Org");

    const forged = await api(t.app, "PATCH", `/api/orgs/${org.id}`, {
      cookie: user.cookie,
      body: { name: "Hijacked" },
      origin: "https://evil.example",
    });
    expect(forged.status).toBe(403);

    // No Origin header = non-browser client (CLI, server-to-server): allowed.
    const cli = await api(t.app, "PATCH", `/api/orgs/${org.id}`, {
      cookie: user.cookie,
      body: { name: "Renamed by CLI" },
      origin: null,
    });
    expect(cli.status).toBe(200);
  });

  it("allows explicitly trusted extra origins", async () => {
    await t.handle.close();
    t = await buildTestApp(["https://app.example.com"]);
    const user = await signUpUser(t, "trusted@example.com", "Trusted");
    const org = await createOrgViaApi(t, user.cookie, "Trusted Org");

    const res = await api(t.app, "PATCH", `/api/orgs/${org.id}`, {
      cookie: user.cookie,
      body: { name: "Renamed" },
      origin: "https://app.example.com",
    });
    expect(res.status).toBe(200);
  });
});
