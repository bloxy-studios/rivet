import { schema } from "@rivet/database";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { generateApiKey } from "../credentials";
import { HttpError, parseJsonBody } from "../errors";
import {
  type AppDeps,
  type AppEnv,
  nameSchema,
  orgRole,
  paramUuid,
  requireProjectInOrg,
} from "./shared";

const createKeySchema = z.object({
  name: nameSchema,
  /** Optional project scoping; omitted means org-wide. */
  projectId: z.uuid().optional(),
});

/** Everything except key_hash — the hash never leaves the database layer. */
const publicKeyColumns = {
  id: schema.apiKeys.id,
  orgId: schema.apiKeys.orgId,
  projectId: schema.apiKeys.projectId,
  name: schema.apiKeys.name,
  keyPrefix: schema.apiKeys.keyPrefix,
  scopes: schema.apiKeys.scopes,
  createdByUserId: schema.apiKeys.createdByUserId,
  createdAt: schema.apiKeys.createdAt,
  lastUsedAt: schema.apiKeys.lastUsedAt,
  revokedAt: schema.apiKeys.revokedAt,
};

/**
 * Role matrix: ADMIN+ for everything — API keys are credentials.
 * The full key material is returned exactly once, from creation; only its
 * SHA-256 hash is stored (storage invariant from @rivet/database).
 * Revocation is a timestamp, preserving the audit trail.
 */
export function apiKeysRoutes(deps: AppDeps): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.post("/", orgRole(deps, "ADMIN"), async (c) => {
    const access = c.get("access");
    const body = await parseJsonBody(c, createKeySchema);
    if (body.projectId) await requireProjectInOrg(deps.db, access.orgId, body.projectId);

    const generated = generateApiKey();
    const [row] = await deps.db
      .insert(schema.apiKeys)
      .values({
        orgId: access.orgId,
        projectId: body.projectId ?? null,
        name: body.name,
        keyHash: generated.keyHash,
        keyPrefix: generated.keyPrefix,
        createdByUserId: access.session.user.id,
      })
      .returning(publicKeyColumns);

    // `key` is shown exactly once; it is not stored and cannot be retrieved.
    return c.json({ key: generated.key, apiKey: row }, 201);
  });

  router.get("/", orgRole(deps, "ADMIN"), async (c) => {
    const access = c.get("access");
    const keys = await deps.db
      .select(publicKeyColumns)
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.orgId, access.orgId))
      .orderBy(schema.apiKeys.createdAt);
    return c.json(keys);
  });

  router.delete("/:keyId", orgRole(deps, "ADMIN"), async (c) => {
    const access = c.get("access");
    const keyId = paramUuid(c, "keyId", "API key");
    // Idempotent revocation preserving the original timestamp.
    const [row] = await deps.db
      .update(schema.apiKeys)
      .set({ revokedAt: sql`COALESCE(${schema.apiKeys.revokedAt}, now())` })
      .where(and(eq(schema.apiKeys.id, keyId), eq(schema.apiKeys.orgId, access.orgId)))
      .returning({ id: schema.apiKeys.id });
    if (!row) throw new HttpError(404, "API key not found.");
    return c.body(null, 204);
  });

  return router;
}
