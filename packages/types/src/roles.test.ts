import { describe, expect, it } from "vitest";
import { isOrgRole, ORG_ROLES, roleMeets } from "./roles";

describe("organization roles", () => {
  it("fixes the closed role set", () => {
    expect([...ORG_ROLES]).toEqual(["OWNER", "ADMIN", "DEVELOPER", "VIEWER"]);
  });

  it("ranks privileges OWNER > ADMIN > DEVELOPER > VIEWER", () => {
    expect(roleMeets("OWNER", "VIEWER")).toBe(true);
    expect(roleMeets("ADMIN", "OWNER")).toBe(false);
    expect(roleMeets("DEVELOPER", "DEVELOPER")).toBe(true);
    expect(roleMeets("VIEWER", "DEVELOPER")).toBe(false);
  });

  it("rejects unknown roles", () => {
    expect(isOrgRole("JANITOR")).toBe(false);
    expect(isOrgRole("owner")).toBe(false);
    expect(isOrgRole("ADMIN")).toBe(true);
  });
});
