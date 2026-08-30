import type { ReactNode } from "react";
import { Chip } from "./chip";
import { cn } from "./cn";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Honest roadmap labeling for not-yet-built surfaces (e.g. "Phase 2"). */
  phase?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, phase, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-text">{title}</p>
        {phase ? <Chip tone="neutral">{`lands in ${phase}`}</Chip> : null}
      </div>
      {description ? <p className="max-w-sm text-xs text-text-muted">{description}</p> : null}
      {action}
    </div>
  );
}
