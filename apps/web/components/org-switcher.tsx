"use client";

import { cn } from "@rivet/ui";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getOrgs, getProjects, type Org, type Project } from "../lib/api";

interface OrgSwitcherProps {
  orgId: string | null;
  projectId: string | null;
}

/**
 * Org + project context switcher (design language: context header pattern).
 * Data loads lazily on open; selection navigates.
 */
export function OrgSwitcher({ orgId, projectId }: OrgSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    getOrgs().then(setOrgs, () => setOrgs([]));
    if (orgId) getProjects(orgId).then(setProjects, () => setProjects([]));
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, orgId]);

  const currentOrg = orgs?.find((org) => org.id === orgId);
  const currentProject = projects?.find((project) => project.id === projectId);

  return (
    <div ref={rootRef} className="relative px-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-border bg-surface px-2.5 py-1.5 text-left",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
        )}
      >
        <span className="truncate text-[13px] text-text">
          {currentOrg?.name ?? "Organization"}
          {currentProject ? (
            <span className="text-text-muted"> / {currentProject.name}</span>
          ) : null}
        </span>
        <span aria-hidden="true" className="text-text-muted">
          ⌄
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute inset-x-2 z-40 mt-1 rounded-md border border-border bg-surface-raised py-1 shadow-lg"
        >
          <p className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">
            Organizations
          </p>
          {orgs === null ? (
            <p className="px-2.5 py-1 text-xs text-text-muted">Loading…</p>
          ) : (
            orgs.map((org) => (
              <Link
                key={org.id}
                role="menuitem"
                href={`/orgs/${org.id}/projects`}
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-2.5 py-1.5 text-[13px] hover:bg-surface",
                  org.id === orgId ? "font-medium text-text" : "text-text-muted",
                )}
              >
                {org.name}
              </Link>
            ))
          )}
          {orgId && projects && projects.length > 0 ? (
            <>
              <p className="mt-1 border-t border-border px-2.5 py-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                Projects
              </p>
              {projects.map((project) => (
                <Link
                  key={project.id}
                  role="menuitem"
                  href={`/orgs/${orgId}/projects/${project.id}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block px-2.5 py-1.5 text-[13px] hover:bg-surface",
                    project.id === projectId ? "font-medium text-text" : "text-text-muted",
                  )}
                >
                  {project.name}
                </Link>
              ))}
            </>
          ) : null}
          <Link
            role="menuitem"
            href="/orgs"
            onClick={() => setOpen(false)}
            className="mt-1 block border-t border-border px-2.5 py-1.5 pt-2 text-[13px] text-accent hover:bg-surface"
          >
            All organizations →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
