/** Joins class fragments, skipping falsy values. Dependency-free by design. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
