# ADR-0002: Bun + Turborepo + TypeScript strict + Biome + Vitest; source-only internal packages

- **Status:** Accepted
- **Date:** 2026-08-29
- **Deciders:** Bloxy Studios (project steward)
- **Phase/rung:** Phase 0 (PR-0, repository foundation)

## Context

The repository began as a `create-turbo` scaffold already committed to Bun (pinned
`bun@1.4.0`, `bunfig.toml` with `exact = true`, Vercel builds on the Bun runtime) and
Turborepo, with a mixed lint story (ESLint config package *and* per-app Biome configs
*and* root Prettier). The founding mandate requires: TypeScript-first, Bun where
appropriate, a lightweight contributor experience (`bun install && bun dev`), and
reproducible development. A monorepo this large lives or dies by consistent conventions
set before code volume arrives.

## Decision

1. **Runtime & package manager: Bun**, pinned exactly (`packageManager: bun@1.4.0`,
   `engines.bun >= 1.4.0`), lockfile committed, `--frozen-lockfile` in CI. Node ≥ 24
   compatibility is preserved for SDK consumers — SDKs must run on Node, browsers, and
   edge runtimes, never Bun-only.
2. **Task orchestration: Turborepo** with the standard task names `build`, `dev`,
   `lint`, `typecheck` (the scaffold's `check-types` is renamed).
3. **TypeScript strict everywhere**, presets shared via `@repo/typescript-config`.
   Product packages add `noUncheckedIndexedAccess` (inherited) and
   `exactOptionalPropertyTypes`.
4. **Biome is the only linter/formatter.** One root `biome.json` (Next/React domains
   enabled); the ESLint config package and Prettier from the scaffold are removed.
5. **Vitest for tests**, single root config discovering `packages/*/src/**/*.test.ts`.
   Coverage gates (≥95% branch on money/date/grouping-critical pure packages) attach in
   the rungs that introduce those packages.
6. **Internal packages are source-only**: `exports` point at `./src/index.ts`; no build
   step. Next.js and Bun consume TS sources directly. Published artifacts (`sdks/*`,
   `apps/cli`) get real build pipelines in their own rungs — publishing is the
   exception that justifies a build.
7. **Naming:** product packages use the `@rivet/*` scope; `@repo/*` marks inherited
   starter tooling, retired opportunistically.
8. **Pure packages are framework-free** (domain, validation, grouping, query): no
   framework, database, or network imports. Enforced by review now; a
   `scripts/check-boundaries` CI gate lands with the first pure-logic package (Phase 2).

## Alternatives considered

- **pnpm / npm workspaces** — fine tools, but the repo is already Bun-pinned end to end
  (local, CI, Vercel builds); switching adds churn with no capability gain.
- **ESLint + Prettier** — two configs, plugin churn, slower; Biome covers the need in
  one fast tool. The scaffold's per-app Biome configs proved the direction; hoisting to
  a single root config removes drift.
- **`bun test` instead of Vitest** — attractive (zero deps), but Vitest's project
  matrix, coverage tooling, jsdom environment (needed for UI packages later), and
  ecosystem compatibility (e.g. testing-library) matter more; revisit only if Vitest
  becomes a bottleneck.
- **Built internal packages (tsup/tsdown)** — build steps, watch pipelines, and
  stale-artifact bugs for zero benefit while every consumer bundles TS natively.
- **Rust workspace now** — the mandate reserves Rust for measured ingest hot paths;
  introducing a second toolchain before profiling data exists is prestige, not
  engineering. Revisit with ingest benchmarks (Phase 3+).

## Consequences

- One-command contributor experience holds: `bun install && bun run check`.
- CI is simple and fast (single toolchain, no build artifacts for internal packages).
- Bun-pinning risk: Bun regressions affect everyone at once; mitigated by exact pinning
  and CI on every PR. SDK packages must add Node-runtime CI when they land (tracked in
  the phase plan) so Bun-only APIs cannot leak into published code.
- TypeScript 7 (native tsc) is inherited from the scaffold; if workspace tooling hits
  incompatibilities, pinning back to 5.x in affected packages is a contained change.
- Renaming `check-types` → `typecheck` is a one-time break for muscle memory; done now,
  before habits form.
