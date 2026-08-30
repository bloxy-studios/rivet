"use client";

import { Button } from "@rivet/ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { signOut, useSession } from "../lib/auth-client";
import { CommandPalette } from "./command-palette";
import { Nav } from "./nav";
import { OrgSwitcher } from "./org-switcher";
import { ThemeToggle } from "./theme-toggle";

/**
 * The product shell: left navigation (design language layout), context
 * switcher, top bar with the ⌘K affordance, theme toggle, and session
 * controls.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const params = useParams<{ orgId?: string; projectId?: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const orgId = params.orgId ?? null;
  const projectId = params.projectId ?? null;

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-56 shrink-0 flex-col gap-3 border-r border-border bg-surface py-3">
        <Link
          href="/orgs"
          className="px-4 text-sm font-semibold tracking-tight text-text focus-visible:outline-2 focus-visible:outline-accent"
        >
          Rivet
        </Link>
        <OrgSwitcher orgId={orgId} projectId={projectId} />
        <Nav orgId={orgId} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center justify-between gap-3 border-b border-border px-4">
          <span className="truncate font-mono text-xs text-text-muted">
            {session?.user.email ?? ""}
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted sm:inline">
              ⌘K
            </span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void signOut().then(() => router.push("/login"))}
            >
              Sign out
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-6 py-5">{children}</main>
      </div>

      <CommandPalette orgId={orgId} />
    </div>
  );
}
