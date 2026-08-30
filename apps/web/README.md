# web

Rivet's product shell (Phase 1 / PR-4): the design-token system, auth screens,
organization/project flows, credential surfaces, and the ⌘K command palette —
built on `@rivet/ui` per `docs/design/design-language.md`.

## Run

```sh
# API server first (see apps/server/README.md), then:
bunx turbo run dev --filter=web    # http://localhost:3000
```

The app talks to the API through a **same-origin proxy** (`next.config.ts`
rewrites `/api/*` to `RIVET_API_URL`, default `http://localhost:3001`), so
session cookies are first-party and no CORS is involved. Point the API's
`RIVET_BASE_URL` at **this app's origin** (`http://localhost:3000` in dev) so
the identity engine's cookies and origin checks align.

On Vercel, set `RIVET_API_URL` on the rivet-web project to the rivet-server
deployment URL.

## What exists (honest inventory)

- Dark-first design tokens (severity/status/state/diff palettes, Geist + mono)
  with light parity and reduced-motion support
- Sign in / sign up against the real identity engine
- Organizations: list, create (creator becomes OWNER)
- Projects: list, create (ADMIN), project page with environments/services and
  DSN issue + copy
- Org settings → API keys: create (shown exactly once), list (prefix only), revoke
- Left nav listing every future surface **disabled with its phase label** — no
  dead buttons, no fake pages
- ⌘K command palette over the implemented surfaces (tested pure filter logic)

Authorization is enforced by the API on every call; the UI surfaces 403s
honestly rather than hiding affordances it cannot verify.
