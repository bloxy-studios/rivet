# Rivet Documentation

Documentation is part of the product. This page maps what exists, what is planned, and
where to start.

**Reading order for new contributors:**
[architecture overview](./architecture/overview.md) →
[ADR index](./adr/README.md) →
[phase plan](./plan/phase-plan.md) →
[design language](./design/design-language.md) (for UI work).

## Map

| Area | Contents | Status |
| --- | --- | --- |
| [architecture/](./architecture/overview.md) | System overview: components, data flow, storage, agent architecture, multi-tenancy | ✅ current |
| [adr/](./adr/README.md) | Architecture decision records — accepted ADRs are binding | ✅ 0001–0005 accepted; more queued |
| [plan/](./plan/phase-plan.md) | The phase plan: 9 phases delivered as a ladder of small PRs | ✅ current |
| [design/](./design/design-language.md) | Design language for the product UI, grounded in real product research | ✅ current |
| [licensing.md](./licensing.md) | License rationale, dependency license policy, DCO | ✅ current |
| [development/](./development/getting-started.md) | Contributor setup, workflows, deployment notes | ✅ current |
| [self-hosting/](./self-hosting/README.md) | Self-hosting posture; full guides land with Phase 1 | 🚧 posture only |
| architecture deep dives (ingestion, query, agent runtime, integrations, security) | Per-area design docs | 🚧 land with their phases |
| sdk/ | SDK conventions and per-language guides | 🚧 lands with Phase 2 |
| integrations/ | Per-integration setup and configuration | 🚧 lands with Phase 4 |
| agents/ | Agent concepts, tools, permissions, evaluation | 🚧 lands with Phase 6 |
| api/ | Public API reference (OpenAPI) | 🚧 lands with Phase 2 |

Statuses are honest: a 🚧 area has no content yet beyond what its phase has delivered.
Docs never describe features that do not exist.

## Conventions

- Every major feature ships with: concept docs, setup guide, configuration reference,
  troubleshooting, and security considerations.
- Examples must work. CI verifies the commands documented in the README; example apps
  get their own CI as they land.
- Architectural "why" lives in ADRs; "how it works" lives in `architecture/`; "how do I
  use it" lives in the feature docs.
