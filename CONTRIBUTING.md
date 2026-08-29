# Contributing to Rivet

Thanks for helping build an open-source autonomous reliability engineer. This guide gets
you from a fresh machine to a merged pull request.

## Local setup

Prerequisites: [Bun](https://bun.sh) ≥ 1.4.0 (installs its own toolchain; Node ≥ 24 is
only needed if you run tools outside Bun).

```sh
git clone https://github.com/bloxy-studios/rivet.git
cd rivet
bun install
bun run check    # lint + typecheck + tests — should pass on a clean clone
```

Useful commands:

| Command | What it does |
| --- | --- |
| `bun run check` | The full CI gate: Biome lint, typecheck, tests |
| `bun run lint` / `bun run format` | Biome check / autofix |
| `bun run typecheck` | `tsc --noEmit` in every workspace (via Turborepo) |
| `bun run test` / `bun run test:watch` | Vitest, root config |
| `bun run dev` | Run the apps locally |
| `bunx turbo run dev --filter=web` | Run a single app |

More detail: [docs/development/getting-started.md](./docs/development/getting-started.md).

## Understanding the codebase

Read, in order: the [architecture overview](./docs/architecture/overview.md), the
[ADR index](./docs/adr/README.md) (accepted ADRs are binding), and the
[phase plan](./docs/plan/phase-plan.md) (what's being built next, as a ladder of small
PRs). UI work must follow the [design language](./docs/design/design-language.md).

## Making a change

1. **Find or open an issue** describing the change, unless it is trivial. For major
   changes, use the RFC process in [GOVERNANCE.md](./GOVERNANCE.md) first.
2. **Branch** from `main`: `type/scope-description`, e.g. `feat/grouping-fingerprint`,
   `fix/ingest-rate-limit`, `docs/adr-queue-runtime`.
3. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/)
   (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`), with a DCO sign-off:

   ```sh
   git commit -s -m "feat(ingest): reject events without schema_version"
   ```

   The `-s` flag adds `Signed-off-by: Your Name <you@example.com>`, certifying the
   [Developer Certificate of Origin](https://developercertificate.org/). Rivet uses DCO
   instead of a CLA — see [GOVERNANCE.md](./GOVERNANCE.md).
4. **Test.** Logic ships with tests. Safety-relevant behavior (capability checks, state
   transitions, approval binding, redaction) ships with invariant tests that would fail
   loudly if someone weakened it later.
5. **Open a PR** against `main` and fill in the template honestly — including the
   security and compatibility questions. Small, focused PRs review faster; the project
   itself is built as a ladder of small PRs, and contributions are expected to match
   that shape.

## Quality bar

- `bun run check` passes; CI must be green.
- No fake implementations: no dead buttons, no stubs pretending to work, no examples
  that don't run. Future work belongs in the phase plan, not in mocks.
- No new dependencies without justification in the PR description and a license check
  against the allowlist in [docs/licensing.md](./docs/licensing.md).
- Pure packages (domain logic, validation, grouping) stay framework-free — no imports
  of framework, database, or network code.
- Internal packages are source-only: `exports` point at `./src/index.ts`; no build step.
- Behavior changes update the relevant docs; architectural choices add or amend an ADR.
- Never weaken the agent safety invariants
  ([ADR-0005](./docs/adr/0005-agent-safety-invariants.md)) — including in tests, demos,
  or seed data. PRs that touch them get extra review.

## Adding integrations, SDKs, or agent tools

These are designed to be community-extensible behind documented interfaces
(`NotificationProvider`, `SCMProvider`, `DeploymentProvider`, `ModelProvider`, agent
tools with declared capabilities). The concrete interfaces land with their phases —
Phase 4 (integrations), Phase 2 (SDK conventions), Phase 6 (agent tools). Until then,
open an issue with the `integration` or `sdk` label so the design can account for your
use case.

## Reporting bugs and requesting features

Use the issue templates. For anything security-sensitive, **do not open a public
issue** — follow [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the
[Apache License 2.0](./LICENSE), certified via your DCO sign-off.
