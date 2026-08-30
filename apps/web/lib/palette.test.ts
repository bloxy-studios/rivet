import { describe, expect, it } from "vitest";
import { type Command, filterCommands } from "./palette";

const commands: Command[] = [
  { id: "projects", label: "Go to Projects", group: "Navigate" },
  { id: "keys", label: "Go to API Keys", keywords: ["credentials", "tokens"], group: "Navigate" },
  { id: "theme", label: "Toggle theme", keywords: ["dark", "light"], group: "Actions" },
  { id: "signout", label: "Sign out", keywords: ["logout"], group: "Actions" },
  { id: "create-project", label: "Create project", group: "Actions" },
];

describe("filterCommands", () => {
  it("returns everything, in order, for an empty query", () => {
    expect(filterCommands(commands, "").map((c) => c.id)).toEqual([
      "projects",
      "keys",
      "theme",
      "signout",
      "create-project",
    ]);
    expect(filterCommands(commands, "   ")).toHaveLength(commands.length);
  });

  it("ranks label prefixes above substrings above keyword hits", () => {
    const results = filterCommands(commands, "cre").map((c) => c.id);
    expect(results[0]).toBe("create-project"); // label prefix
    expect(results).toContain("keys"); // keyword "credentials"
    expect(results.indexOf("create-project")).toBeLessThan(results.indexOf("keys"));
  });

  it("matches case-insensitively across labels and keywords", () => {
    expect(filterCommands(commands, "LOGOUT").map((c) => c.id)).toEqual(["signout"]);
    expect(filterCommands(commands, "dark").map((c) => c.id)).toEqual(["theme"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterCommands(commands, "zzzzz")).toEqual([]);
  });
});
