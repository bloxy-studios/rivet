# ADR-0007: Better Auth as the identity engine; Rivet memberships as the only authorization authority

- **Status:** Accepted
- **Date:** 2026-08-30
- **Deciders:** Bloxy Studios (project steward)
- **Phase/rung:** Phase 1, PR-2 (`feat/auth-foundation`)

## Context

Rivet needs multi-tenant authentication that a self-hoster runs with zero external
services: email+password today, OAuth (GitHub/Google) later, database-backed sessions,
modern password hashing, CSRF protection, and a clean seam to the `users` table PR-1
deliberately left minimal. Two constraints dominate:

1. **The OSS core cannot depend on a SaaS identity vendor** (founding mandate: BYO
   infrastructure; self-hosting is first-class).
2. **Authorization must stay Rivet's own.** PR-1 built organizations/memberships with
   structural tenant consistency; whatever does *identity* must not become a second
   source of truth for *access*.

There is no HTTP server yet (PR-3), so this rung ships a library: an engine factory and
framework-agnostic guards, proven by driving the real fetch handler in tests.

## Decision

1. **Better Auth (pinned exactly, currently 1.7.2, MIT) is the identity engine**,
   wrapped entirely inside `@rivet/auth`. The rest of the platform imports
   `createAuth`, `requireSession`, and `requireOrgRole` — never `better-auth` directly.
   The facade is the blast-radius boundary if the engine ever has to change.
2. **Identity ≠ authorization.** The engine owns signup/login, scrypt password hashing,
   DB-backed cookie sessions, and CSRF origin checks. Organization access is decided
   exclusively by Rivet's `memberships` roles via `requireOrgRole` (closed set from
   `@rivet/types`, ranked by `roleMeets`). Better Auth's organization plugin is
   **deliberately not used** — it would duplicate the tenancy model PR-1 hardened with
   composite foreign keys.
3. **One schema, one migrations journal.** The engine's tables (`sessions`,
   `accounts`, `verifications`) are defined in `@rivet/database` alongside everything
   else, following repo conventions (uuid PKs, timestamptz, snake_case, cascade
   deletes), and were verified against the engine's own runtime table definitions
   (`getAuthTables`) — not the CLI generator, which lagged the runtime by one field
   (`accounts.issuer`). `users` gained `email_verified` and `image`.
4. **Security posture is pinned, not inherited.** The engine silently disables origin
   checks under `NODE_ENV=test` unless configured explicitly; `createAuth` sets
   `disableOriginCheck: false` and `disableCSRFCheck: false` unconditionally so tests
   exercise production behavior and no environment variable can ever weaken the CSRF
   boundary. Session semantics: 7-day expiry with 1-day sliding refresh (engine
   defaults), opaque tokens in `SameSite=Lax`, `httpOnly` cookies, rows revocable
   server-side.
5. **Email+password is enabled now; OAuth providers are configuration away** (the
   `accounts` table already models them). Emails are normalized lowercase by the
   engine and uniqueness is enforced case-insensitively by the database
   (`lower(email)` unique index), which also protects non-engine write paths.

## Alternatives considered

- **Hand-rolled sessions + argon2/scrypt** — maximal control, no dependency risk, and
  a fine teaching exercise; rejected because the *roadmap* is the cost: password
  reset, email verification, OAuth, 2FA, and rate limiting would each become bespoke
  security-critical code we maintain forever, for zero differentiation.
- **Auth.js (NextAuth)** — OAuth-first with credentials support explicitly
  second-class, and its ergonomics assume a frontend framework host. Rivet's auth
  must serve an API server, a CLI, and multiple apps evenly.
- **Ory Kratos / Keycloak / Zitadel** — real IdPs, but each adds a service (Keycloak a
  JVM) to the `docker compose` footprint for every self-hoster. Contradicts the
  lightweight mandate as a *default*; still viable later as optional enterprise
  integrations behind an interface, without changing this core.
- **Clerk / Auth0 / WorkOS** — hosted SaaS identity is disqualified outright for the
  OSS core: it would make self-hosted Rivet depend on a vendor account.
- **Better Auth organization plugin** — rejected: it would re-create orgs/members in
  engine-owned tables, splitting tenancy truth in two. Rivet's composite-FK tenancy
  model (PR-1) remains the only authority; the engine never decides access.

## Consequences

- `@rivet/auth` ships with handler-level tests (real `Request`/`Response`, PGlite
  Postgres) covering signup, login failure/success, logout revocation, distinct
  session tokens per login, session expiry extension, both CSRF vectors
  (authenticated cross-origin state change; first-login cross-site fetch metadata),
  and the role-guard matrix. CI needs no services.
- Engine upgrades are deliberate events: the version is pinned exactly; schema drift
  is caught by introspecting `getAuthTables` against our tables (the `issuer` episode
  is the cautionary tale) and by the test suite driving real flows.
- `users.name` stays nullable (identity minimalism — engine-created users always have
  a name; future non-engine paths may not). Consumers must treat `name` as optional.
- The `verifications` table exists but email delivery does not — password reset and
  email verification flows need a mail provider, which arrives with the notification
  engine (Phase 4). Until then, self-hosters run with unverified emails; documented.
- Secret management: `createAuth` requires an explicit secret (`RIVET_AUTH_SECRET`);
  the engine supports non-destructive secret rotation via versioned secrets when we
  need it.
- Revisit triggers: Better Auth licensing/stewardship changes, a structural
  incompatibility with a future Drizzle major, or demand for enterprise SSO beyond
  what the engine offers (which would arrive as an optional provider, not a core
  swap).
