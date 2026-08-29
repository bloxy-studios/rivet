/**
 * Incident severity levels, ordered from most severe (SEV0) to least severe
 * (SEV4). Severity is assigned by the platform's impact model — never directly
 * by a model/LLM — and drives incident policy (which agent actions run
 * automatically) and escalation behavior.
 */
export const SEVERITIES = ["SEV0", "SEV1", "SEV2", "SEV3", "SEV4"] as const;

export type Severity = (typeof SEVERITIES)[number];

const SEVERITY_RANK: Readonly<Record<Severity, number>> = {
  SEV0: 0,
  SEV1: 1,
  SEV2: 2,
  SEV3: 3,
  SEV4: 4,
};

/** Numeric rank of a severity. Lower rank means more severe. */
export function severityRank(severity: Severity): number {
  return SEVERITY_RANK[severity];
}

/** True when `a` is strictly more severe than `b`. */
export function isMoreSevere(a: Severity, b: Severity): boolean {
  return SEVERITY_RANK[a] < SEVERITY_RANK[b];
}

/** True when `severity` is at least as severe as `threshold`. */
export function meetsSeverityThreshold(severity: Severity, threshold: Severity): boolean {
  return SEVERITY_RANK[severity] <= SEVERITY_RANK[threshold];
}

export function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && (SEVERITIES as readonly string[]).includes(value);
}

/**
 * Business criticality of a service, configured per service by the
 * organization. Feeds the impact model (a payments SEV is not an analytics
 * SEV).
 */
export const SERVICE_CRITICALITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export type ServiceCriticality = (typeof SERVICE_CRITICALITIES)[number];
