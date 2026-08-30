import { createAuthClient } from "better-auth/react";

/**
 * Same-origin by design: every /api/* request is proxied to the API server
 * by next.config.ts, so session cookies are first-party and the identity
 * engine's origin checks see this app's origin.
 */
export const authClient = createAuthClient();

export const { useSession, signIn, signUp, signOut } = authClient;
