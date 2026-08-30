import { schema } from "@rivet/database";
import { SERVICE_CRITICALITIES } from "@rivet/types";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { HttpError, parseJsonBody } from "../errors";
import {
  type AppDeps,
  type AppEnv,
  nameSchema,
  orgRole,
  paramUuid,
  requireProjectInOrg,
} from "./shared";

const criticalitySchema = z.enum(SERVICE_CRITICALITIES);
const createServiceSchema = z.object({
  name: nameSchema,
  criticality: criticalitySchema.optional(),
});
const patchServiceSchema = z
  .object({
    name: nameSchema.optional(),
    criticality: criticalitySchema.optional(),
  })
  .refine((body) => body.name !== undefined || body.criticality !== undefined, {
    message: "Provide at least one field to update.",
  });

/**
 * Role matrix: create/update/delete = DEVELOPER+ (developers wire their own
 * services) · read = VIEWER+. Criticality feeds the impact model and is
 * validated against the closed set in @rivet/types.
 */
export function servicesRoutes(deps: AppDeps): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.post("/", orgRole(deps, "DEVELOPER"), async (c) => {
    const access = c.get("access");
    const projectId = paramUuid(c, "projectId", "Project");
    await requireProjectInOrg(deps.db, access.orgId, projectId);
    const body = await parseJsonBody(c, createServiceSchema);
    const [service] = await deps.db
      .insert(schema.services)
      .values({
        projectId,
        name: body.name,
        ...(body.criticality && { criticality: body.criticality }),
      })
      .returning();
    return c.json(service, 201);
  });

  router.get("/", orgRole(deps, "VIEWER"), async (c) => {
    const access = c.get("access");
    const projectId = paramUuid(c, "projectId", "Project");
    await requireProjectInOrg(deps.db, access.orgId, projectId);
    const services = await deps.db
      .select()
      .from(schema.services)
      .where(eq(schema.services.projectId, projectId))
      .orderBy(schema.services.createdAt);
    return c.json(services);
  });

  router.patch("/:serviceId", orgRole(deps, "DEVELOPER"), async (c) => {
    const access = c.get("access");
    const projectId = paramUuid(c, "projectId", "Project");
    const serviceId = paramUuid(c, "serviceId", "Service");
    await requireProjectInOrg(deps.db, access.orgId, projectId);
    const body = await parseJsonBody(c, patchServiceSchema);
    const [service] = await deps.db
      .update(schema.services)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.criticality !== undefined && { criticality: body.criticality }),
      })
      .where(and(eq(schema.services.id, serviceId), eq(schema.services.projectId, projectId)))
      .returning();
    if (!service) throw new HttpError(404, "Service not found.");
    return c.json(service);
  });

  router.delete("/:serviceId", orgRole(deps, "DEVELOPER"), async (c) => {
    const access = c.get("access");
    const projectId = paramUuid(c, "projectId", "Project");
    const serviceId = paramUuid(c, "serviceId", "Service");
    await requireProjectInOrg(deps.db, access.orgId, projectId);
    const [deleted] = await deps.db
      .delete(schema.services)
      .where(and(eq(schema.services.id, serviceId), eq(schema.services.projectId, projectId)))
      .returning();
    if (!deleted) throw new HttpError(404, "Service not found.");
    return c.body(null, 204);
  });

  return router;
}
