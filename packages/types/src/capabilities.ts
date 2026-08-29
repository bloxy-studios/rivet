/**
 * Explicit capabilities an agent tool may require. Authorization is enforced
 * by the tool runtime — outside the model — against the capabilities granted
 * to a run. A model can request; it can never grant.
 *
 * See ADR-0005 (agent safety invariants).
 */
export const AGENT_CAPABILITIES = [
  "READ_TELEMETRY",
  "READ_SOURCE",
  "READ_GIT",
  "WRITE_BRANCH",
  "RUN_TESTS",
  "CREATE_PR",
  "COMMENT_PR",
  "SEND_NOTIFICATION",
  "REQUEST_APPROVAL",
  "DEPLOY_PRODUCTION",
  "ROLLBACK_PRODUCTION",
] as const;

export type AgentCapability = (typeof AGENT_CAPABILITIES)[number];

/**
 * Capabilities that are DENIED by default for every organization, every
 * project, and every agent. Enabling either requires explicit organization
 * policy plus a recorded, artifact-bound human approval. This list is a
 * security invariant: code must never treat it as a tunable default.
 */
export const DEFAULT_DENIED_CAPABILITIES = [
  "DEPLOY_PRODUCTION",
  "ROLLBACK_PRODUCTION",
] as const satisfies readonly AgentCapability[];

export function isDefaultDenied(capability: AgentCapability): boolean {
  return (DEFAULT_DENIED_CAPABILITIES as readonly AgentCapability[]).includes(capability);
}

export function isAgentCapability(value: unknown): value is AgentCapability {
  return typeof value === "string" && (AGENT_CAPABILITIES as readonly string[]).includes(value);
}
