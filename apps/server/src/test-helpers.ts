import { createAuth, type RivetAuth } from "@rivet/auth";
import { schema } from "@rivet/database";
import { createTestDatabase, type TestDatabaseHandle } from "@rivet/database/testing";
import type { OrgRole } from "@rivet/types";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { expect } from "vitest";
import { createApp } from "./app";
import type { Logger } from "./logging";
import type { AppEnv } from "./routes/shared";

export const BASE = "http://localhost:3000";

export const silentLogger: Logger = { info: () => {}, error: () => {} };

export interface TestApp {
  app: Hono<AppEnv>;
  handle: TestDatabaseHandle;
  auth: RivetAuth;
}

export async function buildTestApp(trustedOrigins: string[] = []): Promise<TestApp> {
  const handle = await createTestDatabase();
  const auth = createAuth({
    db: handle.db,
    secret: "test-secret-at-least-32-characters-long!!",
    baseURL: BASE,
    trustedOrigins,
  });
  const app = createApp({
    db: handle.db,
    auth,
    baseUrl: BASE,
    trustedOrigins,
    logger: silentLogger,
  });
  return { app, handle, auth };
}

export interface ApiCallOptions {
  cookie?: string;
  body?: unknown;
  /** Origin header; explicit null omits it (non-browser client). */
  origin?: string | null;
}

export async function api(
  app: Hono<AppEnv>,
  method: string,
  path: string,
  options: ApiCallOptions = {},
): Promise<Response> {
  const headers = new Headers();
  if (options.origin !== null) headers.set("Origin", options.origin ?? BASE);
  if (options.cookie) headers.set("Cookie", options.cookie);
  const init: RequestInit = { method, headers };
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(options.body);
  }
  return app.request(path, init);
}

export interface TestUser {
  cookie: string;
  userId: string;
  email: string;
}

export async function signUpUser(t: TestApp, email: string, name: string): Promise<TestUser> {
  const res = await api(t.app, "POST", "/api/auth/sign-up/email", {
    body: { email, password: "correct-horse-battery", name },
  });
  expect(res.status).toBe(200);
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const [user] = await t.handle.db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()));
  if (!user) throw new Error(`signup did not create user ${email}`);
  return { cookie, userId: user.id, email };
}

export async function createOrgViaApi(
  t: TestApp,
  cookie: string,
  name: string,
): Promise<{ id: string; slug: string }> {
  const res = await api(t.app, "POST", "/api/orgs", { cookie, body: { name } });
  expect(res.status).toBe(201);
  return (await res.json()) as { id: string; slug: string };
}

export async function addMembership(
  t: TestApp,
  orgId: string,
  userId: string,
  role: OrgRole,
): Promise<void> {
  await t.handle.db.insert(schema.memberships).values({ orgId, userId, role });
}
