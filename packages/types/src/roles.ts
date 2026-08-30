/**
 * Organization membership roles, ordered from most to least privileged.
 * Authorization semantics (what each role may do) are enforced by the
 * platform's permission layer as it lands; the closed set itself is fixed
 * here so every plane (database constraints, API, UI) shares one source
 * of truth.
 */
export const ORG_ROLES = ["OWNER", "ADMIN", "DEVELOPER", "VIEWER"] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

const ORG_ROLE_RANK: Readonly<Record<OrgRole, number>> = {
  OWNER: 0,
  ADMIN: 1,
  DEVELOPER: 2,
  VIEWER: 3,
};

/** True when `role` grants at least the privileges of `atLeast`. */
export function roleMeets(role: OrgRole, atLeast: OrgRole): boolean {
  return ORG_ROLE_RANK[role] <= ORG_ROLE_RANK[atLeast];
}

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === "string" && (ORG_ROLES as readonly string[]).includes(value);
}
