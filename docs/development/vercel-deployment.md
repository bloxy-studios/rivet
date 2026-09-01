# Deploying the apps to Vercel

The `web` and `docs` apps deploy to Vercel independently, using the Bun runtime.
(Self-hosting via Docker Compose — the primary deployment story — is tracked in
[../self-hosting/README.md](../self-hosting/README.md) and lands in Phase 1.)

Create **one Vercel project per app** and set the Root Directory to that app:

| App | Root Directory | Model |
| --- | --- | --- |
| `web` | `apps/web` | Next.js |
| `docs` | `apps/docs` | Next.js |
| `server` | `apps/server` | Bun Function via the [Build Output API](https://vercel.com/docs/build-output-api): the buildCommand bundles `vercel/entry.ts` (self-contained, `bun build --target=bun`) into `.vercel/output/functions/index.func/` on the Bun runtime, with a catch-all route to it |

### Why the server pins `"framework": null`

The server's `vercel.json` explicitly disables framework detection. With `hono` in
`dependencies`, Vercel auto-selects its **Hono preset** (detection is dependency +
well-known-filename based; `src/app.ts` importing hono is enough — entry file names
don't matter). That preset's builder deploys its own trace of the source tree, where
workspace imports like `@rivet/auth` cannot resolve at runtime (`/var/task` has no
monorepo layout), and routes every path to that broken function. `"framework": null`
plus an explicit Build Output API emit (`vercel/build.sh` — scripted because Vercel
caps `buildCommand` at 256 characters) leaves nothing to detection: the committed
`vercel/vc-config.json` (runtime `bun1.4.x`) and `vercel/output-config.json` (routes)
declare the one function Vercel deploys.

### The bundle must be self-contained — including dynamic imports

The function filesystem is read-only, and when Bun finds no `node_modules` it enables
auto-install: an unresolved bare specifier at runtime becomes a package-install
attempt that kills the process with `EROFS` — even when the importing library
`try/catch`es the import as an optional probe (Better Auth's instrumentation layer
probes `@opentelemetry/api` this way on the first auth request). Two defenses:

1. `@opentelemetry/api` is a real (pinned) dependency of `apps/server`, so
   `bun build` inlines it and the probe resolves in-bundle. Rivet is OTel-native
   (ADR-0004); this dependency is roadmap-aligned, not deployment-only.
2. `vercel/build.sh` ships an empty `node_modules/` inside the function (disables
   Bun auto-install, so any future unresolved probe fails as a clean, catchable
   module-not-found) and fails the build if the bundle still contains any literal
   runtime `import(...)` outside `node:`/`bun:` builtins — every quote and
   whitespace form, bare packages and relative chunks alike
   (`vercel/audit-bundle.ts`, unit-tested).

Each app ships a `vercel.json` that:

- Installs Bun 1.4.0 on the build machine (Vercel's default Bun may be older and unable
  to read this repo's `bun.lock`)
- Installs from the monorepo root with `bun install --frozen-lockfile`
- Builds with `bunx turbo run build --filter=<app>`
- Runs Next.js and functions on the **Bun 1.x** runtime
- Relies on Vercel's built-in monorepo skipping for unchanged apps

When importing the Git repository in the Vercel dashboard:

1. Select the repository
2. Set **Root Directory** to the app's directory
3. Framework Preset: Next.js for `web`/`docs`; **Other** for `server` (its
   `vercel.json` pins `"framework": null` — the dashboard setting is the backstop)
4. Do not override the Install or Build commands — `vercel.json` already sets them

The `web` project requires `RIVET_API_URL` (the rivet-server deployment URL) so its
same-origin `/api/*` proxy reaches the API; the server's `RIVET_BASE_URL` must be the
web app's public origin so identity cookies and origin checks align.

> **Build-time env vars must be declared in `turbo.json`.** Turborepo runs builds in
> strict env mode: an undeclared variable is stripped before `next build` runs, so a
> dashboard setting silently never reaches `next.config.ts` (the proxy then falls back
> to `localhost:3001` and every `/api/*` request 404s with
> `DNS_HOSTNAME_RESOLVED_PRIVATE`). `RIVET_API_URL` is declared under `web#build` in
> `env` — not `passThroughEnv` — so it is also hashed into the cache key and changing
> it invalidates stale builds. Any future variable read at build time needs the same
> treatment.

The `server` project additionally requires environment variables in Vercel project
settings — `DATABASE_URL` (a hosted Postgres such as Neon/Supabase), `RIVET_AUTH_SECRET`,
and `RIVET_BASE_URL` (the deployment URL). Until they are set, the deployment builds
and every request answers 500 naming the missing variables (names only). `/readyz`
reports 503 while the database is unreachable. Self-hosting via Docker Compose (PR-5)
remains the primary deployment model for the server.

Or deploy an app from its directory with the Vercel CLI:

```sh
bunx vercel link --cwd apps/web
bunx vercel deploy --cwd apps/web
```

## Remote caching

Vercel Remote Cache is enabled automatically for Turborepo deployments. To use it
locally:

```sh
bunx turbo login
bunx turbo link
```

## Useful links

- [Turborepo tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Vercel + Turborepo](https://vercel.com/docs/monorepos/turborepo)
- [Vercel package managers](https://vercel.com/docs/package-managers)
- [Bun on Vercel](https://vercel.com/docs/functions/runtimes/bun)
