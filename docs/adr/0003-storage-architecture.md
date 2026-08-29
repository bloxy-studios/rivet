# ADR-0003: Postgres control plane, ClickHouse telemetry plane, S3-compatible blobs

- **Status:** Accepted
- **Date:** 2026-08-29
- **Deciders:** Bloxy Studios (project steward)
- **Phase/rung:** Phase 0 (binding on Phases 1–3 implementations)

## Context

Rivet stores two workloads with opposite shapes:

- **Control plane** — orgs, users, projects, issues (as aggregates), incidents,
  releases, deployments, agent runs, approvals, audit log. Low volume, transactional,
  relational integrity is safety-relevant (approvals must bind to exact artifacts;
  audit must be trustworthy).
- **Telemetry plane** — error events, spans, logs, metric points. Append-heavy,
  high-volume, queried analytically (group-bys over time windows, percentiles, facets).

The mandate is explicit: "Telemetry should use an architecture optimized for analytical
workloads. Do not put every raw event into PostgreSQL." It is equally explicit that
self-hosting must stay `docker compose`-simple, and that we must not build ten services
where three suffice.

## Decision

1. **PostgreSQL owns the control plane.** All entities with transactional or
   integrity-critical semantics live here, including the immutable audit log and
   artifact-bound approvals.
2. **ClickHouse owns the telemetry plane** — events, spans, logs, metrics — from the
   first ingestion rung (Phase 2). Issue rows in Postgres store aggregates
   (counts, first/last seen, affected-user estimates) plus pointers into ClickHouse;
   raw events are never written to Postgres.
3. **Object storage behind a `StorageProvider` interface** (S3 API; MinIO in compose,
   any S3-compatible service in production) for attachments, replays, profiles, and
   large agent artifacts. Filesystem fallback is permitted for single-node dev only.
4. **No Redis/Valkey by default.** Queues, schedules, and rate-limit state start
   Postgres-backed; Valkey is added only when measurements show Postgres is the
   bottleneck (final queue decision: ADR-0009, Phase 2).
5. **Single-node defaults for both databases** in compose, with documented backup and
   restore procedures as part of the self-hosting docs (Phase 1).
6. **Retention is enforced where the data lives**: ClickHouse TTLs per data class,
   Postgres policies for control-plane artifacts, lifecycle rules for object storage.
   Deletion features must actually delete from all three.

## Alternatives considered

- **Postgres-only (GlitchTip model)** — operationally simplest and tempting for the
  lightweight goal. Rejected: it caps the product at error counting. Percentile
  latency, trace analytics, log facets, and dynamic sampling all demand columnar
  storage; retrofitting ClickHouse later means migrating the hottest data path under
  load. GlitchTip's own positioning (lightweight *error tracking*) confirms the
  ceiling.
- **ClickHouse-only** — wrong semantics for the control plane: no transactional
  guarantees for approvals/audit, painful relational modeling, mutation-hostile.
- **Dedicated TSDB (Prometheus/Mimir/Influx) for metrics** — a third storage system for
  one signal type; ClickHouse handles Rivet-scale metrics acceptably. Revisit only with
  evidence.
- **Kafka/Redpanda in the ingest path now** — durable buffering is a real need at
  scale, but a broker cluster contradicts compose-simplicity for the 99% case.
  In-process batching with disk-spill backpressure first; a broker becomes an *optional*
  scaling profile if measurements demand it (Phase 3 revisit).
- **SQLite dev mode** — a second SQL dialect to maintain and a class of "works locally"
  bugs. Compose makes real Postgres/ClickHouse cheap enough locally.

## Consequences

- Self-host footprint: web + server + postgres + clickhouse (+ minio) — within the
  compose budget, at the cost of operating two databases. Mitigations: single-node
  defaults, health checks, documented backup/restore for both.
- Two query layers to build (`@rivet/database` for Postgres, `@rivet/telemetry-store`
  for ClickHouse) with a hard rule: no cross-plane joins in application code; the
  control plane stores pointers/aggregates instead.
- Ingestion writes become batch-oriented by design (ClickHouse hates dribble inserts) —
  this shapes the Phase 2 ingest pipeline (buffering, backpressure) and is a feature,
  not an accident.
- Telemetry-plane migrations (schema evolution in ClickHouse) need their own tooling
  and discipline; budgeted into Phase 2/3 rungs.
- If a deployment cannot run ClickHouse, it cannot run Rivet. Accepted trade — one
  telemetry path, no second-class mode to maintain.
