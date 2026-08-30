import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  RIVET_AUTH_SECRET: z
    .string()
    .min(32, "must be at least 32 characters (generate with: openssl rand -base64 32)"),
  RIVET_BASE_URL: z.url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  /** Comma-separated extra origins allowed past the CSRF check. */
  RIVET_TRUSTED_ORIGINS: z.string().optional(),
});

export interface ServerEnv {
  databaseUrl: string;
  authSecret: string;
  baseUrl: string;
  port: number;
  trustedOrigins: string[];
}

/**
 * Parses and validates server configuration from the environment, failing
 * fast with an actionable message listing every problem at once.
 */
export function loadEnv(source: Record<string, string | undefined>): ServerEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid server configuration:\n${problems}\nSee .env.example at the repository root for every variable.`,
    );
  }
  return {
    databaseUrl: parsed.data.DATABASE_URL,
    authSecret: parsed.data.RIVET_AUTH_SECRET,
    baseUrl: parsed.data.RIVET_BASE_URL,
    port: parsed.data.PORT,
    trustedOrigins: (parsed.data.RIVET_TRUSTED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}
