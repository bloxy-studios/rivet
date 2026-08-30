# Changelog

All notable changes to Rivet are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
once versioned releases begin.

## [Unreleased]

### Added

- `apps/web`: the product shell (design tokens per the design language —
  dark-first with light parity, severity/status/state palettes, Geist +
  mono for data), auth screens against the identity engine, organization
  and project flows, DSN issue/copy, org API keys (shown once), left nav
  with phase-labeled disabled entries, and a ⌘K command palette skeleton.
- `@rivet/ui` (formerly `@repo/ui`): dependency-free primitives — Button,
  Input, Field, Card, Chip (severity/criticality/role tones), Dialog,
  EmptyState (with honest phase labels), CopyButton, Spinner.
- `apps/server`: the control-plane API (ADR-0008 — Hono, fetch-native, Bun
  entry): health/readiness probes, mounted identity handler, org/project/
  environment/service CRUD behind the membership role matrix, API-key
  issuance (hash-only storage, key returned once) and DSN issuance with
  rendered DSN URLs, structured request logging with request ids, an origin
  guard for cookie-authenticated mutations, and an honest OpenAPI stub.
- `@rivet/auth`: authentication foundation (ADR-0007) — Better Auth as the
  identity engine mapped onto the control-plane schema, scrypt password
  hashing, database-backed cookie sessions, CSRF origin checks pinned on in
  every environment, and framework-agnostic `requireSession` /
  `requireOrgRole` guards that enforce Rivet membership roles.
- `@rivet/database`: identity tables (`sessions`, `accounts`,
  `verifications`) and `users.email_verified` / `users.image` columns
  (migration 0001).

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
