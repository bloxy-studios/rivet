#!/usr/bin/env bash
# Emits the Build Output API deployment for apps/server (run from apps/server).
#
# Invoked by vercel.json's buildCommand after `turbo run build --filter=server`
# (the command itself must stay under Vercel's 256-character buildCommand cap,
# which is why these steps live in a script). Produces:
#
#   .vercel/output/config.json                      — routes (committed source: vercel/output-config.json)
#   .vercel/output/functions/index.func/index.js    — self-contained bundle of vercel/entry.ts
#   .vercel/output/functions/index.func/.vc-config.json — Bun runtime config (committed source: vercel/vc-config.json)
#
# Vercel deploys this directory verbatim; no framework detection is involved
# (vercel.json pins "framework": null — see docs/development/vercel-deployment.md).
set -euo pipefail

BUN="${BUN_BIN:-$HOME/.bun/bin/bun}"
OUT=.vercel/output
FUNC="$OUT/functions/index.func"

rm -rf "$OUT"
mkdir -p "$FUNC" "$OUT/static"
"$BUN" build vercel/entry.ts --target=bun --outfile="$FUNC/index.js"
cp vercel/vc-config.json "$FUNC/.vc-config.json"
cp vercel/output-config.json "$OUT/config.json"

# The function filesystem is read-only. Bun enables auto-install when no
# node_modules directory exists, which turns any unresolved bare specifier
# (e.g. an optional-dependency probe inside a library) into a package-install
# attempt that dies with EROFS instead of the catchable module-not-found the
# library expects. Shipping an (empty) node_modules disables auto-install so
# unresolved probes fail cleanly. The bundle itself must stay free of runtime
# dynamic imports (any quote/whitespace syntax) — the audit fails the build
# otherwise. Logic + regression tests: vercel/audit-bundle{,.test}.ts.
mkdir -p "$FUNC/node_modules"
touch "$FUNC/node_modules/.keep"

"$BUN" vercel/audit-bundle-cli.ts "$FUNC/index.js"

echo "Build Output emitted at $OUT (function: index.func)"
