import { schema } from "@rivet/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { HttpError, parseJsonBody } from "../errors";
import { dsnsRoutes } from "./dsns";
import { environmentsRoutes } from "./environments";
import { servicesRoutes } from "./services";
import {
  type AppDeps,
  type AppEnv,
  nameSchema,
  orgRole,
  paramUuid,
  requireProjectInOrg,
  resolveSlug,
  slugSchema,
} from "./shared";

const createProjectSchema = z.object({ name: nameSchema, slug: slugSchema.optional() });
const patchProjectSchema = z.object({ name: nameSchema });

/**
 * Role matrix: create/update/delete = ADMIN+ · read = VIEWER+.
 * Project slugs are unique per organization and immutable after creation.
 */
export function projectsRoutes(deps: AppDeps): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.post("/", orgRole(deps, "ADMIN"), async (c) => {
    const access = c.get("access");
    const body = await parseJsonBody(c, createProjectSchema);
    const slug = resolveSlug(body.slug, body.name);
    const [project] = await deps.db
      .insert(schema.projects)
      .values({ orgId: access.orgId, name: body.name, slug })
      .returning();
    return c.json(project, 201);
  });

  router.get("/", orgRole(deps, "VIEWER"), async (c) => {
    const access = c.get("access");
    const projects = await deps.db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.orgId, access.orgId))
      .orderBy(schema.projects.createdAt);
    return c.json(projects);
  });

  router.get("/:projectId", orgRole(deps, "VIEWER"), async (c) => {
    const access = c.get("access");
    const projectId = paramUuid(c, "projectId", "Project");
    const project = await requireProjectInOrg(deps.db, access.orgId, projectId);
    return c.json(project);
  });

  router.patch("/:projectId", orgRole(deps, "ADMIN"), async (c) => {
    const access = c.get("access");
    const projectId = paramUuid(c, "projectId", "Project");
    const body = await parseJsonBody(c, patchProjectSchema);
    const [project] = await deps.db
      .update(schema.projects)
      .set({ name: body.name })
      .where(and(eq(schema.projects.id, projectId), eq(schema.projects.orgId, access.orgId)))
      .returning();
    if (!project) throw new HttpError(404, "Project not found.");
    return c.json(project);
  });

  router.delete("/:projectId", orgRole(deps, "ADMIN"), async (c) => {
    const access = c.get("access");
    const projectId = paramUuid(c, "projectId", "Project");
    await requireProjectInOrg(deps.db, access.orgId, projectId);
    await deps.db.delete(schema.projects).where(eq(schema.projects.id, projectId));
    return c.body(null, 204);
  });

  router.route("/:projectId/environments", environmentsRoutes(deps));
  router.route("/:projectId/services", servicesRoutes(deps));
  router.route("/:projectId/dsns", dsnsRoutes(deps));

  return router;
}
