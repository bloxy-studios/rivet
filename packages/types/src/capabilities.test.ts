import { describe, expect, it } from "vitest";
import {
  AGENT_CAPABILITIES,
  DEFAULT_DENIED_CAPABILITIES,
  isAgentCapability,
  isDefaultDenied,
} from "./capabilities";

describe("agent capability invariants", () => {
  it("denies production deployment and rollback by default — and nothing less", () => {
    expect([...DEFAULT_DENIED_CAPABILITIES].sort()).toEqual([
      "DEPLOY_PRODUCTION",
      "ROLLBACK_PRODUCTION",
    ]);
    expect(isDefaultDenied("DEPLOY_PRODUCTION")).toBe(true);
    expect(isDefaultDenied("ROLLBACK_PRODUCTION")).toBe(true);
  });

  it("keeps every default-denied capability inside the known capability set", () => {
    for (const capability of DEFAULT_DENIED_CAPABILITIES) {
      expect(AGENT_CAPABILITIES).toContain(capability);
    }
  });

  it("does not default-deny read/investigate capabilities", () => {
    expect(isDefaultDenied("READ_TELEMETRY")).toBe(false);
    expect(isDefaultDenied("REQUEST_APPROVAL")).toBe(false);
  });

  it("rejects unknown capabilities", () => {
    expect(isAgentCapability("DELETE_REPOSITORY")).toBe(false);
    expect(isAgentCapability("WRITE_BRANCH")).toBe(true);
  });
});
