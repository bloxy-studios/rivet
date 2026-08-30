import { memberships } from "@rivet/database";
import { isOrgRole, type OrgRole, roleMeets } from "@rivet/types";
import { and, eq } from "drizzle-orm";
import type { AuthDatabase, AuthSession, RivetAuth } from "./auth";

/**
 * Framework-agnostic guard errors. HTTP layers map `status` onto responses;
 * nothing here assumes a specific server framework (that arrives in PR-3).
 */
export class UnauthenticatedError extends Error {
  readonly status = 401 as const;

  constructor() {
    super("Authentication required.");
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403 as const;

  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Resolves the session from request headers, or throws UnauthenticatedError. */
export async function requireSession(auth: RivetAuth, headers: Headers): Promise<AuthSession> {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new UnauthenticatedError();
  return session;
}

export interface OrgAccess {
  session: AuthSession;
  orgId: string;
  role: OrgRole;
}

/**
 * The authorization guard (ADR-0007): identity comes from the session, but
 * access comes exclusively from Rivet's `memberships` table. Grants access
 * only when the authenticated user is a member of `orgId` with a role at
 * least as privileged as `atLeast`.
 */
export async function requireOrgRole(
  auth: RivetAuth,
  db: AuthDatabase,
  headers: Headers,
  orgId: string,
  atLeast: OrgRole,
): Promise<OrgAccess> {
  const session = await requireSession(auth, headers);

  const rows = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, session.user.id)))
    .limit(1);
  const role = rows[0]?.role;

  if (role === undefined) {
    throw new ForbiddenError("Not a member of this organization.");
  }
  if (!isOrgRole(role)) {
    // Defense in depth: the CHECK constraint makes this unreachable, but a
    // corrupted row must fail closed, never open.
    throw new ForbiddenError("Membership role is invalid.");
  }
  if (!roleMeets(role, atLeast)) {
    throw new ForbiddenError(`Requires the ${atLeast} role or higher.`);
  }

  return { session, orgId, role };
}
