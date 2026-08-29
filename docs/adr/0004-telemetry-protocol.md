# ADR-0004: OTLP-native signals + a versioned Rivet error envelope

- **Status:** Accepted
- **Date:** 2026-08-29
- **Deciders:** Bloxy Studios (project steward)
- **Phase/rung:** Phase 0 (binding on Phase 2–3 implementations)

## Context

Rivet needs wire formats for four signal types: errors, traces, logs, metrics. The
mandate: OpenTelemetry is a first-class citizen; avoid proprietary telemetry formats
where possible; Rivet may define an enriched event format for error-monitoring features
(grouping, incidents, agent context) but must remain interoperable. Error monitoring
needs semantics OTel does not natively organize around: grouping fingerprints,
breadcrumbs, user impact, release health, attachments, and SDK-side scrubbing hooks.

## Decision

1. **Traces, logs, and metrics: OTLP is the native protocol.** The server exposes
   standard OTLP/HTTP endpoints (`/v1/traces`, `/v1/logs`, `/v1/metrics`), protobuf and
   JSON encodings. Any OTel-instrumented application or collector can point at Rivet
   with zero Rivet-specific code. No proprietary trace/metric format exists.
2. **Errors: the Rivet event envelope**, a versioned JSON format
   (`schema_version`, currently `1` — exported as `RIVET_SCHEMA_VERSION` in
   `@rivet/types`) carrying the normalized error event model: identifiers, timestamps,
   org/project/environment/release/service/transaction, level, message, exception with
   structured stacktrace, breadcrumbs, user, request, tags, contexts, trace/span IDs
   for correlation, runtime/OS/device metadata, and attachment references. The full
   field schema is specified and validated in `@rivet/validation` (Phase 2) — the
   envelope is *defined by its Zod schema*, not by prose.
3. **Bridging, both directions:**
   - OTel exception records (span events / logs following OTel exception semantic
     conventions) are mapped into the error pipeline, so **OTel-only applications get
     issues and grouping without any Rivet SDK** — degraded (no breadcrumbs/user
     context) but genuinely useful.
   - Rivet SDKs attach `trace_id`/`span_id` to error events so errors deep-link into
     OTLP traces.
4. **Versioning policy:** every envelope carries `schema_version`; the server accepts
   all published versions with documented migration mappings; versions are deprecated
   with an announced window, never silently dropped. Additive changes do not bump the
   version; semantic changes do.
5. **Transport discipline:** HTTPS-only, DSN-authenticated at project scope,
   compression supported, explicit backpressure signaling (429 + `Retry-After`) that
   SDKs must respect.

## Alternatives considered

- **Sentry envelope compatibility** — would let existing Sentry SDKs point at Rivet.
  Rejected: couples Rivet's data model to a competitor's evolving proprietary protocol,
  invites subtle-incompatibility hell, and contradicts the "establish your own
  identity, do not clone" mandate. Interop energy goes to OTel instead — the actual
  standard.
- **Pure OTel for errors too** — tempting purity, but grouping hints, breadcrumbs,
  user-impact semantics, and attachments would live as unstandardized attribute
  conventions — a proprietary format wearing an OTel costume, with worse ergonomics.
  The honest design is a small, explicit, versioned envelope for the one signal OTel
  doesn't model well, and true OTel for everything OTel models well.
- **gRPC OTLP from day one** — adds server complexity before demand; OTLP/HTTP is
  universally supported by SDKs and collectors and is browser-friendly. gRPC can be
  added behind the same endpoints later without breaking anyone.
- **Accepting unversioned events** — every mature ingestion system regrets this within
  a year. Rejected outright; `schema_version` is required from the first accepted byte.

## Consequences

- Rivet works with the OTel ecosystem (SDKs, collectors, auto-instrumentation) on day
  one of Phase 3, and OTel-only shops get real value with zero lock-in.
- Rivet owns exactly one wire format — the error envelope — and it is small, versioned,
  and schema-defined; SDK authors implement against `@rivet/validation` fixtures.
- The OTel-exception bridge means two paths produce error events; the pipeline treats
  the envelope as canonical and the bridge as a mapper into it — one grouping engine,
  one issue model.
- Supporting old schema versions indefinitely has a cost; bounded by the deprecation
  policy.
- Revisit triggers: OTel standardizes richer exception/error semantics (fold the
  envelope toward it), or profiling/replay signals arrive (each gets its own ADR).
