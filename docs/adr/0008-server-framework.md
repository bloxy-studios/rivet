# ADR-0008: Hono on Bun for the server (fetch-native, runtime-portable)

- **Status:** Accepted
- **Date:** 2026-08-30
- **Deciders:** Bloxy Studios (project steward)
- **Phase/rung:** Phase 1, PR-3 (`feat/server-skeleton`)

## Context

`apps/server` is Rivet's control-plane HTTP surface: health probes, the mounted
identity handler (`/api/auth/*`, fetch-native per ADR-0007), tenant CRUD behind role
guards, and credential issuance — later joined by ingest and worker modules in the
same process (architecture overview §9: one process with internal module boundaries,
splittable by flags). Requirements: Bun-first but not Bun-locked (ADR-0002 keeps
packages Node-compatible), tiny operational footprint, testable without sockets, and
zero friction with the fetch `Request`/`Response` model our auth layer and tests
already use.

## Decision

1. **Hono** (pinned, currently 4.13.5, MIT) is the HTTP framework. It is
   fetch-standard end to end: `auth.handler(c.req.raw)` mounts in one line, tests
   drive `app.request()` in-process with no listening socket, and the same app object
   would run on Node or edge runtimes unchanged.
2. **`Bun.serve` appears only in the entry point** (`src/index.ts`). Everything else —
   `createApp(deps)`, routes, middleware — is runtime-agnostic and dependency-injected
   (db, auth, logger), which is what makes the PGlite-backed test suite possible.
3. **Validation is zod (pinned, currently 4.5.4) with a 20-line local helper**, not a
   validator-middleware dependency: parse JSON, `safeParse`, throw a typed 400. The
   event-envelope schemas (`@rivet/validation`, Phase 2) will make zod a shared
   dependency anyway.
4. **Errors are typed and mapped centrally**: guard errors carry their own status
   (401/403 from `@rivet/auth`), `HttpError` for route-level signaling, zod issues →
   400, Postgres unique violations → 409, everything else → 500 with the request id
   and no internals leaked.
5. **OpenAPI starts as an honest stub** (`/api/openapi.json` listing implemented
   endpoints); typed schema generation is deferred to the Phase 2 API rung (queued
   decision) rather than bolting on a codegen pipeline before the API surface
   stabilizes.

## Alternatives considered

- **Elysia** — excellent Bun-native performance and DX, but Bun-only by design. It
  would weld the server to one runtime, contradict ADR-0002's portability posture,
  and make the fetch-native auth handler a second-class citizen.
- **Bare `Bun.serve`** — zero dependencies until you hand-roll routing, params,
  middleware ordering, and error boundaries: an accidental framework, maintained by
  us, tested by nobody else.
- **Fastify / Express** — mature, but Node-idiomatic (req/res streams, listen-based
  testing); every fetch boundary (auth handler, future MCP/edge surfaces) needs
  adapters. Fastify's plugin encapsulation buys little for a service this shape.
- **Next.js API routes** — couples the API to the web app's build and framework
  lifecycle; wrong tool for a service that later hosts high-throughput ingest.

## Consequences

- The server tests exercise the real HTTP surface (routing, middleware, error
  mapping) in-process over PGlite — same zero-service CI as every other package.
- Hono and zod join the runtime dependency set (both MIT, allowlisted); versions
  pinned exactly, upgrades deliberate.
- When ingest arrives (Phase 2), it starts as a module in this app; if profiling
  demands a split or a Rust path (§11 of the mandate), the fetch-native boundary
  makes extraction cheap.
- OpenAPI consumers get an accurate-but-thin stub until the typed-generation rung;
  documented as such in the spec itself.
