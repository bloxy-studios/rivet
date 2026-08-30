import { SERVICE_CRITICALITIES } from "@rivet/types";
import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./tenancy";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/**
 * The (id, org_id) UNIQUE constraint is deliberately redundant with the
 * primary key: it is the composite foreign-key target that lets rows such
 * as api_keys prove their project belongs to the same organization.
 */
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("projects_org_slug_unique").on(t.orgId, t.slug),
    unique("projects_id_org_unique").on(t.id, t.orgId),
  ],
);

/**
 * Environments and services are both project-scoped. The conceptual chain
 * Organization → Project → Environment → Service → Event (architecture
 * overview §4) is a query-scoping chain: a service exists across
 * environments, so telemetry rows carry (project, environment, service)
 * coordinates rather than services nesting under environments physically.
 */
export const environments = pgTable(
  "environments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("environments_project_name_unique").on(t.projectId, t.name)],
);

const criticalityList = sql.raw(SERVICE_CRITICALITIES.map((c) => `'${c}'`).join(", "));

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Business criticality feeding the impact model (@rivet/types is the source of truth). */
    criticality: text("criticality").notNull().default("MEDIUM"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("services_project_name_unique").on(t.projectId, t.name),
    check("services_criticality_check", sql`${t.criticality} IN (${criticalityList})`),
  ],
);
