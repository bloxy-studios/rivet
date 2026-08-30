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
echo "Build Output emitted at $OUT (function: index.func)"
