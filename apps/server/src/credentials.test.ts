import { describe, expect, it } from "vitest";
import {
  API_KEY_DISPLAY_PREFIX_LENGTH,
  API_KEY_PREFIX,
  formatDsn,
  generateApiKey,
  generateDsnPublicKey,
  hashApiKey,
} from "./credentials";

describe("API key generation", () => {
  it("produces rvk_-prefixed keys with a display prefix and a sha256 hash", () => {
    const generated = generateApiKey();
    expect(generated.key).toMatch(/^rvk_[0-9a-f]{40}$/);
    expect(generated.key.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(generated.keyPrefix).toBe(generated.key.slice(0, API_KEY_DISPLAY_PREFIX_LENGTH));
    expect(generated.keyHash).toBe(hashApiKey(generated.key));
    expect(generated.keyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(generated.keyHash).not.toContain(generated.key);
  });

  it("never repeats key material", () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateApiKey().key));
    expect(keys.size).toBe(100);
  });
});

describe("DSN credentials", () => {
  it("generates 32-hex public keys", () => {
    expect(generateDsnPublicKey()).toMatch(/^[0-9a-f]{32}$/);
  });

  it("renders DSN URLs with and without ports (ADR-0004 format)", () => {
    expect(formatDsn("http://localhost:3000", "abc123", "p-1")).toBe(
      "http://abc123@localhost:3000/p-1",
    );
    expect(formatDsn("https://rivet.example.com", "abc123", "p-1")).toBe(
      "https://abc123@rivet.example.com/p-1",
    );
  });
});
