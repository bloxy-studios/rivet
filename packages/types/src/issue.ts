/**
 * Lifecycle states of an issue — a grouped, recurring technical problem.
 * Issues are not incidents: an issue tracks a defect over time, an incident
 * tracks active operational impact.
 */
export const ISSUE_STATES = [
  "NEW",
  "ONGOING",
  "REGRESSED",
  "RESOLVED",
  "IGNORED",
  "ARCHIVED",
] as const;

export type IssueState = (typeof ISSUE_STATES)[number];

export function isIssueState(value: unknown): value is IssueState {
  return typeof value === "string" && (ISSUE_STATES as readonly string[]).includes(value);
}
