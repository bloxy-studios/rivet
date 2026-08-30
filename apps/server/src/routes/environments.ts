import { schema } from "@rivet/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { HttpError, parseJsonBody } from "../errors";
import { type AppDeps, type AppEnv, orgRole, paramUuid, requireProjectInOrg } from "./shared";

const environmentNameSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-_]{0,63}$/, {
    message: "must be 1-64 chars: lowercase letters, digits, hyphens, underscores",
  });

const createEnvironmentSchema = z.object({ name: environmentNameSchema });

/** Role matrix: create/delete = DEVELOPER+ · read = VIEWER+. */
export function environmentsRoutes(deps: AppDeps): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.post("/", orgRole(deps, "DEVELOPER"), async (c) => {
    const access = c.get("access");
    const projectId = paramUuid(c, "projectId", "Project");
    await requireProjectInOrg(deps.db, access.orgId, projectId);
    const body = await parseJsonBody(c, createEnvironmentSchema);
    const [environment] = await deps.db
      .insert(schema.environments)
      .values({ projectId, name: body.name })
      .returning();
    return c.json(environment, 201);
  });

  router.get("/", orgRole(deps, "VIEWER"), async (c) => {
    const access = c.get("access");
    const projectId = paramUuid(c, "projectId", "Project");
    await requireProjectInOrg(deps.db, access.orgId, projectId);
    const environments = await deps.db
      .select()
      .from(schema.environments)
      .where(eq(schema.environments.projectId, projectId))
      .orderBy(schema.environments.createdAt);
    return c.json(environments);
  });

  router.delete("/:environmentId", orgRole(deps, "DEVELOPER"), async (c) => {
    const access = c.get("access");
    const projectId = paramUuid(c, "projectId", "Project");
    const environmentId = paramUuid(c, "environmentId", "Environment");
    await requireProjectInOrg(deps.db, access.orgId, projectId);
    const [deleted] = await deps.db
      .delete(schema.environments)
      .where(
        and(
          eq(schema.environments.id, environmentId),
          eq(schema.environments.projectId, projectId),
        ),
      )
      .returning();
    if (!deleted) throw new HttpError(404, "Environment not found.");
    return c.body(null, 204);
  });

  return router;
}
