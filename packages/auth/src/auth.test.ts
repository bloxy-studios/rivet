import * as schema from "@rivet/database";
import { createTestDatabase, type TestDatabaseHandle } from "@rivet/database/testing";
import { count, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuth, type RivetAuth } from "./auth";

const BASE = "http://localhost:3000";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let handle: TestDatabaseHandle;
let auth: RivetAuth;

beforeEach(async () => {
  handle = await createTestDatabase();
  auth = createAuth({
    db: handle.db,
    secret: "test-secret-at-least-32-characters-long!!",
    baseURL: BASE,
  });
});

afterEach(async () => {
  await handle.close();
});

interface CallOptions {
  method?: string;
  body?: unknown;
  cookie?: string;
  origin?: string;
}

async function call(path: string, options: CallOptions = {}): Promise<Response> {
  const headers = new Headers();
  headers.set("Origin", options.origin ?? BASE);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.cookie) headers.set("Cookie", options.cookie);
  const init: RequestInit = { method: options.method ?? "POST", headers };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  return auth.handler(new Request(`${BASE}/api/auth${path}`, init));
}

function cookieOf(res: Response): string {
  const setCookies = res.headers.getSetCookie();
  expect(setCookies.length).toBeGreaterThan(0);
  return setCookies.map((c) => c.split(";")[0]).join("; ");
}

const SIGNUP = { email: "ada@example.com", password: "correct-horse-battery", name: "Ada" };

async function signUp(): Promise<string> {
  const res = await call("/sign-up/email", { body: SIGNUP });
  expect(res.status).toBe(200);
  return cookieOf(res);
}

describe("signup", () => {
  it("creates a user, a credential account with a scrypt hash, and a session", async () => {
    const cookie = await signUp();
    expect(cookie).toContain("session_token");

    const [user] = await handle.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "ada@example.com"));
    expect(user).toBeDefined();
    expect(user?.id).toMatch(UUID_RE);
    expect(user?.name).toBe("Ada");
    expect(user?.emailVerified).toBe(false);

    const [account] = await handle.db.select().from(schema.accounts);
    expect(account?.providerId).toBe("credential");
    // Never plaintext: scrypt output is salt:hex, far longer than any password.
    expect(account?.password).not.toContain(SIGNUP.password);
    expect(account?.password?.length ?? 0).toBeGreaterThan(64);
    expect(account?.password).toContain(":");

    const sessions = await handle.db.select({ n: count() }).from(schema.sessions);
    expect(sessions[0]?.n).toBe(1);
  });
});

describe("login and logout", () => {
  it("rejects wrong passwords and accepts the right one", async () => {
    await signUp();
    const bad = await call("/sign-in/email", {
      body: { email: SIGNUP.email, password: "wrong-password" },
    });
    expect(bad.status).toBe(401);

    const good = await call("/sign-in/email", {
      body: { email: SIGNUP.email, password: SIGNUP.password },
    });
    expect(good.status).toBe(200);
    expect(cookieOf(good)).toContain("session_token");
  });

  it("issues a distinct session per login and revokes on sign-out", async () => {
    await signUp();
    const first = await call("/sign-in/email", {
      body: { email: SIGNUP.email, password: SIGNUP.password },
    });
    const second = await call("/sign-in/email", {
      body: { email: SIGNUP.email, password: SIGNUP.password },
    });
    const c1 = cookieOf(first);
    const c2 = cookieOf(second);
    expect(c1).not.toBe(c2); // no fixed/reused session token across logins

    const tokens = await handle.db.select({ token: schema.sessions.token }).from(schema.sessions);
    expect(new Set(tokens.map((t) => t.token)).size).toBe(tokens.length);

    const out = await call("/sign-out", { cookie: c2, body: {} });
    expect(out.status).toBe(200);

    const after = await call("/get-session", { method: "GET", cookie: c2 });
    const data = (await after.json()) as { user?: unknown } | null;
    expect(data?.user ?? null).toBeNull();
  });
});

describe("sessions", () => {
  it("resolves the session for a valid cookie and extends into the future", async () => {
    const cookie = await signUp();
    const res = await call("/get-session", { method: "GET", cookie });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      user: { email: string; id: string };
      session: { expiresAt: string; token: string };
    };
    expect(data.user.email).toBe("ada@example.com");
    expect(data.user.id).toMatch(UUID_RE);
    expect(new Date(data.session.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("resolves nothing without a cookie", async () => {
    const res = await call("/get-session", { method: "GET" });
    const data = (await res.json()) as { user?: unknown } | null;
    expect(data?.user ?? null).toBeNull();
  });
});

describe("CSRF protection", () => {
  it("rejects authenticated state-changing requests from untrusted origins", async () => {
    // The classic CSRF vector: a cross-site page triggering an action with
    // the victim's ambient session cookie.
    const cookie = await signUp();
    const forged = await call("/sign-out", {
      body: {},
      cookie,
      origin: "https://evil.example",
    });
    expect(forged.status).toBe(403);
    expect(((await forged.json()) as { code?: string }).code).toBe("INVALID_ORIGIN");

    // The forged request must not have revoked anything.
    const still = await call("/get-session", { method: "GET", cookie });
    const data = (await still.json()) as { user?: { email?: string } } | null;
    expect(data?.user?.email).toBe(SIGNUP.email);
  });

  it("rejects login CSRF identified by cross-site fetch metadata", async () => {
    // First-login scenario (no cookies yet): browsers advertise the caller
    // via Sec-Fetch-Site; cross-site attempts are rejected.
    await signUp();
    const headers = new Headers({
      "Content-Type": "application/json",
      Origin: "https://evil.example",
      "Sec-Fetch-Site": "cross-site",
    });
    const res = await auth.handler(
      new Request(`${BASE}/api/auth/sign-in/email`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email: SIGNUP.email, password: SIGNUP.password }),
      }),
    );
    expect(res.status).toBe(403);
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it("accepts explicitly trusted extra origins", async () => {
    const trusted = createAuth({
      db: handle.db,
      secret: "test-secret-at-least-32-characters-long!!",
      baseURL: BASE,
      trustedOrigins: ["https://app.example.com"],
    });
    const res = await trusted.handler(
      new Request(`${BASE}/api/auth/sign-up/email`, {
        method: "POST",
        headers: new Headers({
          "Content-Type": "application/json",
          Origin: "https://app.example.com",
        }),
        body: JSON.stringify({ email: "ok@example.com", password: "long-enough-pass", name: "Ok" }),
      }),
    );
    expect(res.status).toBe(200);
  });
});
