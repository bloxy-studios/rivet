# ADR-0005: Agent safety invariants

- **Status:** Accepted
- **Date:** 2026-08-29
- **Deciders:** Bloxy Studios (project steward)
- **Phase/rung:** Phase 0 (binding on all phases; implemented progressively in 6–8)

## Context

Rivet's differentiator is an agent that investigates incidents, modifies code, and
prepares deployments. That power is only shippable if its boundaries are architectural —
enforced by systems, tested by CI — rather than behavioral (asked of a model in a
prompt). These invariants are decided *before* any agent code exists precisely so that
no implementation convenience can erode them. Some are already executable: the state
machine, capability set, and default-deny list live in `@rivet/types` with invariant
tests.

## Decision

The following are permanent invariants. A PR that violates any of them is rejected
regardless of what it improves; changing one requires superseding this ADR through the
RFC process.

1. **The model is never the authorization layer.** Every agent action flows
   `model proposal → tool request → runtime authorization → policy evaluation →
   (human approval if required) → execution`. Authorization code paths take no input
   from model output other than the structured request being evaluated.
2. **Explicit capabilities.** Every tool declares the capabilities it requires (the
   closed set in `@rivet/types`: `READ_TELEMETRY`, `READ_SOURCE`, `READ_GIT`,
   `WRITE_BRANCH`, `RUN_TESTS`, `CREATE_PR`, `COMMENT_PR`, `SEND_NOTIFICATION`,
   `REQUEST_APPROVAL`, `DEPLOY_PRODUCTION`, `ROLLBACK_PRODUCTION`). Runs are granted
   capability sets by org policy; the runtime checks every call. Third-party tools
   never inherit capabilities implicitly.
3. **Production actions are default-denied.** `DEPLOY_PRODUCTION` and
   `ROLLBACK_PRODUCTION` are denied for every org, project, and agent unless explicit
   organization policy enables them — and even then, execution requires the approval
   gate. `DEFAULT_DENIED_CAPABILITIES` is a tested constant, not configuration.
4. **The approval gate is structural.** The agent run state machine (in
   `@rivet/types`, invariant-tested) makes `DEPLOYING` reachable only from `APPROVED`
   and `APPROVED` only from `AWAITING_APPROVAL`. Approvals are explicit, authenticated,
   authorized, recorded, and **bound to an exact artifact** (org, user, incident,
   repository, commit SHA, artifact digest, environment, deployment target, timestamp).
   If the artifact changes after approval, the approval is invalid and the run returns
   to `AWAITING_APPROVAL`.
5. **State is system-owned.** Model output never sets run state; the runtime advances
   the state machine based on verified outcomes (tests ran, PR exists, deploy
   succeeded). Failure states are terminal — retries are new runs with fresh audit
   trails.
6. **Sandboxed execution.** Agent-run code executes in an isolated sandbox: temporary
   filesystem, no production credentials, restricted network, CPU/memory/time limits,
   destroyed after use unless explicitly retained for audit. Rollback/deploy actions
   run through deployment providers, never raw shell against production.
7. **Secrets stay out of model context.** Prompts, tool results, and persisted agent
   memory must not contain API secrets, database passwords, OAuth secrets, signing
   keys, or production tokens. Tools use secret references resolved at execution time
   inside the runtime.
8. **Retrieved content is untrusted.** Telemetry, logs, source code, GitHub content,
   documentation, and web pages can contain prompt injection. Retrieved content is
   data: it can inform hypotheses but cannot invoke tools, change policy, or alter the
   run plan except through the runtime's own decision loop. System authorization
   always outranks retrieved content.
9. **Everything is audited.** Every tool call, state transition, notification, and
   approval writes an append-only audit event (actor, action, input digest, outcome,
   timestamp). The UI's investigation timeline is a *view* of this log, so what users
   see is what happened. Audit records are immutable.
10. **Bounded runs.** Max steps, max wall-clock duration, max tokens, max spend, and
    repeated-tool-call detection are enforced by the runtime with per-org
    configuration. A run that hits a bound fails safe into a terminal failure state
    with its audit trail intact.
11. **Evidence-graded output.** Findings carry `OBSERVED / INFERRED / HYPOTHESIZED /
    CONFIRMED` levels (`@rivet/types`). Confidence is computed from evidence signals
    (stack-trace match, deployment correlation, code correlation, reproduction, test
    results, post-fix telemetry) — never a number a model asserts about itself.
    Speculation is never presented as confirmed fact.
12. **Honest status language.** The system never claims "fixed" without verification
    evidence. The vocabulary is: fix prepared → tests passed → PR created → approval
    required → deployment started → deployment verified → incident resolved.
13. **AI is not a single point of failure.** Ingestion, issue processing, and alerting
    operate fully with agents disabled or the model provider down. Organizations can
    disable AI entirely and keep the observability platform.

## Alternatives considered

- **Prompt-level guardrails only** ("instruct the model not to deploy") — rejected:
  prompts are advice, not enforcement; injection or model error defeats them. Prompts
  remain a defense layer, never *the* layer.
- **Configurable auto-deploy without approval** (full autonomy mode) — rejected even as
  an opt-in flag at this stage. The nearest permitted design is org-policy-enabled
  `DEPLOY_PRODUCTION` *with* artifact-bound approval — a human still clicks. Automatic
  rollback under an explicit, measurable, org-configured policy is the narrow exception
  (Phase 8) and is itself default-off with its own audit trail; the LLM never invents
  rollback criteria.
- **Trusting first-party retrieved content** (our own telemetry "can't" be malicious) —
  rejected: telemetry is attacker-influenced by definition (error messages, URLs, user
  agents are user input).
- **Mutable audit (cleanup jobs, admin edits)** — rejected: an editable audit log is
  worse than none; retention windows may *expire* records per policy, never edit them.

## Consequences

- Agent features cost more to build: every tool needs declarations, audit, limits, and
  tests; the runtime needs a real authorization layer before any impressive demo. This
  is the product, not overhead.
- Safety is testable: invariants exist as code (`@rivet/types` today; runtime
  enforcement tests in Phases 6–8), and CI fails when they are weakened. Security
  reports against these invariants are highest-severity (SECURITY.md).
- Approval UX must be excellent (evidence, diff, risk, one decision) or users will
  route around it — budgeted in the Phase 8 design.
- Some flashy competitor demos ("the AI deployed the fix by itself!") are impossible in
  Rivet by design. Accepted, permanently.
