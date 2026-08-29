# Rivet

Turborepo monorepo that uses **Bun** for installs, scripts, and Vercel builds.

## Requirements

- [Bun](https://bun.sh) 1.4.0 or later

```sh
curl -fsSL https://bun.sh/install | bash
```

## Develop

```sh
bun install
bun run dev
```

Run a single app:

```sh
bunx turbo run dev --filter=web
bunx turbo run dev --filter=docs
```

## Build

```sh
bun run build
```

```sh
bunx turbo run build --filter=web
bunx turbo run build --filter=docs
```

## Other scripts

```sh
bun run lint
bun run check-types
bun run format
```

## What's inside?

### Apps and Packages

- `web`: Next.js app
- `docs`: Next.js app
- `@repo/ui`: shared React component library
- `@repo/eslint-config`: shared ESLint configs
- `@repo/typescript-config`: shared `tsconfig.json`s

### Tooling

- [Bun](https://bun.sh) for package management and script execution
- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [Turborepo](https://turborepo.dev) for task orchestration
- [Prettier](https://prettier.io) for formatting

## Deploy on Vercel

Create **one Vercel project per app** and set the Root Directory to that app:

| App    | Root Directory |
| ------ | -------------- |
| `web`  | `apps/web`     |
| `docs` | `apps/docs`    |

Each app ships a `vercel.json` that:

- Installs Bun 1.4.0 on the build machine (Vercel’s default is 1.3.x, which cannot read this repo’s `bun.lock`)
- Installs from the monorepo root with `bun install --frozen-lockfile`
- Builds with `bunx turbo run build --filter=<app>`
- Runs Next.js and functions on the **Bun 1.x** runtime
- Relies on Vercel’s built-in monorepo skipping for unchanged apps

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

## Remote Caching

Vercel Remote Cache is enabled automatically for Turborepo deployments. To use it locally:

```sh
bunx turbo login
bunx turbo link
```

## Useful links

- [Turborepo tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Vercel + Turborepo](https://vercel.com/docs/monorepos/turborepo)
- [Vercel package managers](https://vercel.com/docs/package-managers)
- [Bun on Vercel](https://vercel.com/docs/functions/runtimes/bun)
