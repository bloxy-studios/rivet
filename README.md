# Rivet

**An open-source autonomous reliability engineer.**

[![CI](https://github.com/bloxy-studios/rivet/actions/workflows/ci.yml/badge.svg)](https://github.com/bloxy-studios/rivet/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

Traditional monitoring tells developers *something broke*. Traditional observability helps
them discover *what happened*. Rivet is built to go further:

```
Something broke.
  ↓ Here is the impact.
  ↓ Here is what changed.
  ↓ Here is the most likely root cause — and the evidence.
  ↓ I prepared a minimal fix and tested it.
  ↓ Here is the pull request.
  ↓ Production deployment requires your approval.
  ↓ You approved it. I deployed it.
  ↓ I verified the issue is gone.
```

The defining workflow is **Detect → Understand → Investigate → Fix → Validate → Ask →
Deploy → Verify**. Agents do the exhausting work; humans keep control over consequential
production changes. That gate is not a setting — it is an architectural invariant
(see [ADR-0005](./docs/adr/0005-agent-safety-invariants.md)).

## What Rivet is

- **Error monitoring** with intelligent grouping, issues, and regression detection
- **Observability** that is OpenTelemetry-native: traces, logs, and metrics
- **Incident response** with severity, impact scoring, and escalation
- **An agentic incident engine** that investigates, finds root cause with graded
  evidence, prepares the smallest safe fix, validates it, and opens a PR
- **Open source and self-hostable first** — bring your own infrastructure, your own
  LLM provider (including local models), and your own integrations

## What Rivet is not

- Not a proprietary SaaS with a source-code marketing page — the OSS core is the product
- Not a wall of dashboards — the default view answers "is my application healthy?"
- Not a chatbot bolted onto an error tracker — agent output is an evidence timeline
- Not an autonomous deployer — production changes require explicit, artifact-bound
  human approval, by default and by design

## Status

Rivet is **pre-alpha**. The foundation (governance, ADRs, toolchain, design language)
is merged and Phase 1 is underway: the control-plane database, authentication, and the
API server exist with full test batteries. It is not yet a usable monitoring product. Follow the [roadmap](./ROADMAP.md) and the
[phase plan](./docs/plan/phase-plan.md).

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Foundation: governance, ADRs, toolchain, design language | ✅ merged |
| 1 | OSS platform core: auth, orgs/projects, self-hosting | 🚧 in progress |
| 2 | Error monitoring: ingestion, grouping, issues, SDK | queued |
| 3 | Observability: OTLP traces/logs/metrics, releases | queued |
| 4 | Integrations: GitHub, Slack, Telegram, email, webhooks | queued |
| 5 | Incidents: severity, impact, escalation, SLOs | queued |
| 6 | Agent investigation: runtime, tools, evidence, root cause | queued |
| 7 | Agent fixing: sandbox, branches, validation, PRs | queued |
| 8 | Human approval: gate, deployment, verification, rollback | queued |
| 9 | Agent-native platform: MCP, AI observability, cost tracking | queued |

## Getting started (contributors)

Prerequisites: [Bun](https://bun.sh) ≥ 1.4.0.

```sh
git clone https://github.com/bloxy-studios/rivet.git
cd rivet
bun install

bun run check        # lint + typecheck + tests
bun run dev          # runs the (placeholder) web and docs apps
```

What works today: the toolchain; `@rivet/types`, `@rivet/database`, and `@rivet/auth`
with their test batteries; the control-plane API server (`apps/server`: auth, org/project
CRUD, API-key and DSN issuance); and two placeholder Next.js apps. Everything else lands rung by rung — see the
[phase plan](./docs/plan/phase-plan.md). Commands in this README are CI-verified; if a
documented command does not work, that is a bug — please report it.

## Repository map

```
rivet/
├── apps/
│   ├── web/          # Rivet web UI (placeholder — becomes the product shell in Phase 1)
│   ├── server/       # Control-plane API: auth, tenant CRUD, credential issuance (current)
│   └── docs/         # Documentation site (placeholder)
├── packages/
│   ├── types/        # @rivet/types — shared domain primitives + safety invariants
│   ├── database/     # @rivet/database — control-plane schema, migrations, seed
│   ├── auth/         # @rivet/auth — identity engine + session/role guards
│   ├── typescript-config/  # shared tsconfig presets (@repo/*: starter tooling)
│   └── ui/           # shared React components (placeholder — becomes @rivet/ui)
├── infrastructure/   # dev compose (Postgres); full self-host stack lands in PR-5
├── docs/
│   ├── architecture/ # system architecture
│   ├── adr/          # architecture decision records
│   ├── plan/         # phase plan / PR ladder
│   ├── design/       # design language (research-grounded)
│   ├── development/  # contributor guides
│   └── self-hosting/ # self-hosting posture and (future) guides
└── .github/          # CI, issue and PR templates
```

Planned additions (`apps/cli`, `packages/agent-core`,
`sdks/*`, `infrastructure/*`, `examples/*`) are introduced by their phases — directories
appear when they contain something real.

## Principles

1. **Signal, not noise.** Surface what broke, who is affected, what changed, and what
   Rivet recommends — not two hundred dashboards.
2. **Observability leads to action.** Error → trace → commit → root cause → validated
   fix → approval → verification, as one workflow.
3. **Agents are bounded.** Explicit tools, explicit capabilities, audited actions,
   sandboxed execution. `DEPLOY_PRODUCTION` and `ROLLBACK_PRODUCTION` are denied by
   default.
4. **The model is never the authorization layer.** Policy is enforced outside the LLM.
5. **Bring your own everything.** Model provider, database, storage, SCM, notifications,
   deployment target — behind documented interfaces.
6. **Self-hosting is first-class.** `docker compose up` is the target, Kubernetes is
   optional, and your telemetry is yours.
7. **Lightweight over clever.** Three boring services beat ten fragile ones.
8. **Evidence over confidence.** Findings carry OBSERVED / INFERRED / HYPOTHESIZED /
   CONFIRMED levels; confidence is computed from evidence, never asserted by a model.

## Documentation

| Document | Purpose |
| --- | --- |
| [Architecture overview](./docs/architecture/overview.md) | System design, storage, agent architecture |
| [ADR index](./docs/adr/README.md) | Why the architecture is the way it is |
| [Phase plan](./docs/plan/phase-plan.md) | The PR ladder from here to a working product |
| [Design language](./docs/design/design-language.md) | UI direction, grounded in real product research |
| [Licensing](./docs/licensing.md) | License rationale and dependency policy |
| [Getting started](./docs/development/getting-started.md) | Contributor setup |
| [Vercel deployment](./docs/development/vercel-deployment.md) | Deploying the apps to Vercel |
| [Self-hosting](./docs/self-hosting/README.md) | Deployment posture (compose-first) |

## Contributing

Rivet is built to be contributed to — see [CONTRIBUTING.md](./CONTRIBUTING.md) for setup,
conventions (Conventional Commits + DCO sign-off), and how changes land as small,
reviewable PRs. Major changes go through the lightweight RFC process described in
[GOVERNANCE.md](./GOVERNANCE.md).

## Security

Please report vulnerabilities privately — see [SECURITY.md](./SECURITY.md). Reports that
touch the agent safety invariants (approval gate, sandbox, capability system) are treated
as highest severity.

## License

[Apache-2.0](./LICENSE) — for the platform, the SDKs, and the documentation.
See [docs/licensing.md](./docs/licensing.md) for the reasoning and the dependency
license policy.
