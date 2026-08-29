# ADR-0006: Drizzle ORM + postgres.js, committed SQL migrations, PGlite-backed tests

- **Status:** Accepted
- **Date:** 2026-08-29
- **Deciders:** Bloxy Studios (project steward)
- **Phase/rung:** Phase 1, PR-1 (`feat/db-control-plane`)

## Context

ADR-0003 gives the control plane to PostgreSQL. PR-1 needs the concrete data layer:
schema definition, type-safe access, versioned migrations (§132 of the mandate: never
manual SQL for normal upgrades), and a way to test real Postgres constraints in CI
without turning CI into a Docker orchestration exercise. Constraints: Bun and Node must
both run the package (SDK/tooling reuse, Vitest workers), contributors must be able to
read every migration as plain SQL, and the domain's closed sets (roles, criticalities)
already live in `@rivet/types` — the database layer must consume them, not duplicate
them.

## Decision

1. **Drizzle ORM** (`drizzle-orm`) defines the schema as TypeScript in
   `packages/database/src/schema/` — the single source of truth. Types are inferred;
   no codegen step.
2. **Migrations are generated SQL, committed to the repo** (`drizzle-kit generate` →
   `packages/database/migrations/*.sql` + journal). Migrations are reviewed like code,
   applied programmatically via Drizzle's migrator (`bun run db:migrate`), and are
   idempotent — the journal table skips applied migrations. Hand-edited SQL migrations
   are allowed when the generator falls short, as long as they live in the same journal.
3. **Driver: postgres.js** (`postgres`) — pure JS, runs identically on Bun and Node.
   No native bindings, no Bun-only APIs in the package.
4. **Tests run on PGlite** (`@electric-sql/pglite`, dev-dependency): real Postgres
   compiled to WASM, in-process. `createTestDatabase()` applies the committed SQL
   migrations from zero, so every test run re-proves "migrations apply from scratch"
   and CI needs no database service. A real-Postgres compose file
   (`infrastructure/compose/dev.yml`) serves local development.
5. **Closed sets are enforced twice from one source**: `@rivet/types` constants
   generate `CHECK` constraints in the schema (roles, service criticality), so even
   writers that bypass the application layer cannot store invalid values, and the
   constants can never drift from the constraints (tests iterate the exported sets
   against the database).
6. **Conventions:** `uuid` primary keys (`gen_random_uuid()`), `timestamptz`
   timestamps, snake_case columns, `ON DELETE CASCADE` inside an organization's tree
   (real deletion per §152), `SET NULL` for attribution references, unique indexes
   scoped to their tenant (e.g. project slug unique *per org*), case-insensitive
   unique emails via a `lower(email)` unique index (no citext extension dependency).

## Alternatives considered

- **Prisma** — mature migrations, but heavier runtime, a schema DSL + codegen step,
  and historically awkward multi-runtime behavior. Drizzle gives the same type safety
  with plain TS and plain SQL artifacts, which suits an OSS repo where contributors
  review migrations.
- **Kysely + hand-written migrations** — honest and lean, but schema truth would live
  in SQL with types generated *from* the database, inverting the dependency on
  `@rivet/types` constants and adding a codegen loop. Chosen approach keeps TS as the
  source and SQL as the reviewed artifact.
- **Raw SQL + a tiny migration runner** — maximal control, but every table gains
  hand-maintained types; drift is a matter of time.
- **Bun's native Postgres client** — fast, but Bun-only; violates the Node-compat
  requirement (ADR-0002) for packages that tooling and tests import.
- **Testcontainers for tests** — real server fidelity, but adds a hard Docker
  dependency to CI and contributor machines. PGlite is real Postgres semantics
  (constraints, expression indexes, arrays all exercised) with zero services; its
  limits (extensions, replication) don't touch the control plane. If a future feature
  needs extension-dependent behavior, that rung adds a compose-backed integration lane.
- **Postgres enums instead of CHECK constraints** — `ALTER TYPE` churn on every set
  change and a second definition of the closed sets. CHECK-from-constants keeps one
  source of truth in `@rivet/types`.

## Consequences

- Contributors read schema in TS and diffs in SQL; `bun run db:generate` after schema
  edits, commit both. CI re-proves from-zero migration on every run via the test
  suite.
- `drizzle-kit` and `@electric-sql/pglite` are dev-dependencies only; the runtime
  dependency surface is `drizzle-orm` + `postgres` (both MIT, allowlisted).
- The `users` table is deliberately minimal — ADR-0007 (authentication, PR-2) will
  extend or reference it; that seam is documented in the schema.
- Drizzle pins us to its migration journal format; acceptable — artifacts are plain
  SQL and portable if we ever leave.
- Telemetry-plane storage (ClickHouse, Phase 2/3) is explicitly out of scope here and
  will get its own access layer and migration discipline.
