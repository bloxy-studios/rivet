/**
 * The agent run state machine.
 *
 * State is owned by the platform runtime. Model output is advisory input to a
 * transition decision — it is never the source of truth for system state, and
 * no code path may move a run into DEPLOYING except from APPROVED.
 *
 * Failure states are terminal for a run: retries happen as a new run with a
 * fresh audit trail, never by mutating a failed run back to life.
 */
export const AGENT_RUN_STATES = [
  "DETECTED",
  "TRIAGING",
  "INVESTIGATING",
  "ROOT_CAUSE_FOUND",
  "FIX_PLANNED",
  "FIXING",
  "VALIDATING",
  "PR_READY",
  "AWAITING_APPROVAL",
  "APPROVED",
  "DEPLOYING",
  "VERIFYING",
  "RESOLVED",
  "INVESTIGATION_FAILED",
  "FIX_FAILED",
  "VALIDATION_FAILED",
  "DEPLOYMENT_FAILED",
  "VERIFICATION_FAILED",
] as const;

export type AgentRunState = (typeof AGENT_RUN_STATES)[number];

export const TERMINAL_AGENT_RUN_STATES = [
  "RESOLVED",
  "INVESTIGATION_FAILED",
  "FIX_FAILED",
  "VALIDATION_FAILED",
  "DEPLOYMENT_FAILED",
  "VERIFICATION_FAILED",
] as const satisfies readonly AgentRunState[];

/**
 * Legal transitions. Notes on deliberate choices:
 *
 * - AWAITING_APPROVAL → FIX_PLANNED models "request changes" (the reviewer
 *   sends the run back to planning); AWAITING_APPROVAL → FIX_FAILED models an
 *   outright rejection. Both preserve the invariant that DEPLOYING is only
 *   reachable through APPROVED.
 * - An approval is bound to an exact artifact (commit SHA / digest). If the
 *   artifact changes after approval, the runtime must move the run back to
 *   AWAITING_APPROVAL via a new PR_READY evaluation — never proceed on a
 *   stale approval (enforced at the approval layer; see ADR-0005).
 */
export const AGENT_STATE_TRANSITIONS: Readonly<Record<AgentRunState, readonly AgentRunState[]>> = {
  DETECTED: ["TRIAGING"],
  TRIAGING: ["INVESTIGATING", "INVESTIGATION_FAILED"],
  INVESTIGATING: ["ROOT_CAUSE_FOUND", "INVESTIGATION_FAILED"],
  ROOT_CAUSE_FOUND: ["FIX_PLANNED", "FIX_FAILED"],
  FIX_PLANNED: ["FIXING"],
  FIXING: ["VALIDATING", "FIX_FAILED"],
  VALIDATING: ["PR_READY", "VALIDATION_FAILED"],
  PR_READY: ["AWAITING_APPROVAL"],
  AWAITING_APPROVAL: ["APPROVED", "FIX_PLANNED", "FIX_FAILED"],
  APPROVED: ["DEPLOYING"],
  DEPLOYING: ["VERIFYING", "DEPLOYMENT_FAILED"],
  VERIFYING: ["RESOLVED", "VERIFICATION_FAILED"],
  RESOLVED: [],
  INVESTIGATION_FAILED: [],
  FIX_FAILED: [],
  VALIDATION_FAILED: [],
  DEPLOYMENT_FAILED: [],
  VERIFICATION_FAILED: [],
};

export function canTransition(from: AgentRunState, to: AgentRunState): boolean {
  return AGENT_STATE_TRANSITIONS[from].includes(to);
}

export function isTerminalAgentRunState(state: AgentRunState): boolean {
  return (TERMINAL_AGENT_RUN_STATES as readonly AgentRunState[]).includes(state);
}

export function isAgentRunState(value: unknown): value is AgentRunState {
  return typeof value === "string" && (AGENT_RUN_STATES as readonly string[]).includes(value);
}
