# Phase Plan — the PR Ladder

Rivet is built in vertical slices: nine phases, each delivered as a ladder of small,
individually reviewable PRs ("rungs"). Every phase ends with something demonstrably
usable. No rung merges red; no rung fakes functionality it doesn't have.

Rules of the ladder:

- **One rung, one PR**, ordered by dependency. Branch `type/scope-description`,
  Conventional Commits, DCO sign-off, CI green.
- **Rungs for the active phase are specified in detail; later phases stay coarse** and
  are refined (with their queued ADRs) when the phase opens — decisions are made with
  working context, not speculation.
- **Acceptance criteria are testable.** "Works" means demonstrated by tests or a
  documented, reproducible manual check.
- Definition of done for the whole project is the full lifecycle demo (§ Definition of
  done, bottom).

---

## Phase 0 — Foundation ✅ (merged: PR [#1](https://github.com/bloxy-studios/rivet/pull/1))

**PR-0 `chore/pr0-repository-foundation`** — governance (LICENSE Apache-2.0, NOTICE,
GOVERNANCE, CONTRIBUTING with DCO, SECURITY, CODE_OF_CONDUCT), docs program (architecture
overview, ADRs 0001–0005, this plan, design language, licensing policy), toolchain
unification (Biome-only, `typecheck` task naming, root Vitest), `@rivet/types` with
tested safety invariants, CI (lint + typecheck + test + build), issue/PR templates.

Acceptance: `bun install && bun run check` green on a clean clone; CI green; docs
cross-links resolve.

## Phase 1 — OSS platform core

Goal: a self-hostable skeleton with real auth, tenancy, and the product shell.
`docker compose up` yields a login page, an org, a project, and API keys — no telemetry
yet.

| Rung | Scope | Key acceptance criteria |
| --- | --- | --- |
| PR-1 `feat/db-control-plane` ✅ | `@rivet/database`: Postgres schema v1 for orgs/users/memberships/teams/projects/environments/services/api-keys/DSNs + migration tooling + seed script. **ADR-0006** (ORM/migrations) decided here. | Migrations apply from zero and are re-runnable (proven per test run on PGlite); seed creates a demo org idempotently; schema documented; constraint tests cover org isolation, role/criticality CHECKs, unique DSN. |
| PR-2 `feat/auth-foundation` ✅ | Authentication & sessions (multi-tenant, self-host friendly: email+password, OAuth-ready). **ADR-0007** decided here. | Signup/login/logout/session-refresh proven by handler-level tests over real Postgres semantics (PGlite); scrypt password hashing asserted; both CSRF vectors and distinct-session-per-login covered; role model (OWNER/ADMIN/DEVELOPER/VIEWER) enforced in guard tests from Rivet memberships. HTTP mounting arrives with the server in PR-3. |
| PR-3 `feat/server-skeleton` ✅ | `apps/server`: Bun HTTP service (api module), health/readiness endpoints, mounted auth handler, org/project/env/service CRUD behind role guards, API-key + DSN issuance, request logging with request ids, origin guard for cookie-authenticated mutations, OpenAPI stub. **ADR-0008** (framework: Hono) decided here. | Server boots and degrades honestly without a DB (`/readyz` 503); every CRUD path + the full role matrix round-trips in app-level tests over PGlite; API keys stored hash-only and returned once; DSN format helpers tested; 79 tests total. |
| PR-4 `feat/web-shell` ✅ | `apps/web` becomes the product shell: dark-first design tokens, auth screens, org/project switcher, left nav, ⌘K palette skeleton, DSN + API-key surfaces. `packages/ui` → `@rivet/ui` with the first real primitives. | Login → create org → create project → issue + copy DSN works end-to-end through the same-origin proxy against the real server; API keys shown once with copy; both themes with reduced-motion support; nav items for future phases visibly disabled with phase labels — no dead buttons, no fake pages; palette + API client logic unit-tested. |
| PR-5 `feat/self-hosting-compose` | `infrastructure/compose`: postgres + clickhouse + minio + server + web with health checks; `.env.example`; backup/restore docs; license-audit CI gate; `bun demo:reset` seed. | `docker compose up` from a clean machine reaches a working login (documented, CI-smoke-tested where feasible); self-hosting docs complete for this footprint. |

## Phase 2 — Error monitoring (core product)

Goal: an app with the Rivet SDK produces errors that become grouped issues you can
triage in the UI. This is the first "usable product" milestone.

Rungs (refined when the phase opens): envelope schema in `@rivet/validation`
(**ADR queued**: none — protocol fixed by ADR-0004) → ingest endpoint (DSN auth, rate
limiting, buffering, ClickHouse writes; **ADR-0009** queue/worker) → `@rivet/grouping`
pure package with fixture corpus + ≥95% branch coverage (**ADR-0010** fingerprint
strategy) → issue pipeline (states, regression detection, first/last-seen, counts) →
issues UI (list + detail per design language) → structured search (**ADR-0011** grammar;
`@rivet/query` pure package) → JS/Node SDK (`sdks/javascript`, Node-runtime CI) →
`examples/rivet-demo` with intentional failure endpoints (`/null`, `/db-timeout`, …) →
alerts v0 (threshold rules → in-app notifications).

Milestone demo: `bun demo:incident` — demo app throws → issue appears grouped in the UI
with stack trace and breadcrumbs.

## Phase 3 — Observability

OTLP ingest (traces/logs/metrics) → ClickHouse span/log/metric schemas → trace
waterfall UI → logs UI (facets, histogram, live tail) → error↔trace linking →
releases & deployment tracking (webhook + API) → performance views (p50–p99,
slow transactions) → OTel-exception bridge → sampling (**ADR-0012**).

## Phase 4 — Integrations

Provider registry (**ADR-0013** plugin loading) → notification engine (dedup, cooldown,
grouping, escalation, ack) → GitHub App (commit/PR correlation, suspect-commit inputs)
→ Slack (OAuth, channel routing, approval deep-links) → email (`EmailProvider`:
SMTP/Resend/SendGrid/SES) → Telegram (alerts only; sensitive actions deep-link to the
approval UI) → signed outbound webhooks (event catalog).

## Phase 5 — Incidents

Severity + impact model (inputs fixed by architecture overview §4) → incident lifecycle
(create/merge/resolve; stepper UX per design language) → escalation policies →
suspect-commit ranking v1 → SLOs & error budgets → incident page (real-time via SSE).

## Phase 6 — Agent investigation

Agent runtime: orchestrator + state-machine executor over `@rivet/types` transitions +
capability-checked tool runtime + append-only audit (**ADR-0014** ModelProvider) →
read-only tool suite (telemetry, releases, commits, repo read) → evidence graph +
graded findings → root-cause ranking + evidence-derived confidence → investigation
timeline UI (not a chatbot) → agent chat with authorized read-only actions → loop/cost
guards + failure monitoring.

## Phase 7 — Agent fixing

Sandbox (**ADR-0015**) → branch/edit/test tools (`WRITE_BRANCH`, `RUN_TESTS`) →
validation pipeline (format→lint→typecheck→tests→reproduction) → minimal-fix policy +
regression risk analysis → PR generation with evidence-rich bodies (`CREATE_PR`) →
agent evaluation fixtures (`tests/agent-evals/`: null-deref, db-timeout, deploy
regression, race, authz failure, memory leak, slow query, flag bug, frontend crash,
agent-loop, MCP failure) with scored benchmarks.

## Phase 8 — Human approval & deployment

Approval records (artifact-bound per ADR-0005 §4) + approval UI (evidence, diff, tests,
risk, one decision) → `REQUEST_APPROVAL` flow through notifications → deployment
providers (Vercel, GitHub Actions, generic webhook) behind `DeploymentProvider` →
post-deploy verification (error-rate deltas vs baseline) → rollback policy engine
(explicit, measurable, default-off) → full-lifecycle E2E test.

## Phase 9 — Agent-native platform

MCP server (read tools + explicitly authorized actions; **ADR-0016**) → AI/LLM
observability (calls, tokens, cost, latency, loops, MCP failures as first-class
telemetry) → cost dashboards + spend alerts → CLI completion (`rivet issues`,
`incidents`, `agent`, `doctor`, `--json`) → docs site content build-out.

---

## Definition of done (project)

A realistic application connected to a self-hosted Rivet demonstrates, end to end:

real error → ingestion → grouped issue → incident detection → agent investigation →
root cause with evidence → fix branch → automated tests → pull request → human
approval → deployment → post-deployment verification → incident resolution —

plus the contributor loop: fresh machine → clone → `bun install` → compose up →
`bun demo:incident` → modify code → tests → PR. Both loops must be documented and the
critical paths covered by E2E tests (§96–97 of the founding mandate).
