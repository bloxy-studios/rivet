# Rivet Design Language

Binding direction for `apps/web` (and any UI surface). The goal: Rivet looks and feels
like **serious infrastructure software** — premium, minimal, technical, calm, fast,
information-dense, accessible. This document is grounded in a review of real production
tools (screens via [Mobbin](https://mobbin.com), linked below) rather than invented
aesthetics, precisely to avoid generic "AI dashboard" output.

## Register

- Calm and precise. The product handles emergencies; the UI never adds adrenaline.
- Dense but breathable: operators want more rows, not bigger cards.
- Typography does the hierarchy work; color is reserved for **meaning** (severity,
  status, diffs) — not decoration.
- Both themes are first-class. Design telemetry-dense surfaces dark-first (ops rooms),
  verify light parity. Never ship a screen that only works in one theme.

**Banned:** neon palettes, decorative gradients, glassmorphism, glow effects, giant
chatbot panes as primary navigation, decorative animation, emoji as iconography,
stock-illustration mascots. Motion is functional only (state change, focus, ≤150ms,
honoring `prefers-reduced-motion`).

## Grounding research — patterns adopted from real tools

Reviewed screens (canonical Mobbin links; observations are from the screens themselves):

1. **Sentry — dashboard** ([screen](https://mobbin.com/screens/2818819b-b4a3-4271-9403-41227413ad23)).
   Global scope bar (project / environment / time range / release) above widget cards;
   big-number KPIs beside trend charts; a small table widget for categorical health.
   → Rivet's Overview adopts the *global scope bar* and the "few KPIs + one trend +
   one table" restraint. We reject dashboard sprawl: Overview answers "is my app
   healthy?" and links outward.
2. **incident.io — incident detail** ([screen](https://mobbin.com/screens/4aba98e8-8036-4ff5-a479-04814665258d)).
   Lifecycle stepper across the top (Investigating → Fixing → Monitoring → …) with a
   severity chip and live "ongoing for" timer; tabs for Updates/Timeline/Actions;
   right rail of structured metadata (lead, reporter, escalations, related incidents,
   timestamps). → Rivet's incident page adopts the stepper + timer + right-rail
   metadata pattern; our stepper states come from the platform state machine.
3. **Better Stack — incident metadata + timeline** ([screen](https://mobbin.com/screens/61475a21-38d1-4de1-a4a5-0c04a9aa8a31)).
   Dark ops theme; key-value metadata table (severity, affected team, owner, region);
   chronological timeline with actor avatars, monospaced values, right-aligned
   timestamps; markdown comment composer inline. → Rivet's agent event log and incident
   timeline adopt this: every entry = actor + action + monospaced specifics + timestamp,
   append-only, with a composer for human annotations.
4. **Linear — issue detail** ([screen](https://mobbin.com/screens/9f60b2e0-f2e9-4c19-afcc-f85910b88182)).
   Compact type scale; activity feed as the spine of the page; right properties rail
   with low-ceremony controls; identifier (`AS-35`) in the breadcrumb. → Rivet issues
   adopt the identifier-first breadcrumb, activity spine, and properties rail — with
   telemetry tabs (stack trace, traces, logs) where Linear has description.
5. **Vercel — logs** ([screen](https://mobbin.com/screens/c534131b-0086-4d8c-9d5b-6277e8c6d9a9)).
   Volume histogram above the table with error/success series; left facet panel
   (level with counts, resource, environment, route, status code, host…); monospaced
   rows with color-coded status; Live tail toggle; search across the top. → Rivet's
   logs and event search adopt histogram-over-table, faceted left panel with counts,
   monospaced data rows, and live tail.
6. **Laravel Cloud — environment logs** ([screen](https://mobbin.com/screens/50a3f164-b65b-42a1-9961-e4a8046d5349)).
   Environment context header (org / repo / branch / status chip); time-range dropdown
   with sane presets (5m → 7d) plus custom UTC range picker. → Rivet adopts the
   context header for project/environment scoping and this exact time-picker pattern
   platform-wide.

Additional reference screens consulted: [Sentry incidents list](https://mobbin.com/screens/4a064f3e-386f-49d8-a19f-58cb887a2a38),
[GitLab](https://mobbin.com/screens/b86a07bd-de40-4ec9-ab9c-a98a462b71fe),
[Klaviyo](https://mobbin.com/screens/536bd68f-f682-4e02-af38-4f89e5ae88fc),
[OpenAI Platform](https://mobbin.com/screens/fd98bb68-c8c4-446c-a0fc-0e1089003e1c),
[Okta](https://mobbin.com/screens/70f42b3f-1823-4cb2-872d-346ad3eab8dc),
[AWS](https://mobbin.com/screens/e2ed96b6-86fc-4f4b-8cc6-07ffce22c33c),
[PandaDoc](https://mobbin.com/screens/79d68519-f53a-4cee-af87-32c39727a0dd),
[OpenAI Platform (usage table)](https://mobbin.com/screens/66f02e38-da7c-43fe-bce9-4d400bf5f999).

## Foundations

**Typography.** UI: Geist Sans (already the app font). Data — IDs, hashes, timestamps,
stack frames, log lines, code, DSNs — is always monospaced (Geist Mono). Type scale is
compact: page titles ~20px/600, section heads ~14px/600, body 13–14px, table rows
13px/1.5. No display-size marketing type inside the product.

**Layout.** Left icon+label nav (Overview, Issues, Incidents, Traces, Logs,
Performance, Releases, Deployments, Agents, Integrations, Alerts, SLOs, Settings) —
collapsible to icons. Global scope bar (project / environment / time range) under the
breadcrumb on telemetry surfaces. Detail pages: content spine + right metadata rail
(320px) as in incident.io/Linear. 4px spacing grid; 1px borders and subtle background
shifts over shadows; radius 6–8px.

**Color.** Neutral canvas (near-black in dark, near-white in light) with one restrained
brand accent used sparingly (primary actions, focus). Meaning colors are tokens, not
decoration:

| Token | Meaning |
| --- | --- |
| `severity.sev0` / `sev1` | red family (deepest for SEV0) |
| `severity.sev2` | orange |
| `severity.sev3` | yellow |
| `severity.sev4` | neutral gray |
| `status.healthy / degraded / failing` | green / amber / red |
| `state.new / ongoing / regressed / resolved` | blue / neutral / purple / green |
| `diff.add / remove` | conventional green / red |

Exact values land with the token package in Phase 1 (PR-4) and must pass WCAG AA
contrast in both themes; severity must also be distinguishable without color (icon or
label always present).

**Data displays.** Tables are the primary surface: sticky headers, sortable columns,
faceted filters with counts, keyboard row navigation (j/k), single-line rows with
truncation + hover reveal. Charts are quiet: thin lines/bars, no gradients-for-drama,
tooltips with exact values, timezone-explicit axes.

## Product-specific patterns

- **Evidence chips.** Every agent finding renders its evidence level — OBSERVED /
  INFERRED / HYPOTHESIZED / CONFIRMED — as a labeled chip. Hypotheses visually cannot
  masquerade as facts (distinct shape + label, not just color).
- **Investigation timeline, not chatbot.** Agent activity is a checked-step timeline
  ("Examined 2,841 events · Compared 3 releases · …") with expandable evidence under
  each step, per the Better Stack timeline pattern. Conversational input exists as a
  composer at the bottom of the investigation — the timeline remains the spine.
- **Approval card.** One screen: incident summary, root cause + evidence, diff, test
  results, risk, confidence (evidence-derived), deployment target, rollback plan —
  then Approve / Request changes / Reject. No approval without the diff visible.
- **Status stepper** on incidents mirrors the platform state machine; states are never
  invented client-side.
- **Command palette (⌘K)** from Phase 1: navigate, search issues/incidents, run
  scoped actions. Keyboard-first is a requirement, not a nicety (WCAG AA, full focus
  management, `prefers-reduced-motion`).
- **Honest empty states.** Surfaces for future phases don't render fake data; nav
  entries are disabled with "lands in Phase N". Demo data is always labeled as demo.

## Component inventory (built in Phase 1 PR-4, extended per phase)

`ScopeBar`, `SeverityChip`, `StateChip`, `EvidenceChip`, `StatusStepper`, `KVTable`,
`Timeline` (+ `TimelineComposer`), `DataTable` (+ `FacetPanel`), `VolumeHistogram`,
`Sparkline`, `LogRow`, `StackFrame`, `DiffView`, `ApprovalCard`, `CommandPalette`,
`TimeRangePicker`, `EmptyState`.
