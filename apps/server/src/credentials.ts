import { createHash, randomBytes } from "node:crypto";

/**
 * Credential material generation (pure; unit-tested). Storage invariants come
 * from @rivet/database: API keys are stored hash-only; DSN public keys are
 * ingest-only credentials (ADR-0004).
 */

export const API_KEY_PREFIX = "rvk_";
/** Characters of the key shown in the UI to identify it (never the rest). */
export const API_KEY_DISPLAY_PREFIX_LENGTH = 12;

export interface GeneratedApiKey {
  /** The full secret — returned to the caller exactly once, never stored. */
  key: string;
  /** Display prefix stored for identification (e.g. `rvk_a1b2c3d4`). */
  keyPrefix: string;
  /** SHA-256 hex of the full key — the only stored representation. */
  keyHash: string;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): GeneratedApiKey {
  const key = `${API_KEY_PREFIX}${randomBytes(20).toString("hex")}`;
  return {
    key,
    keyPrefix: key.slice(0, API_KEY_DISPLAY_PREFIX_LENGTH),
    keyHash: hashApiKey(key),
  };
}

/** 32-hex ingest credential embedded in SDK configuration. */
export function generateDsnPublicKey(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Renders the DSN string an SDK consumes (ADR-0004):
 * `<scheme>://<publicKey>@<host>/<projectId>`. The ingest endpoints that
 * accept it land in Phase 2 — the credential format is fixed now so issued
 * DSNs stay valid.
 */
export function formatDsn(baseUrl: string, publicKey: string, projectId: string): string {
  const url = new URL(baseUrl);
  const port = url.port ? `:${url.port}` : "";
  return `${url.protocol}//${publicKey}@${url.hostname}${port}/${projectId}`;
}
