import type { OrgRole, Severity } from "@rivet/types";
import { cn } from "./cn";

/**
 * Meaning-bearing chips (design language: color is semantics, never
 * decoration — and never the only signal: the label text always renders).
 */

export type ChipTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "sev0"
  | "sev1"
  | "sev2"
  | "sev3"
  | "sev4";

const TONE_CLASSES: Record<ChipTone, string> = {
  neutral: "text-text-muted border-border",
  accent: "text-accent border-accent/40",
  success: "text-healthy border-healthy/40",
  warning: "text-degraded border-degraded/40",
  danger: "text-danger border-danger/40",
  sev0: "text-sev0 border-sev0/50",
  sev1: "text-sev1 border-sev1/50",
  sev2: "text-sev2 border-sev2/50",
  sev3: "text-sev3 border-sev3/50",
  sev4: "text-sev4 border-sev4/50",
};

export interface ChipProps {
  tone?: ChipTone;
  children: string;
  className?: string;
  /** Renders the label in the data font (ids, slugs, prefixes). */
  mono?: boolean;
}

export function Chip({ tone = "neutral", children, className, mono = false }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4",
        mono && "font-mono",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function severityTone(severity: Severity): ChipTone {
  return severity.toLowerCase() as ChipTone;
}

const CRITICALITY_TONES: Record<string, ChipTone> = {
  CRITICAL: "sev0",
  HIGH: "sev2",
  MEDIUM: "neutral",
  LOW: "sev4",
};

export function criticalityTone(criticality: string): ChipTone {
  return CRITICALITY_TONES[criticality] ?? "neutral";
}

const ROLE_TONES: Record<OrgRole, ChipTone> = {
  OWNER: "accent",
  ADMIN: "accent",
  DEVELOPER: "neutral",
  VIEWER: "neutral",
};

export function roleTone(role: OrgRole): ChipTone {
  return ROLE_TONES[role];
}
