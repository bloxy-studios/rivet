# Rivet Roadmap

This roadmap communicates direction, not dates. Phases land as vertical slices — every
phase produces something usable. The authoritative, rung-by-rung breakdown lives in
[docs/plan/phase-plan.md](./docs/plan/phase-plan.md).

## Now

- **Phase 0 — Foundation** (this repository state): governance, license, ADRs,
  toolchain, design language, shared domain primitives (`@rivet/types`).
- **Phase 1 — OSS platform core**: control-plane database and migrations,
  authentication, organizations/projects/environments/services, API keys and DSNs,
  the web app shell with the design system, and `docker compose` self-hosting with
  seeded demo data.

## Next

- **Phase 2 — Error monitoring**: the Rivet event envelope, ingestion API with DSN
  auth and rate limiting, ClickHouse-backed event storage, the grouping engine,
  issues (states, regression detection), issue list/detail UI, structured search,
  the JavaScript/Node SDK, and a demo app that produces real failures.
- **Phase 3 — Observability**: native OTLP ingest for traces/logs/metrics, trace
  waterfall UI, log exploration with facets and live tail, releases and deployment
  correlation, and performance views (p50/p75/p95/p99).

## Later

- **Phase 4 — Integrations**: provider registry, GitHub App (commits, PRs, checks),
  Slack, Telegram, email providers, signed outbound webhooks, notification engine
  (dedup, cooldown, escalation).
- **Phase 5 — Incidents**: severity model, impact scoring, incident lifecycle,
  escalation policies, SLOs and error budgets.
- **Phase 6 — Agent investigation**: agent runtime (orchestrator, tool system,
  capability enforcement, state machine, audit log), evidence graph, root-cause
  analysis, investigation timeline UI, agent chat with authorized actions.
- **Phase 7 — Agent fixing**: repository access, execution sandbox, branch creation,
  minimal-fix generation, validation pipeline (format → lint → typecheck → tests →
  reproduction), PR generation with evidence.
- **Phase 8 — Human approval & deployment**: artifact-bound approvals, deployment
  providers, post-deploy verification, explicit rollback policies.
- **Phase 9 — Agent-native platform**: MCP server, AI/LLM observability (tokens,
  cost, loops, tool failures), agent evaluation fixtures and benchmarks.

## Exploring

- Rust ingestion path for high-throughput telemetry processing
- Session replay and profiling as strictly modular features
- Kubernetes/Helm/Terraform deployment options (compose remains the default)
- Local model support hardening (Ollama / OpenAI-compatible endpoints)
- Project naming/trademark review (the "Rivet" name is shared with unrelated projects)
- Additional SDKs (Python, Go, Rust) and community SDK conventions
