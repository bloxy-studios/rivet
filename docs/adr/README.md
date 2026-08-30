# Architecture Decision Records

ADRs record decisions that shape the system: context, the decision, alternatives
actually considered, reasoning, and consequences (including the unpleasant ones).
**Accepted ADRs are binding** — code that contradicts an accepted ADR is a bug in the
code or a reason to supersede the ADR, never something to merge quietly.

## Process

- Propose an ADR as a PR adding a numbered file based on [template.md](./template.md).
- Discussion happens on the PR. Acceptance follows [GOVERNANCE.md](../../GOVERNANCE.md)
  (architectural decisions require maintainer review; major ones follow the RFC process
  first).
- ADRs are immutable once accepted: changing course means a new ADR that supersedes the
  old one, with a link in both directions.
- Statuses: `Proposed`, `Accepted`, `Superseded by ADR-XXXX`, `Rejected`.

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0001](./0001-license-apache-2.0.md) | Apache-2.0 for the entire repository; DCO instead of a CLA | Accepted |
| [0002](./0002-monorepo-toolchain.md) | Bun + Turborepo + TypeScript strict + Biome + Vitest; source-only internal packages | Accepted |
| [0003](./0003-storage-architecture.md) | Postgres control plane, ClickHouse telemetry, S3-compatible blobs | Accepted |
| [0004](./0004-telemetry-protocol.md) | OTLP-native signals + versioned Rivet error envelope | Accepted |
| [0005](./0005-agent-safety-invariants.md) | Agent safety invariants: capabilities, approval gate, sandbox, audit | Accepted |
| [0006](./0006-orm-and-migrations.md) | Drizzle ORM + postgres.js, committed SQL migrations, PGlite-backed tests | Accepted |
| [0007](./0007-authentication.md) | Better Auth as identity engine; Rivet memberships as the only authorization authority | Accepted |
| [0008](./0008-server-framework.md) | Hono on Bun for the server (fetch-native, runtime-portable) | Accepted |

## Queued decisions

These are known upcoming decisions, each taken in the rung that needs it (see the
[phase plan](../plan/phase-plan.md)) so they are made with working context, not
speculation:

| # | Decision | Phase |
| --- | --- | --- |
| 0009 | Job queue / scheduling runtime (Postgres-backed first?) | 2 |
| 0010 | Grouping algorithm v1 (fingerprint strategy) | 2 |
| 0011 | Search query grammar | 2 |
| 0012 | Sampling strategy (head/dynamic/tail) | 3 |
| 0013 | Integration/plugin loading model | 4 |
| 0014 | ModelProvider abstraction + fallback semantics | 6 |
| 0015 | Sandbox technology for agent code execution | 7 |
| 0016 | MCP server surface + authorization | 9 |
