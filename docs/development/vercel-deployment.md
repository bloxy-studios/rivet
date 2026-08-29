# Deploying the apps to Vercel

The `web` and `docs` apps deploy to Vercel independently, using the Bun runtime.
(Self-hosting via Docker Compose — the primary deployment story — is tracked in
[../self-hosting/README.md](../self-hosting/README.md) and lands in Phase 1.)

Create **one Vercel project per app** and set the Root Directory to that app:

| App | Root Directory |
| --- | --- |
| `web` | `apps/web` |
| `docs` | `apps/docs` |

Each app ships a `vercel.json` that:

- Installs Bun 1.4.0 on the build machine (Vercel's default Bun may be older and unable
  to read this repo's `bun.lock`)
- Installs from the monorepo root with `bun install --frozen-lockfile`
- Builds with `bunx turbo run build --filter=<app>`
- Runs Next.js and functions on the **Bun 1.x** runtime
- Relies on Vercel's built-in monorepo skipping for unchanged apps

When importing the Git repository in the Vercel dashboard:

1. Select the repository
2. Set **Root Directory** to `apps/web` or `apps/docs`
3. Leave Framework Preset as Next.js
4. Do not override the Install or Build commands — `vercel.json` already sets them

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
