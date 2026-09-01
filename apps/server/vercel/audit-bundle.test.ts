import { describe, expect, it } from "vitest";
import { findForbiddenDynamicImports } from "./audit-bundle";

describe("findForbiddenDynamicImports", () => {
  it("flags a double-quoted bare npm specifier", () => {
    expect(findForbiddenDynamicImports('x = import("@opentelemetry/api")')).toEqual([
      'import("@opentelemetry/api")',
    ]);
  });

  it("flags single-quoted and whitespace-padded forms (PR #12 review bypasses)", () => {
    expect(findForbiddenDynamicImports("import('missing-package')")).toEqual([
      "import('missing-package')",
    ]);
    expect(findForbiddenDynamicImports('import( "missing-package" )')).toEqual([
      'import( "missing-package" )',
    ]);
    expect(findForbiddenDynamicImports("import(\n  'missing-package'\n)")).toEqual([
      "import(\n  'missing-package'\n)",
    ]);
  });

  it("flags a static backtick specifier", () => {
    expect(findForbiddenDynamicImports("import(`missing-package`)")).toHaveLength(1);
  });

  it("flags relative chunk imports — a single-file bundle has no siblings", () => {
    expect(findForbiddenDynamicImports('import("./chunk-ab12.js")')).toHaveLength(1);
    expect(findForbiddenDynamicImports("import('../shared/util.js')")).toHaveLength(1);
  });

  it("allows node:, bun:, and the bare builtins Bun serves from memory", () => {
    const source = [
      'import("node:crypto")',
      "import('bun:sqlite')",
      'import( "async_hooks" )',
    ].join(";");
    expect(findForbiddenDynamicImports(source)).toEqual([]);
  });

  it("does not match computed specifiers (not statically auditable)", () => {
    expect(findForbiddenDynamicImports("import(someVariable)")).toEqual([]);
  });

  it("deduplicates repeated offenders", () => {
    const source = 'a = import("pg"); b = import("pg");';
    expect(findForbiddenDynamicImports(source)).toEqual(['import("pg")']);
  });

  it("passes a clean, fully inlined bundle", () => {
    expect(findForbiddenDynamicImports("const mod = { fetch };")).toEqual([]);
  });
});
