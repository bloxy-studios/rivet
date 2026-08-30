# @rivet/auth

Rivet's authentication package (ADR-0007): the identity engine (Better Auth over the
control-plane database) plus framework-agnostic guards. Identity lives here;
**authorization does not** — organization access is decided by Rivet's `memberships`
roles, enforced through `requireOrgRole`.

## Usage

```ts
import { createAuth, requireOrgRole, requireSession } from "@rivet/auth";
import { createDatabase } from "@rivet/database";

const { db } = createDatabase(process.env.DATABASE_URL!);

export const auth = createAuth({
  db,
  secret: process.env.RIVET_AUTH_SECRET!, // openssl rand -base64 32
  baseURL: process.env.RIVET_BASE_URL!,   // e.g. https://rivet.example.com
  trustedOrigins: [],                     // extra origins allowed past the CSRF check
});

// HTTP layer (PR-3 mounts this): auth.handler(request) serves /api/auth/*.

// Guards (framework-agnostic; throw UnauthenticatedError(401) / ForbiddenError(403)):
const session = await requireSession(auth, request.headers);
const access = await requireOrgRole(auth, db, request.headers, orgId, "DEVELOPER");
```

## What the engine provides

- Email+password signup/login with **scrypt** hashing (hash lives in
  `accounts.password`; never plaintext, never in `users`)
- **Database-backed sessions**: opaque token in a `SameSite=Lax`, `httpOnly` cookie;
  7-day expiry with 1-day sliding refresh; server-side revocation
- **CSRF protection pinned on in every environment** — the engine's silent
  `NODE_ENV=test` opt-out is explicitly overridden in `createAuth`, so tests exercise
  production behavior and no environment can weaken the boundary
- OAuth-ready `accounts` model (providers enabled by configuration in a later rung)

## What it deliberately does not do

- **No authorization.** A session proves who you are; `memberships` decides what you
  may touch. The engine's organization plugin is unused by design (ADR-0007).
- **No email delivery yet.** Password reset / email verification need a mail
  provider (Phase 4); `verifications` storage is already in place.

## Testing

Handler-level tests drive real `Request`/`Response` flows against PGlite Postgres —
no mocks of the engine, no services in CI. See `src/auth.test.ts` (flows + CSRF
vectors) and `src/guards.test.ts` (role matrix).
