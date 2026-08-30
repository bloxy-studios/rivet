import { type AuthDatabase, type RivetAuth, requireOrgRole } from "@rivet/auth";
import { schema } from "@rivet/database";
import { and, eq } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import { z } from "zod";
import { HttpError } from "../errors";
import type { Logger } from "../logging";
import type { OrgAccess, OrgRole } from "./types";

export interface AppDeps {
  db: AuthDatabase;
  auth: RivetAuth;
  logger: Logger;
  baseUrl: string;
}

export type AppEnv = { Variables: { access: OrgAccess } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads a uuid path parameter; a malformed id is indistinguishable from a
 * missing resource (404) so ids never leak validation detail.
 */
export function paramUuid(c: Context, name: string, resource: string): string {
  const value = c.req.param(name);
  if (!value || !UUID_RE.test(value)) throw new HttpError(404, `${resource} not found.`);
  return value.toLowerCase();
}

/**
 * Role middleware: authenticates the caller and authorizes them against
 * Rivet memberships for the `:orgId` in the path (ADR-0007 — the identity
 * engine never decides access). Stores the access grant on the context.
 */
export function orgRole(deps: AppDeps, atLeast: OrgRole): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const orgId = paramUuid(c, "orgId", "Organization");
    const access = await requireOrgRole(deps.auth, deps.db, c.req.raw.headers, orgId, atLeast);
    c.set("access", access);
    await next();
  };
}

/**
 * Tenant-safe project lookup: the WHERE clause carries both ids, so a
 * project belonging to another organization is simply "not found".
 */
export async function requireProjectInOrg(
  db: AuthDatabase,
  orgId: string,
  projectId: string,
): Promise<typeof schema.projects.$inferSelect> {
  const rows = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), eq(schema.projects.orgId, orgId)))
    .limit(1);
  const project = rows[0];
  if (!project) throw new HttpError(404, "Project not found.");
  return project;
}

/** URL-safe, human-readable identifier: lowercase alphanumerics and hyphens. */
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export const nameSchema = z.string().trim().min(1).max(200);
export const slugSchema = z.string().regex(SLUG_RE, {
  message: "must be 1-64 chars of lowercase letters, digits, and inner hyphens",
});

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
}

/** Derives a slug from an explicit value or the display name; 422 when impossible. */
export function resolveSlug(explicit: string | undefined, name: string): string {
  if (explicit !== undefined) return explicit;
  const derived = slugify(name);
  if (!SLUG_RE.test(derived)) {
    throw new HttpError(422, "Could not derive a slug from the name; provide one explicitly.");
  }
  return derived;
}
