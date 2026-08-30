"use client";

import { Chip, cn } from "@rivet/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavEntry {
  label: string;
  /** Present only for implemented surfaces. */
  href?: string;
  /** Honest roadmap label for future surfaces (design language: no dead buttons). */
  phase?: string;
}

/**
 * The full navigation from the design language (§108), with future surfaces
 * visibly disabled and labeled by the phase that ships them — never fake
 * pages, never dead links.
 */
export function buildNav(orgId: string | null): NavEntry[] {
  return [
    { label: "Projects", ...(orgId && { href: `/orgs/${orgId}/projects` }) },
    { label: "Issues", phase: "Phase 2" },
    { label: "Incidents", phase: "Phase 5" },
    { label: "Traces", phase: "Phase 3" },
    { label: "Logs", phase: "Phase 3" },
    { label: "Performance", phase: "Phase 3" },
    { label: "Releases", phase: "Phase 3" },
    { label: "Deployments", phase: "Phase 3" },
    { label: "Agents", phase: "Phase 6" },
    { label: "Integrations", phase: "Phase 4" },
    { label: "Alerts", phase: "Phase 2" },
    { label: "SLOs", phase: "Phase 5" },
    { label: "API Keys", ...(orgId && { href: `/orgs/${orgId}/settings/keys` }) },
  ];
}

export function Nav({ orgId }: { orgId: string | null }) {
  const pathname = usePathname();
  const entries = buildNav(orgId);

  return (
    <nav aria-label="Primary" className="flex flex-col gap-0.5 px-2">
      {entries.map((entry) =>
        entry.href ? (
          <Link
            key={entry.label}
            href={entry.href}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
              pathname.startsWith(entry.href)
                ? "bg-surface-raised font-medium text-text"
                : "text-text-muted hover:bg-surface-raised hover:text-text",
            )}
          >
            {entry.label}
          </Link>
        ) : (
          <span
            key={entry.label}
            aria-disabled="true"
            title={entry.phase ? `${entry.label} lands in ${entry.phase}` : entry.label}
            className="flex cursor-not-allowed items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] text-text-muted/60"
          >
            {entry.label}
            {entry.phase ? <Chip tone="neutral">{entry.phase}</Chip> : null}
          </span>
        ),
      )}
    </nav>
  );
}
