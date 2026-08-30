import * as schema from "@rivet/database";
import { createTestDatabase, type TestDatabaseHandle } from "@rivet/database/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuth, type RivetAuth } from "./auth";
import { ForbiddenError, requireOrgRole, requireSession, UnauthenticatedError } from "./guards";

const BASE = "http://localhost:3000";

let handle: TestDatabaseHandle;
let auth: RivetAuth;
let orgId: string;

async function signUpAndGetCookie(email: string, name: string): Promise<string> {
  const res = await auth.handler(
    new Request(`${BASE}/api/auth/sign-up/email`, {
      method: "POST",
      headers: new Headers({ "Content-Type": "application/json", Origin: BASE }),
      body: JSON.stringify({ email, password: "correct-horse-battery", name }),
    }),
  );
  expect(res.status).toBe(200);
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function userIdByEmail(email: string): Promise<string> {
  const [user] = await handle.db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email));
  if (!user) throw new Error(`user ${email} not found`);
  return user.id;
}

function headersWithCookie(cookie?: string): Headers {
  const headers = new Headers();
  if (cookie) headers.set("Cookie", cookie);
  return headers;
}

beforeEach(async () => {
  handle = await createTestDatabase();
  auth = createAuth({
    db: handle.db,
    secret: "test-secret-at-least-32-characters-long!!",
    baseURL: BASE,
  });
  const [org] = await handle.db
    .insert(schema.organizations)
    .values({ name: "Guard Org", slug: "guard-org" })
    .returning();
  if (!org) throw new Error("org insert failed");
  orgId = org.id;
});

afterEach(async () => {
  await handle.close();
});

describe("requireSession", () => {
  it("returns the session for a valid cookie and rejects its absence", async () => {
    const cookie = await signUpAndGetCookie("owner@example.com", "Owner");
    const session = await requireSession(auth, headersWithCookie(cookie));
    expect(session.user.email).toBe("owner@example.com");

    await expect(requireSession(auth, headersWithCookie())).rejects.toThrow(UnauthenticatedError);
  });
});

describe("requireOrgRole", () => {
  it("enforces the role hierarchy from Rivet memberships — not from the identity engine", async () => {
    const ownerCookie = await signUpAndGetCookie("owner@example.com", "Owner");
    const viewerCookie = await signUpAndGetCookie("viewer@example.com", "Viewer");
    await signUpAndGetCookie("outsider@example.com", "Outsider");

    await handle.db.insert(schema.memberships).values([
      { orgId, userId: await userIdByEmail("owner@example.com"), role: "OWNER" },
      { orgId, userId: await userIdByEmail("viewer@example.com"), role: "VIEWER" },
    ]);

    // OWNER outranks every requirement.
    const asOwner = await requireOrgRole(
      auth,
      handle.db,
      headersWithCookie(ownerCookie),
      orgId,
      "ADMIN",
    );
    expect(asOwner.role).toBe("OWNER");
    expect(asOwner.session.user.email).toBe("owner@example.com");

    // VIEWER meets VIEWER…
    const asViewer = await requireOrgRole(
      auth,
      handle.db,
      headersWithCookie(viewerCookie),
      orgId,
      "VIEWER",
    );
    expect(asViewer.role).toBe("VIEWER");

    // …but not DEVELOPER.
    await expect(
      requireOrgRole(auth, handle.db, headersWithCookie(viewerCookie), orgId, "DEVELOPER"),
    ).rejects.toThrow(ForbiddenError);
    await expect(
      requireOrgRole(auth, handle.db, headersWithCookie(viewerCookie), orgId, "DEVELOPER"),
    ).rejects.toThrow(/Requires the DEVELOPER role/);
  });

  it("rejects authenticated non-members and unauthenticated callers", async () => {
    const outsiderCookie = await signUpAndGetCookie("outsider@example.com", "Outsider");

    await expect(
      requireOrgRole(auth, handle.db, headersWithCookie(outsiderCookie), orgId, "VIEWER"),
    ).rejects.toThrow(/Not a member/);

    await expect(
      requireOrgRole(auth, handle.db, headersWithCookie(), orgId, "VIEWER"),
    ).rejects.toThrow(UnauthenticatedError);
  });

  it("scopes membership to the exact organization", async () => {
    const cookie = await signUpAndGetCookie("owner@example.com", "Owner");
    await handle.db
      .insert(schema.memberships)
      .values([{ orgId, userId: await userIdByEmail("owner@example.com"), role: "OWNER" }]);
    const [otherOrg] = await handle.db
      .insert(schema.organizations)
      .values({ name: "Other Org", slug: "other-org" })
      .returning();
    if (!otherOrg) throw new Error("org insert failed");

    await expect(
      requireOrgRole(auth, handle.db, headersWithCookie(cookie), otherOrg.id, "VIEWER"),
    ).rejects.toThrow(/Not a member/);
  });
});
