"use client";

import { cn, Dialog } from "@rivet/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "../lib/auth-client";
import { type Command, filterCommands } from "../lib/palette";
import { toggleTheme } from "./theme-toggle";

interface PaletteCommand extends Command {
  run: () => void;
}

/**
 * ⌘K command palette skeleton (design language §109): navigation and scoped
 * actions over the implemented surfaces. Search over issues/incidents joins
 * when those exist — nothing here pretends otherwise.
 */
export function CommandPalette({ orgId }: { orgId: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const commands = useMemo<PaletteCommand[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      close();
    };
    const list: PaletteCommand[] = [
      { id: "orgs", label: "Go to Organizations", group: "Navigate", run: go("/orgs") },
    ];
    if (orgId) {
      list.push(
        {
          id: "projects",
          label: "Go to Projects",
          group: "Navigate",
          run: go(`/orgs/${orgId}/projects`),
        },
        {
          id: "keys",
          label: "Go to API Keys",
          keywords: ["credentials", "tokens", "settings"],
          group: "Navigate",
          run: go(`/orgs/${orgId}/settings/keys`),
        },
      );
    }
    list.push(
      {
        id: "theme",
        label: "Toggle theme",
        keywords: ["dark", "light"],
        group: "Actions",
        run: () => {
          toggleTheme();
          close();
        },
      },
      {
        id: "sign-out",
        label: "Sign out",
        keywords: ["logout"],
        group: "Actions",
        run: () => {
          void signOut().then(() => router.push("/login"));
          close();
        },
      },
    );
    return list;
  }, [orgId, router, close]);

  const results = useMemo(() => filterCommands(commands, query), [commands, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onClose={close} className="max-w-md">
      <div className="p-2">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              results[activeIndex]?.run();
            }
          }}
          placeholder="Type a command…"
          aria-label="Command palette"
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-accent"
        />
        <ul className="mt-2 max-h-72 overflow-y-auto" aria-label="Commands">
          {results.length === 0 ? (
            <li className="px-2.5 py-2 text-xs text-text-muted">No matching commands.</li>
          ) : (
            results.map((command, index) => (
              <li key={command.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => command.run()}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px]",
                    index === activeIndex ? "bg-surface text-text" : "text-text-muted",
                  )}
                >
                  {command.label}
                  <span className="text-[10px] uppercase tracking-wide text-text-muted">
                    {command.group}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </Dialog>
  );
}
