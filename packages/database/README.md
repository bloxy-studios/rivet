# @rivet/database

Rivet's control-plane database layer: Drizzle schema, committed SQL migrations, a
postgres.js client factory, an idempotent demo seed, and a PGlite-backed test harness.
Architecture: [ADR-0003](../../docs/adr/0003-storage-architecture.md) (what lives in
Postgres) and [ADR-0006](../../docs/adr/0006-orm-and-migrations.md) (how).

## Schema v1 (control plane)

| Table | Purpose | Key constraints |
| --- | --- | --- |
| `users` | Global identities (auth lands in PR-2 / ADR-0007) | unique `lower(email)` |
| `organizations` | Tenancy root | unique `slug` |
| `memberships` | User↔org with role | unique `(org, user)`; `role` CHECK from `@rivet/types` `ORG_ROLES` |
| `teams` / `team_memberships` | Org-scoped grouping | unique `(org, slug)` / `(team, user)` |
| `projects` | Monitored applications | unique `(org, slug)` |
| `environments` | production / staging / … | unique `(project, name)` |
| `services` | Deployable units with business criticality | unique `(project, name)`; `criticality` CHECK from `SERVICE_CRITICALITIES` |
| `api_keys` | Management-API credentials — **hash only**, never key material | unique `key_hash`; revocation via `revoked_at` |
| `dsns` | Public ingest credentials (ADR-0004) | unique `public_key`, project-bound |

Conventions: `uuid` PKs (`gen_random_uuid()`), `timestamptz` timestamps, snake_case
columns, `ON DELETE CASCADE` within an org's tree (deleting an org really deletes its
data; users are global and survive), `SET NULL` for attribution links.

Environments and services are both project-scoped: the conceptual chain
Org → Project → Environment → Service → Event is a *query-scoping* chain — a service
exists across environments, so telemetry rows carry (project, environment, service)
coordinates.

## Commands (from the repo root)

```sh
docker compose -f infrastructure/compose/dev.yml up -d   # local Postgres 17
export DATABASE_URL=postgres://rivet:rivet@localhost:5432/rivet

bun run db:migrate    # apply committed migrations (idempotent)
bun run db:seed       # demo org/project/environments/services/DSN (idempotent)
bun run db:generate   # after editing src/schema/ — regenerate SQL, commit both
```

## Changing the schema

1. Edit `src/schema/*.ts` (closed sets come from `@rivet/types` — change them there).
2. `bun run db:generate` — review the generated SQL in `migrations/` like any code.
3. Add/extend constraint tests in `src/schema.test.ts`.
4. Commit schema + migration + journal together. Never edit an applied migration;
   add a new one.

## Testing

Tests run on [PGlite](https://pglite.dev) — real Postgres compiled to WASM, in-process,
so `bun run test` needs **no Docker and no services**, in CI included. Every test run
applies the committed migrations from zero, which keeps "migrations work from scratch"
continuously proven. Import the harness from `@rivet/database/testing`:

```ts
const { db, remigrate, close } = await createTestDatabase();
```

## Explicit seams

- `users` is intentionally minimal; the authentication rung (PR-2, ADR-0007) extends
  or references it.
- API-key issuance/verification flows (hashing, prefixes, scopes semantics) land with
  the server in PR-3 — this package only guarantees the storage invariants.
