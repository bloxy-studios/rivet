import { requireSession } from "@rivet/auth";
import { schema } from "@rivet/database";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { HttpError, parseJsonBody } from "../errors";
import { apiKeysRoutes } from "./api-keys";
import { projectsRoutes } from "./projects";
import { type AppDeps, type AppEnv, nameSchema, orgRole, resolveSlug, slugSchema } from "./shared";

const createOrgSchema = z.object({ name: nameSchema, slug: slugSchema.optional() });
const patchOrgSchema = z.object({ name: nameSchema });

/**
 * Role matrix (documented in apps/server/README.md):
 * create = any authenticated user (becomes OWNER) · read = VIEWER+ ·
 * update = ADMIN+ · delete = OWNER. Slugs are immutable after creation.
 */
export function organizationsRoutes(deps: AppDeps): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.post("/", async (c) => {
    const session = await requireSession(deps.auth, c.req.raw.headers);
    const body = await parseJsonBody(c, createOrgSchema);
    const slug = resolveSlug(body.slug, body.name);

    const org = await deps.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.organizations)
        .values({ name: body.name, slug })
        .returning();
      if (!created) throw new Error("organization insert returned nothing");
      await tx
        .insert(schema.memberships)
        .values({ orgId: created.id, userId: session.user.id, role: "OWNER" });
      return created;
    });

    return c.json({ ...org, role: "OWNER" as const }, 201);
  });

  router.get("/", async (c) => {
    const session = await requireSession(deps.auth, c.req.raw.headers);
    const rows = await deps.db
      .select({ org: schema.organizations, role: schema.memberships.role })
      .from(schema.memberships)
      .innerJoin(schema.organizations, eq(schema.memberships.orgId, schema.organizations.id))
      .where(eq(schema.memberships.userId, session.user.id))
      .orderBy(schema.organizations.createdAt);
    return c.json(rows.map((row) => ({ ...row.org, role: row.role })));
  });

  router.get("/:orgId", orgRole(deps, "VIEWER"), async (c) => {
    const access = c.get("access");
    const [org] = await deps.db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, access.orgId));
    if (!org) throw new HttpError(404, "Organization not found.");
    return c.json({ ...org, role: access.role });
  });

  router.patch("/:orgId", orgRole(deps, "ADMIN"), async (c) => {
    const access = c.get("access");
    const body = await parseJsonBody(c, patchOrgSchema);
    const [org] = await deps.db
      .update(schema.organizations)
      .set({ name: body.name })
      .where(eq(schema.organizations.id, access.orgId))
      .returning();
    if (!org) throw new HttpError(404, "Organization not found.");
    return c.json({ ...org, role: access.role });
  });

  router.delete("/:orgId", orgRole(deps, "OWNER"), async (c) => {
    const access = c.get("access");
    // Real deletion by design (§152): the organization's tree cascades.
    await deps.db.delete(schema.organizations).where(eq(schema.organizations.id, access.orgId));
    return c.body(null, 204);
  });

  router.route("/:orgId/projects", projectsRoutes(deps));
  router.route("/:orgId/api-keys", apiKeysRoutes(deps));

  return router;
}
