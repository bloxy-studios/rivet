/**
 * Command palette model: pure, tested logic — the UI is a thin shell over
 * filterCommands (design language: keyboard-first, ⌘K from Phase 1).
 */

export interface Command {
  id: string;
  label: string;
  /** Extra match terms (synonyms, slugs). */
  keywords?: string[];
  /** Section header in the palette. */
  group: "Navigate" | "Actions";
}

/**
 * Case-insensitive filter with deterministic ranking:
 * label-prefix matches first, then label-substring, then keyword matches.
 * An empty query returns everything in original order.
 */
export function filterCommands<T extends Command>(commands: readonly T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [...commands];

  const ranked: Array<{ command: T; rank: number }> = [];
  for (const command of commands) {
    const label = command.label.toLowerCase();
    let rank: number | null = null;
    if (label.startsWith(q)) rank = 0;
    else if (label.includes(q)) rank = 1;
    else if ((command.keywords ?? []).some((k) => k.toLowerCase().includes(q))) rank = 2;
    if (rank !== null) ranked.push({ command, rank });
  }
  return ranked.sort((a, b) => a.rank - b.rank).map((entry) => entry.command);
}
