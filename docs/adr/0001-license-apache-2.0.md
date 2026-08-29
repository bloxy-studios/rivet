# ADR-0001: Apache-2.0 for the entire repository; DCO instead of a CLA

- **Status:** Accepted
- **Date:** 2026-08-29
- **Deciders:** Bloxy Studios (project steward)
- **Phase/rung:** Phase 0 (PR-0, repository foundation)

## Context

Rivet is an OSS-first project: the open-source distribution must be genuinely useful,
self-hostable, and extensible, with no crippled core. The license must simultaneously

1. maximize adoption by individuals, startups, and enterprises (including those with
   strict license policies),
2. keep SDKs embeddable in *any* application (SDK code links into user apps — its
   license leaks into theirs),
3. support a community ecosystem of integrations, SDKs, and agent tools,
4. leave room for an optional hosted offering later **without** relicensing games, and
5. be an OSI-approved open-source license.

The observability landscape (verified against primary sources, 2026-08):

- **Sentry** relicensed from BSL to **FSL-1.1-Apache-2.0** — source-available, not
  OSI-approved; each release converts to Apache-2.0 after two years
  ([getsentry/sentry LICENSE.md](https://github.com/getsentry/sentry/blob/master/LICENSE.md)).
- **Grafana** moved its core from Apache-2.0 to **AGPLv3** in 2021; **Uptrace** and
  **OpenObserve** are AGPLv3.
- **SigNoz** and **PostHog** use a permissive core with separate `ee/` directories under
  commercial terms.
- **GlitchTip** is MIT. **OpenTelemetry** — the standards layer Rivet builds on — is
  **Apache-2.0**, as are Prometheus and Kubernetes.

## Decision

1. **Every part of this repository is licensed Apache-2.0**: platform, SDKs, examples,
   infrastructure, and documentation. One license, no `ee/` directory, no dual-license
   boundary to police.
2. A `NOTICE` file is maintained per Apache-2.0 §4(d).
3. Contributions are accepted under **inbound = outbound** (Apache-2.0) with a
   **Developer Certificate of Origin sign-off** (`git commit -s`). **No CLA, no
   copyright assignment.**
4. If a hosted Rivet Cloud ever exists, it is built *around* the OSS core (managed
   infrastructure, operations, support) — never by withholding or relicensing core
   functionality (see master build mandate §5 and GOVERNANCE.md).

## Alternatives considered

- **MIT** — maximally simple, but no express patent grant or patent-retaliation clause.
  Rivet sits in a space (observability + AI agents) where patent exposure is real;
  Apache-2.0's §3 grant protects users and contributors at negligible cost. Rejected.
- **AGPLv3** (Grafana model) — the strongest defense against cloud-provider free-riding.
  Rejected because: (a) many target adopters ban AGPL outright, shrinking the community
  Rivet needs more than it needs fork-protection; (b) SDKs cannot be AGPL (they link
  into user applications), forcing a split-license repo and constant boundary policing;
  (c) network-copyleft obligations are exactly wrong for a tool whose self-hosters often
  modify internals; (d) Grafana's relicense was possible *because* of its CLA — pairing
  AGPL with "no CLA" (which we want for trust reasons) locks in maximal friction with
  none of the strategic flexibility.
- **MPL-2.0** — file-level copyleft middle ground. Rejected: unfamiliar in this
  ecosystem's compliance departments relative to Apache-2.0, does not meaningfully
  prevent managed-service competition either, and still complicates SDK vendoring.
- **FSL / BSL / SSPL** (Sentry path) — explicitly rejected: not OSI-approved, so Rivet
  would not be open source, contradicting the founding mandate ("source available means
  genuinely useful source" *and* OSS). The two-year Apache conversion does not fix the
  present-tense problem.
- **CLA instead of DCO** — rejected after weighing: CLAs add signup friction, centralize
  relicensing power (the exact move that has burned OSS communities), and provide little
  provenance value beyond DCO. DCO is the Linux-kernel-proven lightweight standard. The
  cost we accept: Rivet cannot be unilaterally relicensed later. That is a feature — it
  is the project's credible commitment to staying open.

## Consequences

- Anyone — including cloud vendors — may run, modify, and sell managed Rivet. Accepted.
  Realistic mitigations are execution speed, community gravity, and (eventually) a
  trademark policy for the name — not license restrictions.
- Enterprise and privacy-sensitive adopters can use Rivet without legal review friction;
  the patent grant travels with the code.
- The full repo is license-uniform: contributors and packagers never need per-directory
  license analysis; SDK embedding is unconditionally safe.
- Dependency discipline is required to keep the tree Apache-compatible — the allowlist
  and process live in [docs/licensing.md](../licensing.md).
- Relicensing is effectively impossible without contacting every contributor. Deliberate.
- Revisit trigger: none anticipated for the license itself; the *trademark* question
  (the "Rivet" name is used by unrelated projects) is tracked separately in ROADMAP.md
  and does not affect copyright licensing.
