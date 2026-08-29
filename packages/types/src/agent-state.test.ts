import { describe, expect, it } from "vitest";
import {
  AGENT_RUN_STATES,
  AGENT_STATE_TRANSITIONS,
  canTransition,
  isTerminalAgentRunState,
  TERMINAL_AGENT_RUN_STATES,
} from "./agent-state";

describe("agent run state machine", () => {
  it("only references known states in the transition table", () => {
    for (const [from, targets] of Object.entries(AGENT_STATE_TRANSITIONS)) {
      expect(AGENT_RUN_STATES).toContain(from);
      for (const to of targets) {
        expect(AGENT_RUN_STATES).toContain(to);
      }
    }
  });

  it("has no transitions out of terminal states", () => {
    for (const state of TERMINAL_AGENT_RUN_STATES) {
      expect(AGENT_STATE_TRANSITIONS[state]).toEqual([]);
      expect(isTerminalAgentRunState(state)).toBe(true);
    }
  });

  it("makes DEPLOYING reachable only from APPROVED (the approval gate)", () => {
    for (const [from, targets] of Object.entries(AGENT_STATE_TRANSITIONS)) {
      if (targets.includes("DEPLOYING")) {
        expect(from).toBe("APPROVED");
      }
    }
  });

  it("makes APPROVED reachable only from AWAITING_APPROVAL", () => {
    for (const [from, targets] of Object.entries(AGENT_STATE_TRANSITIONS)) {
      if (targets.includes("APPROVED")) {
        expect(from).toBe("AWAITING_APPROVAL");
      }
    }
  });

  it("never deploys straight from a ready PR", () => {
    expect(canTransition("PR_READY", "DEPLOYING")).toBe(false);
    expect(canTransition("AWAITING_APPROVAL", "DEPLOYING")).toBe(false);
  });

  it("accepts the canonical happy path end to end", () => {
    const happyPath = [
      "DETECTED",
      "TRIAGING",
      "INVESTIGATING",
      "ROOT_CAUSE_FOUND",
      "FIX_PLANNED",
      "FIXING",
      "VALIDATING",
      "PR_READY",
      "AWAITING_APPROVAL",
      "APPROVED",
      "DEPLOYING",
      "VERIFYING",
      "RESOLVED",
    ] as const;
    for (let i = 1; i < happyPath.length; i++) {
      expect(canTransition(happyPath[i - 1] as never, happyPath[i] as never)).toBe(true);
    }
  });

  it("supports reviewer 'request changes' without weakening the gate", () => {
    expect(canTransition("AWAITING_APPROVAL", "FIX_PLANNED")).toBe(true);
    expect(canTransition("AWAITING_APPROVAL", "FIX_FAILED")).toBe(true);
  });
});
