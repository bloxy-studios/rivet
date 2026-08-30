# server

Rivet's control-plane API (ADR-0008: Hono, fetch-native, Bun entry). This is the `api`
module of the single server process — `ingest` and `worker` modules join it in later
phases (architecture overview §9).

## Run

```sh
docker compose -f infrastructure/compose/dev.yml up -d
export DATABASE_URL=postgres://rivet:rivet@localhost:5432/rivet
export RIVET_AUTH_SECRET="$(openssl rand -base64 32)"
export RIVET_BASE_URL=http://localhost:3001
bun run db:migrate

bunx turbo run dev --filter=server    # or: cd apps/server && bun run dev
```

Configuration is validated at boot (`src/env.ts`) and fails fast with every problem
listed. Variables: `DATABASE_URL`, `RIVET_AUTH_SECRET` (≥32 chars),
`RIVET_BASE_URL`, `PORT` (default 3001), `RIVET_TRUSTED_ORIGINS` (comma-separated,
optional). See `.env.example` at the repository root.

## Deployment

Primary: self-hosted (Docker Compose, PR-5). A Vercel deployment is also supported via
the `/api` Bun Function model — `vercel.json` pins Bun 1.4 for installs (the default
build image cannot read this repo's lockfile), selects the Bun runtime
(`bunVersion: 1.4.x`), builds via Turborepo, and rewrites every path to `api/server.ts`.
See docs/development/vercel-deployment.md for required env vars.

## Surface

| Area | Endpoints |
| --- | --- |
| Probes | `GET /healthz` (liveness) · `GET /readyz` (checks the database; 503 with a reason when unreachable) |
| Identity | `ALL /api/auth/*` — the `@rivet/auth` engine handler (ADR-0007) |
| Organizations | `POST/GET /api/orgs` · `GET/PATCH/DELETE /api/orgs/:orgId` |
| Projects | `POST/GET …/projects` · `GET/PATCH/DELETE …/projects/:projectId` |
| Environments | `POST/GET …/environments` · `DELETE …/environments/:environmentId` |
| Services | `POST/GET …/services` · `PATCH/DELETE …/services/:serviceId` |
| API keys | `POST/GET /api/orgs/:orgId/api-keys` · `DELETE …/api-keys/:keyId` (revoke) |
| DSNs | `POST/GET …/projects/:projectId/dsns` · `DELETE …/dsns/:dsnId` (revoke) |
| Spec | `GET /api/openapi.json` — honest stub; typed schemas land in a later rung |

## Role matrix (enforced from Rivet memberships — ADR-0007)

| Action | Role |
| --- | --- |
| Create organization | any authenticated user (becomes OWNER) |
| Read org / projects / environments / services | VIEWER+ |
| Create/update environments & services | DEVELOPER+ |
| List DSNs | DEVELOPER+ (needed to configure SDKs) |
| Create/rename/delete projects · rename org · issue/revoke API keys & DSNs | ADMIN+ |
| Delete organization | OWNER |

Slugs are immutable after creation. Authorization responses: organization-level
endpoints return **403** for authenticated non-members (the membership check speaks
first); **nested** resource lookups (project and below) carry both tenant and resource
ids, so cross-tenant probes resolve to **404**. Malformed uuids are indistinguishable
from missing resources (404).

## Security posture

- **Sessions**: `@rivet/auth` cookies (`SameSite=Lax`, `httpOnly`); the origin guard in
  `app.ts` additionally rejects cookie-bearing mutations from untrusted origins
  (requests without an `Origin` header are non-browser clients — CLI, server-to-server —
  where CSRF does not apply).
- **API keys**: full key returned exactly once at creation (`rvk_…`); only the SHA-256
  hash is stored; listings show the display prefix only. Revocation is a timestamp and
  idempotent. (Key-authenticated requests land with the CLI/SDK rungs.)
- **Logging**: structured JSON with a per-request id (`x-request-id`); method, path,
  status, duration only — never headers, cookies, bodies, or query strings.
- **Errors**: typed and centrally mapped (401/403 guards, 400 validation with zod
  issues, 404 tenant-safe, 409 unique violations, opaque 500s carrying the request id).

## Testing

`bun run test` drives `app.request()` in-process against PGlite Postgres — the real
route/middleware stack, no sockets, no services in CI. See `src/*.test.ts` and
`src/routes/*.test.ts`.
