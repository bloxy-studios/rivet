/**
 * Credential material generation (pure; unit-tested). Storage invariants come
 * from @rivet/database: API keys are stored hash-only; DSN public keys are
 * ingest-only credentials (ADR-0004).
 *
 * Deliberately built on Web Crypto (crypto.subtle / getRandomValues) rather
 * than node:crypto: the platform globals are typed by `lib` and available on
 * every runtime this app targets (Bun, Node 18+, edge), keeping the deployed
 * import closure free of node builtins — which some hosted builders compile
 * file-by-file without @types resolution.
 */

export const API_KEY_PREFIX = "rvk_";
/** Characters of the key shown in the UI to identify it (never the rest). */
export const API_KEY_DISPLAY_PREFIX_LENGTH = 12;

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export interface GeneratedApiKey {
  /** The full secret — returned to the caller exactly once, never stored. */
  key: string;
  /** Display prefix stored for identification (e.g. `rvk_a1b2c3d4`). */
  keyPrefix: string;
  /** SHA-256 hex of the full key — the only stored representation. */
  keyHash: string;
}

export async function hashApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(key));
  return toHex(new Uint8Array(digest));
}

export async function generateApiKey(): Promise<GeneratedApiKey> {
  const key = `${API_KEY_PREFIX}${randomHex(20)}`;
  return {
    key,
    keyPrefix: key.slice(0, API_KEY_DISPLAY_PREFIX_LENGTH),
    keyHash: await hashApiKey(key),
  };
}

/** 32-hex ingest credential embedded in SDK configuration. */
export function generateDsnPublicKey(): string {
  return randomHex(16);
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
