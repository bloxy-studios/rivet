# Changelog

All notable changes to Rivet are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
once versioned releases begin.

## [Unreleased]

### Added

- `@rivet/database`: control-plane Postgres schema v1 (organizations, users,
  memberships, teams, projects, environments, services, API keys, DSNs) with
  committed SQL migrations, an idempotent demo seed, a postgres.js client
  factory, and PGlite-backed constraint tests that re-prove from-zero
  migrations on every run (ADR-0006).
- `@rivet/types`: organization role constants (`ORG_ROLES`) with privilege
  ranking, consumed by database CHECK constraints.
- `infrastructure/compose/dev.yml`: Postgres 17 for local development, plus
  root `db:generate` / `db:migrate` / `db:seed` scripts and `.env.example`.
- Repository foundation: OSS governance, Apache-2.0 license, docs program,
  foundation ADRs (license, toolchain, storage, telemetry protocol, agent
  safety invariants), phase plan, and design language.
- `@rivet/types`: shared severity, issue-state, evidence-level, agent
  capability, and agent run state-machine primitives with invariant tests.

### Changed

- Unified linting/formatting on Biome with a single root config; retired the
  ESLint + Prettier scaffolding from `create-turbo`.
