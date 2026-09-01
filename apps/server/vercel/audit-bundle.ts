/**
 * Static audit for the emitted Vercel function bundle.
 *
 * The deployed function is ONE self-contained file on a read-only filesystem:
 * any dynamic import left for runtime resolution either dies as EROFS (bare
 * npm specifiers trigger Bun auto-install when no node_modules exists) or as
 * module-not-found (relative chunk paths that were never emitted). The only
 * specifiers a runtime `import(...)` may reference are builtins the Bun
 * runtime provides without touching disk.
 *
 * Invoked by vercel/build.sh via audit-bundle-cli.ts; unit-tested in
 * audit-bundle.test.ts (including the quote/whitespace forms a bundler is
 * free to emit — see PR #12 review).
 */

/** Builtins importable without the `node:`/`bun:` prefix that Bun provides. */
const ALLOWED_BARE_BUILTINS = new Set(["async_hooks"]);

/**
 * Literal dynamic imports in any syntax a bundler may emit: single, double,
 * or backtick quotes (a backtick literal without interpolation is static),
 * with arbitrary whitespace inside the parentheses. Computed specifiers
 * (`import(someVariable)`) are not statically auditable and are not matched.
 */
const DYNAMIC_IMPORT = /import\(\s*(["'`])([^"'`\n]+)\1\s*\)/g;

/**
 * Returns the distinct offending `import(...)` expressions in the bundle
 * source — empty when the bundle is safe to deploy.
 */
export function findForbiddenDynamicImports(bundleSource: string): string[] {
  const forbidden = new Set<string>();
  for (const match of bundleSource.matchAll(DYNAMIC_IMPORT)) {
    const specifier = match[2] as string;
    if (specifier.startsWith("node:") || specifier.startsWith("bun:")) continue;
    if (ALLOWED_BARE_BUILTINS.has(specifier)) continue;
    // Everything else is forbidden — bare npm specifiers AND relative paths:
    // a single-file bundle has no sibling chunks to resolve at runtime.
    forbidden.add(match[0] as string);
  }
  return [...forbidden];
}
