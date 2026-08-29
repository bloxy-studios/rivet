# Rivet Governance

Rivet's governance is deliberately lightweight. It exists to make decisions legible and
contributions predictable — not to create bureaucracy. It will evolve as the contributor
base grows; changes to this document land like any other change, via pull request, with
the approval of all current maintainers.

## Roles

- **Users** — anyone running Rivet. Bug reports and feedback are contributions.
- **Contributors** — anyone with a merged pull request, an accepted RFC, triaged issues,
  or documentation improvements.
- **Maintainers** — contributors with merge rights and responsibility for a healthy
  codebase. Maintainers review PRs, steward ADRs/RFCs, cut releases, and handle
  security reports.
- **Lead maintainer** — currently [Bloxy Studios](https://github.com/bloxy-studios),
  the project steward. The lead maintainer breaks ties and holds admin access. As the
  maintainer group grows, the intent is to move tie-breaking to maintainer majority.

## How decisions are made

| Change | Process |
| --- | --- |
| Bug fixes, small improvements, docs | Pull request + one maintainer approval (lazy consensus) |
| New features within existing architecture | Pull request referencing a phase-plan rung or an issue |
| Architectural decisions | ADR in `docs/adr/` reviewed like code; accepted ADRs are binding |
| Major or breaking changes | RFC (see below) before implementation |
| Governance changes | Pull request + approval from all maintainers |

**Lazy consensus:** silence is assent. Reviews should happen within a week; if a change
is uncontroversial and approved, it merges — nobody is required to wait for every
maintainer.

## RFC process

Major changes need an RFC **before** significant implementation work: new telemetry
protocols or schema-breaking changes, breaking API changes, new agent capabilities
(especially anything touching the approval gate or sandbox), major storage changes, and
the plugin system.

1. Open a GitHub issue titled `RFC: <title>` using the structure: problem, proposal,
   alternatives, security/compatibility impact, migration.
2. Discussion happens on the issue. Maintainers aim to reach a decision within two weeks.
3. Accepted RFCs that decide architecture are recorded as ADRs.

Trivial changes never need an RFC. When in doubt, open an issue and ask.

## Becoming a maintainer

Maintainers are added by consensus of existing maintainers, based on a sustained track
record: quality contributions across multiple areas, sound review judgment, and adherence
to the project's safety invariants. There is no minimum-commit count; judgment and
reliability matter more than volume. Maintainers who become inactive for an extended
period may be moved to emeritus status (with thanks, and reinstatement on request).

## Releases

- Versioning follows semantic versioning once versioned releases begin (pre-1.0: minor
  versions may contain breaking changes, always documented in the changelog).
- Releases move through: development → preview → release candidate → stable.
- Each release has a release manager (rotating among maintainers) responsible for the
  changelog, migration notes, and tagging.

## Security team

Security reports are handled privately by the maintainers (see [SECURITY.md](./SECURITY.md)).
Fixes for vulnerabilities may be developed in a private fork and disclosed with the
release, per the security policy.

## Code of conduct

Everyone participating in the project is expected to follow the
[Code of Conduct](./CODE_OF_CONDUCT.md). Maintainers are responsible for enforcement.

## No CLA — DCO instead

Rivet intentionally does **not** require a Contributor License Agreement. Contributions
are accepted under the inbound=outbound norm (Apache-2.0), with a
[Developer Certificate of Origin](https://developercertificate.org/) sign-off asserting
you have the right to contribute the code. This is a deliberate trust commitment: with
no CLA and no copyright assignment, no single party can unilaterally relicense the
community's contributions. The reasoning is recorded in
[ADR-0001](./docs/adr/0001-license-apache-2.0.md).
