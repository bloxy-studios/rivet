# docs

Next.js app in the Rivet monorepo. Use **Bun** from the repository root.

```sh
bun install
bunx turbo run dev --filter=docs
```

Open [http://localhost:3000](http://localhost:3000).

Build:

```sh
bunx turbo run build --filter=docs
```

## Deploy on Vercel

Import the repository and set **Root Directory** to `apps/docs`. Install, build, and the Bun runtime are configured in `vercel.json`.
