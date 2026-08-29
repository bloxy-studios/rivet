/**
 * Epistemic strength of a finding produced during investigation.
 *
 * Every claim an agent surfaces carries one of these levels, and UI/reporting
 * must preserve the distinction: speculation is never presented as confirmed
 * fact.
 *
 * - OBSERVED     — directly present in telemetry or repository data.
 * - INFERRED     — derived from observed data via a documented rule.
 * - HYPOTHESIZED — a candidate explanation not yet supported end-to-end.
 * - CONFIRMED    — validated by reproduction, tests, or post-fix telemetry.
 */
export const EVIDENCE_LEVELS = ["OBSERVED", "INFERRED", "HYPOTHESIZED", "CONFIRMED"] as const;

export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export function isEvidenceLevel(value: unknown): value is EvidenceLevel {
  return typeof value === "string" && (EVIDENCE_LEVELS as readonly string[]).includes(value);
}
