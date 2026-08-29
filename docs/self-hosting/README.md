# Self-Hosting Rivet

**Status: posture only.** The shippable self-hosting stack lands in Phase 1
(PR-5 in the [phase plan](../plan/phase-plan.md)). This page records the commitments it
will be built against, so they are reviewable now and testable then.

## Commitments

1. **Self-hosting is first-class.** The OSS distribution is the complete product — not
   a demo tier. If a future hosted offering exists, it may add managed convenience,
   never subtract core capability ([ADR-0001](../adr/0001-license-apache-2.0.md),
   [GOVERNANCE.md](../../GOVERNANCE.md)).
2. **`docker compose up` is the deployment baseline.** Target footprint
   ([ADR-0003](../adr/0003-storage-architecture.md)): `web`, `server` (api + ingest +
   worker in one process, splittable by flags), `postgres`, `clickhouse`, and optional
   `minio`. Kubernetes/Helm/Terraform are optional later additions, never requirements.
3. **You own your data.** Telemetry stays on your infrastructure. Rivet sends nothing
   to Rivet-controlled servers. The only egress is to providers *you* configure —
   e.g. your chosen LLM endpoint — and the AI data path (what telemetry/code/logs are
   sent to which model, and how to redact or disable it) will be documented explicitly.
   AI can be disabled entirely while observability keeps working.
4. **Bring your own model.** `ModelProvider` supports hosted providers and
   local/OpenAI-compatible endpoints (Ollama-style), for privacy-sensitive and
   air-gapped installs.
5. **Operability is documented, not hidden**: what services run, which ports, where
   data lives, how backups/restores work (Postgres *and* ClickHouse, tested), how
   upgrades and migrations run, how to scale, how to troubleshoot.
6. **Reproducible**: pinned images, versioned migrations, seed scripts, `.env.example`
   with every variable documented. No manual SQL for normal upgrades.

## What will exist after Phase 1 / PR-5

- `infrastructure/compose/` with the footprint above + health checks
- A from-scratch install guide (clean machine → login screen), smoke-tested in CI
  where feasible
- Backup & restore procedures with worked examples
- An upgrade guide (image bump + migration run)

Until then, contributors run the dev flow in
[../development/getting-started.md](../development/getting-started.md).
