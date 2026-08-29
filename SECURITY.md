# Security Policy

Rivet is a reliability platform with an agentic component that can read telemetry,
inspect repositories, and prepare code changes. We treat the boundaries around that
power as the most security-critical part of the project.

## Reporting a vulnerability

**Do not open a public issue for security reports.**

Report vulnerabilities privately via
[GitHub private vulnerability reporting](https://github.com/bloxy-studios/rivet/security/advisories/new)
("Report a vulnerability" on the repository's Security tab).

Please include: affected component/version (or commit), reproduction steps or a proof
of concept, impact assessment, and any suggested remediation. We are grateful for
reports even when you are not sure something qualifies.

## What to expect

- **Acknowledgement** within 72 hours.
- **Triage and severity assessment** within 7 days.
- Coordinated disclosure: we ask that you give us reasonable time to fix an issue before
  public disclosure; we will credit reporters (unless you prefer otherwise) in the
  release notes.
- Fixes for confirmed vulnerabilities may be developed in a private fork and released
  with the disclosure.

## Scope and severity

Highest-severity classes — anything that breaks the platform's safety invariants
([ADR-0005](./docs/adr/0005-agent-safety-invariants.md)):

- Bypassing or forging the **production approval gate** (including stale-artifact
  approval reuse)
- **Capability escalation** — an agent tool acting beyond its granted capabilities,
  or `DEPLOY_PRODUCTION` / `ROLLBACK_PRODUCTION` becoming reachable without explicit
  policy
- **Sandbox escape** from agent code execution
- **Secret exposure** — credentials reaching model prompts, logs, or telemetry
- **Prompt-injection paths** that convert retrieved content (telemetry, logs, source,
  web pages) into unauthorized actions
- Cross-tenant data access (organization/project isolation failures)

Also in scope: authentication/authorization flaws, SSRF/injection in ingestion paths,
signature bypass on webhooks, and supply-chain issues in this repository's build.

Out of scope: vulnerabilities exclusively in third-party dependencies (report upstream —
though we still want to know so we can pin/patch), volumetric denial of service against
your own self-hosted instance, and social engineering.

## Supported versions

Pre-1.0, only the latest release (and `main`) receive security fixes. A formal support
matrix will be published with 1.0.

## Safe harbor

We will not pursue legal action for good-faith security research that respects user
data and privacy, avoids service disruption of instances you do not own, and follows
this disclosure process.
