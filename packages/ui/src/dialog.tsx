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
 * Minimal controlled dialog with complete keyboard focus management:
 * focus moves inside on open, Tab/Shift+Tab cycle within the panel, Escape
 * closes, and focus returns to the invoking control on close.
 * Dependency-free; the command palette and create-flows build on it.
 */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;

    const focusables = (): HTMLElement[] =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          "input, button, [href], select, textarea, [tabindex]",
        ) ?? [],
      ).filter((element) => element.tabIndex !== -1 && !element.hasAttribute("disabled"));

    (focusables()[0] ?? panel)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      } else if (active instanceof Node && !panel?.contains(active)) {
        // Focus escaped (e.g. via pointer on the page behind) — pull it back.
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
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
