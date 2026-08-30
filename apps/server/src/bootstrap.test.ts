import { afterEach, describe, expect, it } from "vitest";
import { type BootstrappedServer, createServerFromEnv } from "./bootstrap";
import type { ServerEnv } from "./env";
import { silentLogger } from "./test-helpers";

/**
 * Regression coverage for the env→dependencies wiring itself (a trusted
 * origin once reached the identity engine but not the management API's
 * origin guard). No database is needed: the origin guard runs before any
 * authentication or database work, so a guard PASS surfaces as 401
 * (unauthenticated) while a guard REJECT surfaces as 403.
 */

const ENV: ServerEnv = {
  databaseUrl: "postgres://unused:unused@localhost:65000/unused",
  authSecret: "test-secret-at-least-32-characters-long!!",
  baseUrl: "http://localhost:3000",
  port: 3000,
  trustedOrigins: ["https://console.example.test"],
};

let server: BootstrappedServer;

afterEach(async () => {
  await server.close();
});

async function patchOrgFrom(origin: string): Promise<Response> {
  return server.app.request(`/api/orgs/${crypto.randomUUID()}`, {
    method: "PATCH",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Renamed" }),
  });
}

describe("createServerFromEnv wiring", () => {
  it("forwards configured trusted origins to the management API origin guard", async () => {
    server = createServerFromEnv(ENV, silentLogger);
    // Guard passed → the request proceeds to authentication and fails 401.
    expect((await patchOrgFrom("https://console.example.test")).status).toBe(401);
    expect((await patchOrgFrom(ENV.baseUrl)).status).toBe(401);
    // Guard rejected → 403 before any auth/database work.
    expect((await patchOrgFrom("https://evil.example")).status).toBe(403);
  });

  it("trusts only the base URL when no extra origins are configured", async () => {
    server = createServerFromEnv({ ...ENV, trustedOrigins: [] }, silentLogger);
    expect((await patchOrgFrom(ENV.baseUrl)).status).toBe(401);
    expect((await patchOrgFrom("https://console.example.test")).status).toBe(403);
  });
});
