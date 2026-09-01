/**
 * CLI wrapper for the bundle audit — run by vercel/build.sh under Bun:
 *   bun vercel/audit-bundle-cli.ts .vercel/output/functions/index.func/index.js
 * Exits 1 (failing the build) when the bundle contains a runtime dynamic
 * import the deployed function could not resolve.
 */
import { readFile } from "node:fs/promises";
import { findForbiddenDynamicImports } from "./audit-bundle";

const bundlePath = process.argv[2];
if (!bundlePath) {
  console.error("usage: bun vercel/audit-bundle-cli.ts <bundle.js>");
  process.exit(2);
}

const findings = findForbiddenDynamicImports(await readFile(bundlePath, "utf8"));
if (findings.length > 0) {
  console.error("ERROR: bundle contains runtime dynamic imports the function cannot resolve:");
  for (const finding of findings) {
    console.error(`  ${finding}`);
  }
  console.error(
    "Bare npm specifiers must become real dependencies of apps/server (bun build then inlines them); relative chunks mean the bundle is no longer a single file.",
  );
  process.exit(1);
}
console.log("bundle audit passed: no runtime dynamic imports outside node:/bun: builtins");
