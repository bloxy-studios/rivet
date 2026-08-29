import { ORG_ROLES } from "@rivet/types";
import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/** Shared timestamp columns. `updatedAt` is maintained app-side by Drizzle. */
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/**
 * Users are global identities; organization access is granted through
 * memberships. This table is deliberately minimal: the authentication
 * architecture (ADR-0007, Phase 1 / PR-2) will extend or reference it —
 * columns here are the domain's needs, not any auth provider's shape.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Case-insensitive uniqueness without the citext extension.
    uniqueIndex("users_email_lower_unique").on(sql`lower(${t.email})`),
  ],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("organizations_slug_unique").on(t.slug)],
);

const orgRoleList = sql.raw(ORG_ROLES.map((role) => `'${role}'`).join(", "));

/**
 * Organization membership with a role from the closed set in @rivet/types
 * (single source of truth); the CHECK constraint keeps the database honest
 * even against writers that bypass the application layer.
 */
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("memberships_org_user_unique").on(t.orgId, t.userId),
    index("memberships_user_idx").on(t.userId),
    check("memberships_role_check", sql`${t.role} IN (${orgRoleList})`),
  ],
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("teams_org_slug_unique").on(t.orgId, t.slug)],
);

export const teamMemberships = pgTable(
  "team_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("team_memberships_team_user_unique").on(t.teamId, t.userId)],
);
