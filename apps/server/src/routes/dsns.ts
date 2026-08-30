import { schema } from "@rivet/database";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { formatDsn, generateDsnPublicKey } from "../credentials";
import { HttpError, parseJsonBody } from "../errors";
import {
  type AppDeps,
  type AppEnv,
  nameSchema,
  orgRole,
  paramUuid,
  requireProjectInOrg,
} from "./shared";

const createDsnSchema = z.object({ label: nameSchema.optional() });

/**
 * Role matrix: create/revoke = ADMIN+ (credentials) · read = DEVELOPER+
 * (developers need DSNs to configure SDKs). DSN public keys authorize event
 * submission only (ADR-0004); the ingest endpoints that accept them land in
 * Phase 2 — the credential format is fixed now so issued DSNs stay valid.
 */
export function dsnsRoutes(deps: AppDeps): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  const withDsnUrl = (row: typeof schema.dsns.$inferSelect) => ({
    ...row,
    dsn: formatDsn(deps.baseUrl, row.publicKey, row.projectId),
  });

  router.post("/", orgRole(deps, "ADMIN"), async (c) => {
    const access = c.get("access");
    const projectId = paramUuid(c, "projectId", "Project");
    await requireProjectInOrg(deps.db, access.orgId, projectId);
    const body = await parseJsonBody(c, createDsnSchema);
    const [row] = await deps.db
      .insert(schema.dsns)
      .values({
        projectId,
        publicKey: generateDsnPublicKey(),
        label: body.label ?? null,
      })
      .returning();
    if (!row) throw new Error("dsn insert returned nothing");
    return c.json(withDsnUrl(row), 201);
  });

  router.get("/", orgRole(deps, "DEVELOPER"), async (c) => {
    const access = c.get("access");
    const projectId = paramUuid(c, "projectId", "Project");
    await requireProjectInOrg(deps.db, access.orgId, projectId);
    const rows = await deps.db
      .select()
      .from(schema.dsns)
      .where(eq(schema.dsns.projectId, projectId))
      .orderBy(schema.dsns.createdAt);
    return c.json(rows.map(withDsnUrl));
  });

  router.delete("/:dsnId", orgRole(deps, "ADMIN"), async (c) => {
    const access = c.get("access");
    const projectId = paramUuid(c, "projectId", "Project");
    const dsnId = paramUuid(c, "dsnId", "DSN");
    await requireProjectInOrg(deps.db, access.orgId, projectId);
    const [row] = await deps.db
      .update(schema.dsns)
      .set({ revokedAt: sql`COALESCE(${schema.dsns.revokedAt}, now())` })
      .where(and(eq(schema.dsns.id, dsnId), eq(schema.dsns.projectId, projectId)))
      .returning({ id: schema.dsns.id });
    if (!row) throw new HttpError(404, "DSN not found.");
    return c.body(null, 204);
  });

  return router;
}
