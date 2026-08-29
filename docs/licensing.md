# Licensing

Rivet is licensed under the **Apache License 2.0** — the platform, the SDKs, the
examples, the infrastructure code, and this documentation. There is no `ee/` directory,
no dual license, and no open-core boundary inside this repository. The full rationale,
alternatives considered (MIT, AGPLv3, MPL-2.0, FSL/BSL), and consequences are recorded
in [ADR-0001](./adr/0001-license-apache-2.0.md).

## What this means

- **Self-hosters** may run, modify, and redistribute Rivet freely, including
  commercially. Your telemetry is yours; so is your copy of the code.
- **SDK users**: embedding a Rivet SDK in your application imposes no copyleft
  obligations on your application. The Apache-2.0 patent grant travels with the code.
- **Contributors**: inbound = outbound. Contributions are licensed Apache-2.0, certified
  by a [DCO](https://developercertificate.org/) sign-off (`git commit -s`). No CLA, no
  copyright assignment — which also means the community's contributions cannot be
  unilaterally relicensed later.
- **Future hosted offering** (if any) must be built around the OSS core, not by
  withholding core functionality. Any intentionally cloud-only feature must be
  documented as such, explicitly ([GOVERNANCE.md](../GOVERNANCE.md), ADR-0001).

## Dependency license policy

Every dependency (including transitive, where practical) must be compatible with
distributing Rivet under Apache-2.0.

| Category | Licenses | Policy |
| --- | --- | --- |
| Allowed | MIT, Apache-2.0, BSD-2/3-Clause, ISC, 0BSD, BlueOak-1.0.0, Unicode/W3C licenses | Use freely |
| Allowed with care | MPL-2.0, LGPL (dynamic/module boundary only) | Keep unmodified; note in PR |
| Forbidden in the repo | GPL, AGPL, SSPL, BSL, FSL, Elastic License, "fair use"/non-commercial, proprietary | Do not add |
| Case-by-case | CC licenses for assets, dual-licensed packages | Maintainer review |

Process:

1. A PR adding a dependency states the dependency's license in the PR description
   (the template asks).
2. An automated license-audit CI gate is planned for Phase 1 (PR-5, alongside the
   self-hosting rung); until then this is enforced in review.
3. Notable third-party components are credited in [`NOTICE`](../NOTICE) when their
   license requires attribution beyond the lockfile.

Tooling containers and infrastructure images (Postgres, ClickHouse, MinIO, etc.) are
*used*, not distributed as part of this repository; their licenses (PostgreSQL License,
Apache-2.0, AGPL for MinIO respectively) apply to those projects and are documented in
the self-hosting guides as they land. AGPL infrastructure used **as an unmodified,
separate service** (e.g. MinIO over the S3 API) does not affect Rivet's license; we do
not link against or modify it — and the `StorageProvider` interface means any
S3-compatible store works.

## Documentation, examples, and generated assets

- Documentation and example code: Apache-2.0, same as everything else — copy freely
  with attribution per the license.
- Logos/brand assets, if/when they exist, may carry separate usage guidelines
  (trademark, not copyright).
- Generated assets committed to the repo (diagrams, fixtures) must have redistributable
  provenance; assets with unclear rights are not committed.

## Trademark honesty

"Rivet" is a name used by unrelated software projects (among others: an ASF Tcl/Apache
module, a game-backend platform, and an open-source AI IDE by Ironclad). This project
currently makes **no trademark claims**; a naming/trademark review is tracked in
[ROADMAP.md](../ROADMAP.md) under Exploring. Nothing about copyright licensing depends
on that outcome.
