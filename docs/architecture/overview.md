# Rivet Architecture Overview

Status: current as of Phase 0. This document describes the target architecture the phase
plan builds toward, and is updated as phases land. Decisions referenced here are recorded
as [ADRs](../adr/README.md); accepted ADRs are binding.

## 1. What Rivet does

Rivet is an application reliability platform with an agentic incident engine. It ingests
errors and OpenTelemetry signals, groups them into issues, promotes operational impact
into incidents, and — under explicit policy — dispatches agents that investigate root
cause, prepare a minimal validated fix, and request human approval before anything
reaches production.

The product thesis in one line: **compress the time between incident and safe
remediation, with humans in control of consequential actions.**

```
Application (SDK / OTel)
        │  errors, traces, logs, metrics
        ▼
Ingestion ──▶ Normalize ──▶ Group ──▶ Store ──▶ Issue processing ──▶ Alert evaluation
                                                                          │
                                                              policy match (severity)
                                                                          ▼
                                                                   Agent orchestrator
                                                                          │
                     investigate ◀── evidence graph ◀── telemetry + repo + deploys
                                                                          │
                                                        fix branch → validation → PR
                                                                          │
                                                              human approval (gate)
                                                                          │
                                                          deployment → verification
```

## 2. Design tenets

1. **Signal over noise.** The default surfaces answer: what broke, who is affected, how
   severe, when it started, what changed, why it probably happened, what Rivet
   recommends, and what Rivet already did.
2. **Observability leads to action.** Every entity links forward: error → trace → logs →
   deployment → commit → code → root cause → proposed fix → validation → approval →
   verification.
3. **Bounded agents.** Agents act only through explicit tools with declared capabilities,
   enforced outside the model ([ADR-0005](../adr/0005-agent-safety-invariants.md)).
4. **Lightweight operation.** A small team must be able to run Rivet: one web app, one
   server process (splittable later), Postgres, ClickHouse, and object storage. No
   Kubernetes requirement, no mandatory queue cluster.
5. **Provider neutrality.** Databases, object storage, LLM providers, SCM, notifications,
   and deployment targets sit behind interfaces. OSS self-hosting is a first-class
   deployment, not a demo.
6. **Interoperability via open standards.** OpenTelemetry for signals, OpenAPI for the
   API, OAuth for integrations, MCP for agent interop, signed webhooks for events.
7. **AI can fail without taking observability down.** Telemetry ingestion, issue
   processing, and alerting never depend on an LLM provider being up.

## 3. Monorepo layout

Current state, with planned components marked by the phase that introduces them:

```
rivet/
├── apps/
│   ├── web/            # product UI (Next.js) — shell lands Phase 1
│   ├── docs/           # documentation site
│   ├── server/         # API + ingest + worker (single Bun process, splittable) — Phase 1–2
│   └── cli/            # rivet CLI — begins Phase 2, grows per phase
├── packages/
│   ├── types/          # @rivet/types — shared domain primitives (current)
│   ├── database/       # @rivet/database — control-plane schema + migrations (current)
│   ├── auth/           # @rivet/auth — identity engine + session/role guards (current)
│   ├── validation/     # @rivet/validation — event envelope schemas — Phase 2
│   ├── telemetry-store/# @rivet/telemetry-store — ClickHouse access layer — Phase 2–3
│   ├── grouping/       # @rivet/grouping — pure grouping engine — Phase 2
│   ├── query/          # @rivet/query — search grammar + planner — Phase 2
│   ├── agent-core/     # orchestrator, state machine runtime, audit — Phase 6
│   ├── agent-tools/    # tool implementations with capability declarations — Phase 6–7
│   ├── integrations/   # provider registry + implementations — Phase 4
│   ├── ui/             # shared UI components (@rivet/ui) — Phase 1
│   ├── typescript-config/  # shared tsconfig presets (@repo/*: starter tooling)
│   └── ...             # only what a phase actually needs (no speculative packages)
├── sdks/               # javascript, node, then python/go/rust — Phase 2+
├── infrastructure/     # docker compose (Phase 1), kubernetes/terraform (later, optional)
├── examples/           # rivet-demo with intentional failures — Phase 2
└── docs/
```

Conventions ([ADR-0002](../adr/0002-monorepo-toolchain.md)): Bun + Turborepo,
TypeScript strict, Biome, Vitest; internal packages are source-only; product packages
use the `@rivet/*` scope; pure packages are framework-free.

## 4. Domain model and multi-tenancy

```
Organization
  └── Project (DSNs, API keys)
        └── Environment (production, staging, …)
              └── Service (criticality: CRITICAL / HIGH / MEDIUM / LOW)
                    └── Event (error / span / log / metric)
                          └── Issue   (grouped recurring problem)
                                └── Incident (active operational impact)
```

- **Organizations** own users (memberships with roles: Owner / Admin / Developer /
  Viewer), teams, integrations, retention policy, and agent policy.
- **Projects** own DSNs and API keys; ingestion authenticates at project scope.
- **Issues** are grouped problems with states `NEW / ONGOING / REGRESSED / RESOLVED /
  IGNORED / ARCHIVED` (`@rivet/types`).
- **Incidents** are *not* issues: an incident exists only when there is active
  operational impact, carries a severity `SEV0–SEV4`, and is the unit the agent engine
  and escalation policies operate on.
- **Impact scoring** combines error rate, growth rate, affected users, service
  criticality, and duration against historical baseline. The concrete model is an
  implementation concern of Phase 5 and will be documented when it lands — but the
  inputs above are fixed by design, and severity is always computed by the platform,
  never asserted by a model.

## 5. Storage architecture

Decided in [ADR-0003](../adr/0003-storage-architecture.md):

| Plane | Store | Holds |
| --- | --- | --- |
| Control plane | **PostgreSQL** | orgs, users, projects, integrations, issues (aggregates), incidents, releases, deployments, agent runs/actions/findings, approvals, notifications, audit log |
| Telemetry plane | **ClickHouse** | raw events, spans, logs, metric points — high-volume, append-heavy, analytical |
| Blobs | **Object storage (S3-compatible)** | attachments, replays, profiles, large agent artifacts |
| Cache/queue | **PostgreSQL first; Valkey only when measured need arises** | job queue, rate-limit state, hot caches |

Raw events never live in Postgres; issue rows in Postgres hold aggregates and pointers
into ClickHouse. Both databases run fine as single nodes under `docker compose` — the
lightweight requirement holds.

## 6. Ingestion pipeline

```
SDK / OTel exporter
  ▼
Ingest endpoints (Rivet envelope: /api/<project>/envelope; OTLP: /v1/traces|logs|metrics)
  ▼ authenticate (DSN) → validate (schema_version) → rate limit (project/org)
  ▼ normalize → enrich (release, deploy, geo, runtime)
  ▼ buffer (in-process batching; backpressure to disk)
  ▼ ClickHouse batch insert
  ▼ grouping → issue upsert (Postgres) → alert evaluation → agent trigger (policy)
```

Protocol decisions in [ADR-0004](../adr/0004-telemetry-protocol.md): OTLP is native for
traces/logs/metrics; errors use the versioned Rivet event envelope; OTel exception
records are mapped into the same error pipeline so OTel-only applications still get
issues without a Rivet SDK. Sampling (head/dynamic) is configured per project;
severity-relevant errors bypass sampling drops.

Ingestion is designed to scale horizontally and to degrade gracefully: if ClickHouse is
briefly unavailable, ingest buffers and applies backpressure rather than dropping.

## 7. Agent architecture

One orchestrator, specialized capabilities sharing a runtime — not one giant prompt:

```
Agent Orchestrator (owns the state machine; policy-triggered)
 ├── Detection / Triage     — is this actionable? severity? duplicate?
 ├── Investigation          — builds the evidence graph
 ├── Root cause             — ranks hypotheses with graded evidence
 ├── Fix                    — smallest safe change on an isolated branch
 ├── Validation             — format → lint → typecheck → tests → reproduction
 ├── Review                 — diff risk analysis, PR body generation
 └── Communication          — notifications, approval requests, status updates
```

Non-negotiables (all in [ADR-0005](../adr/0005-agent-safety-invariants.md), several
already encoded and tested in `@rivet/types`):

- **State machine is system-owned.** `DETECTED → TRIAGING → INVESTIGATING →
  ROOT_CAUSE_FOUND → FIX_PLANNED → FIXING → VALIDATING → PR_READY → AWAITING_APPROVAL →
  APPROVED → DEPLOYING → VERIFYING → RESOLVED`, with explicit failure states. `DEPLOYING`
  is reachable only from `APPROVED`; `APPROVED` only from `AWAITING_APPROVAL`.
- **Tools declare capabilities**; the runtime authorizes each call against the run's
  grants. `DEPLOY_PRODUCTION` and `ROLLBACK_PRODUCTION` are default-denied.
- **Evidence is graded** `OBSERVED / INFERRED / HYPOTHESIZED / CONFIRMED`; confidence is
  computed from evidence signals (stack-trace match, deployment correlation, reproduction,
  test results), never asserted by the model.
- **Every action is audited** with an append-only event log (the investigation timeline
  in the UI is a view of this log).
- **Sandboxed execution** for anything that runs code: temp filesystem, no production
  credentials, restricted network, resource and time limits, destroyed after use.
- **Loop and cost guards**: max steps, duration, tokens, spend, repeated-tool detection.
- **Retrieved content is untrusted.** Telemetry, logs, source code, and web pages can
  contain prompt injection; system authorization always outranks retrieved content.

Model access goes through a `ModelProvider` abstraction (BYO model: Anthropic, OpenAI,
Google, Azure, local/OpenAI-compatible endpoints) with fallback and per-org cost caps.
Provider choice is a Phase 6 ADR; the abstraction requirement is settled now.

## 8. Integrations

All external systems sit behind interfaces so contributors can add providers without
touching core logic (Phase 4 lands the registry):

`SCMProvider` (GitHub first, GitLab-shaped), `NotificationProvider` (Slack, Telegram,
email via `EmailProvider` — SMTP/Resend/SendGrid/SES —, webhooks, in-app),
`DeploymentProvider` (Vercel, GitHub Actions, generic webhook first),
`ModelProvider`, `StorageProvider`, plus agent tools with declared capabilities.

The notification engine (dedup, cooldown, grouping, escalation, acknowledgement) is core;
providers are plugins. Telegram and chat surfaces never become unrestricted command
channels — sensitive actions always redirect to the authenticated approval UI.

## 9. Deployment topologies

| Mode | Shape | Audience |
| --- | --- | --- |
| Development | `bun install && bun dev` + `docker compose` for Postgres/ClickHouse | contributors |
| Self-hosted (default) | `docker compose up`: web, server, postgres, clickhouse, minio (optional) | individuals, startups, teams |
| Scaled self-hosted | server split into api / ingest / worker processes; external DBs | larger installs |
| Kubernetes | optional manifests/Helm, later phase | platform teams |

The server app is deliberately **one process with internal module boundaries** (api,
ingest, worker, agent) that can be split via flags when scale demands it — three boring
services, not ten fragile ones. Self-hosted data stays self-hosted: the only egress is
to providers the operator explicitly configures (e.g. their chosen LLM endpoint).

## 10. Prior art — what we take, what we reject

Researched, not cloned (licenses verified 2026-08; see ADR-0001 for citations):

| Project | Take | Reject |
| --- | --- | --- |
| Sentry (FSL, not OSI) | Issue grouping UX, DSN model, release health concepts | License model; platform breadth-first sprawl; we are OSS end-to-end |
| GlitchTip (MIT) | Proof that lightweight + Postgres-first onboarding works | Postgres-only telemetry (caps analytical depth) |
| SigNoz (permissive core + ee) | ClickHouse for telemetry at OSS scale | Heavier operational footprint than our target |
| Grafana/Uptrace (AGPL) | Dashboards discipline, OTel nativeness | AGPL friction for adopters/embedders (ADR-0001) |
| Better Stack / incident.io | Incident lifecycle UX, timelines, escalation ergonomics | Closed platforms; incident-only scope |
| Honeycomb | Query-first debugging culture, trace-centric workflows | Proprietary event model |
| Modern coding agents | Tool-call discipline, evaluation fixtures, sandboxing | Chat-first UX (Rivet's agent surface is an evidence timeline) |

## 11. Cross-cutting requirements

- **Security:** secrets never enter prompts/logs; PII redaction server-side and
  SDK-side; org-scoped isolation everywhere; immutable audit log; supply-chain hygiene
  (lockfiles, pinned actions, minimal CI permissions).
- **Privacy & data ownership:** retention policies per data class; deletion that
  actually deletes; documented AI data paths; AI can be disabled entirely while
  observability keeps working; local-model support for air-gapped installs.
- **Performance targets** (measured once the surfaces exist, tracked per phase):
  dashboard interactive ~1s on normal datasets; issue creation near-real-time; critical
  alerts in seconds; agent start immediate on policy trigger; search interactive.
- **Accessibility:** WCAG AA, keyboard-first, reduced-motion support — see the
  [design language](../design/design-language.md).
- **Self-observability:** Rivet instruments itself with OpenTelemetry and, once the
  demo app exists, continuously dogfoods its own detection→fix loop.

## 12. Honest risks

| Risk | Mitigation |
| --- | --- |
| Scope is enormous | Vertical slices; phase gates; "does this make debugging materially better?" test before any feature |
| ClickHouse ops burden for small installs | Single-node default, documented backups; Postgres-only mode is deliberately *not* offered to avoid a second telemetry path |
| Agent safety regressions | Invariants as tested code (`@rivet/types`), highest-severity security class, extra review on gate-adjacent PRs |
| LLM cost blowups | Per-org caps, token/step/duration budgets, cost observability in Phase 9 |
| Name collision ("Rivet" is used by unrelated projects) | Tracked in ROADMAP (naming/trademark review); no trademark claims made |
| Solo-maintainer bus factor | Governance designed for maintainer growth; docs written so a new maintainer needs no oral history |
