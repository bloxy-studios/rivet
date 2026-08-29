import { describe, expect, it } from "vitest";
import {
  isMoreSevere,
  isSeverity,
  meetsSeverityThreshold,
  SEVERITIES,
  severityRank,
} from "./severity";

describe("severity ordering", () => {
  it("ranks severities strictly from SEV0 (most severe) to SEV4 (least)", () => {
    const ranks = SEVERITIES.map(severityRank);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThan(ranks[i - 1] as number);
    }
  });

  it("treats SEV0 as more severe than SEV1", () => {
    expect(isMoreSevere("SEV0", "SEV1")).toBe(true);
    expect(isMoreSevere("SEV1", "SEV0")).toBe(false);
    expect(isMoreSevere("SEV2", "SEV2")).toBe(false);
  });

  it("evaluates policy thresholds inclusively", () => {
    expect(meetsSeverityThreshold("SEV0", "SEV1")).toBe(true);
    expect(meetsSeverityThreshold("SEV1", "SEV1")).toBe(true);
    expect(meetsSeverityThreshold("SEV2", "SEV1")).toBe(false);
  });

  it("rejects unknown severity strings", () => {
    expect(isSeverity("SEV5")).toBe(false);
    expect(isSeverity("sev0")).toBe(false);
    expect(isSeverity(0)).toBe(false);
    expect(isSeverity("SEV0")).toBe(true);
  });
});
