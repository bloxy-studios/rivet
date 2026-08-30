/**
 * Minimal ambient declarations for the runtime globals this app touches.
 *
 * Deliberately local, deliberately tiny: Vercel's function transpiler runs
 * the project tsconfig through its own TypeScript invocation, which has
 * proven unable to resolve `@types/*` libraries in this monorepo (TS2688 on
 * `types: ["bun"]`) even though local tsc and CI resolve them fine. The app
 * therefore depends on ZERO external type libraries (`"types": []`): the Web
 * platform types come from the `lib` setting, and the small Bun/process
 * surface used by the two entry points is declared here.
 *
 * If this file starts growing, that is the signal to stop widening it and
 * revisit the deployment model instead — entries are supposed to stay thin.
 */

interface RivetBunServeOptions {
  port?: number;
  fetch: (request: Request) => Response | Promise<Response>;
}

interface RivetBunServer {
  port: number;
  stop(): Promise<void>;
}

declare const Bun: {
  serve(options: RivetBunServeOptions): RivetBunServer;
};

declare const process: {
  env: Record<string, string | undefined>;
  on(event: "SIGINT" | "SIGTERM", handler: () => void): void;
  exit(code?: number): never;
};

// Node built-in modules used by this app's program (which also compiles the
// source-only workspace packages it imports). Only the exact surface in use.
declare module "node:crypto" {
  export interface RivetHasher {
    update(data: string): RivetHasher;
    digest(encoding: "hex"): string;
  }
  export function createHash(algorithm: "sha256"): RivetHasher;
  export function randomBytes(size: number): { toString(encoding: "hex"): string };
}

declare module "node:url" {
  export function fileURLToPath(url: URL | string): string;
}
