"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "./cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Minimal controlled dialog: backdrop, Escape to close, focus moved inside
 * on open, dependency-free. Command palette and create-flows build on it.
 */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Move focus into the panel (first focusable, else the panel itself).
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(
      "input, button, [href], select, textarea, [tabindex]",
    );
    (focusable ?? panel)?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full max-w-lg rounded-lg border border-border bg-surface-raised shadow-xl",
          className,
        )}
      >
        {title ? (
          <div className="border-b border-border px-4 py-3 text-sm font-semibold text-text">
            {title}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
