import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { organizations, users } from "./tenancy";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/**
 * API keys authenticate the management API (issuance flow lands with the
 * server in PR-3). Only a SHA-256 hash is stored — never the key material.
 * `keyPrefix` holds the short display prefix (e.g. `rvk_live_a1b2…`) shown
 * in the UI so users can identify keys without exposing them.
 * Revocation is a timestamp, preserving the audit trail; revoked keys are
 * never deleted while their organization exists.
 *
 * Tenant consistency: `project_id` is not a plain reference — the composite
 * foreign key (project_id, org_id) → projects(id, org_id) makes it
 * impossible to attach a key to another organization's project, so
 * authorization code can trust both fields. A NULL project_id (org-wide
 * key) skips the composite check by SQL MATCH SIMPLE semantics, while
 * org_id integrity is still guaranteed by its own foreign key.
 */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** Optional project scoping; NULL means org-wide. */
    projectId: uuid("project_id"),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    scopes: text("scopes").array().notNull().default(sql`'{}'::text[]`),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("api_keys_key_hash_unique").on(t.keyHash),
    index("api_keys_org_idx").on(t.orgId),
    foreignKey({
      name: "api_keys_project_org_fk",
      columns: [t.projectId, t.orgId],
      foreignColumns: [projects.id, projects.orgId],
    }).onDelete("cascade"),
  ],
);

/**
 * DSNs are the public ingest credentials embedded in SDK configuration
 * (ADR-0004). The public key is random, project-bound, and revocable;
 * it authorizes event submission only — never reads or management calls.
 */
export const dsns = pgTable(
  "dsns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    publicKey: text("public_key").notNull(),
    label: text("label"),
    createdAt: createdAt(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("dsns_public_key_unique").on(t.publicKey),
    index("dsns_project_idx").on(t.projectId),
  ],
);
