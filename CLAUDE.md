# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Product Intent

This Next.js app is **not** a deployable web service. It's a **locally-built planning workspace** for designing web/mobile apps together with Claude Code:

- Users clone the repo, build/run locally, and use the UI to draft plans, specs, and design docs.
- Documents must be exportable to **PDF** and **image** files.
- All persistence is **local-only**: SQLite database file lives inside the project folder; no remote DB, no cloud deploy target.
- Treat anything that assumes a hosted environment (auth providers, server secrets, edge runtime, multi-tenant concerns) as out of scope unless explicitly asked.

## Stack & Runtime

- **Runtime/package manager: Bun.** Use `bun`, `bun run`, `bunx` — never `node`, `npm`, `npx`. Tests run via `bun test`.
- **Next.js 16** with **React 19.2** and the **React Compiler enabled** (`reactCompiler: true` in `next.config.ts`). Do not hand-write `useMemo`/`useCallback` for compiler-eligible cases.
- **Tailwind CSS v4** via `@tailwindcss/postcss`. Tokens live in `src/app/globals.css` (CSS variables, written by shadcn init).
- **shadcn/ui** (neutral base, CSS variables) — components in `src/components/ui/`. Do not edit them speculatively; re-run the CLI for upgrades.
- **Biome 2** is the single linter+formatter. Next + React rule domains are on; `noUnknownAtRules` is disabled for Tailwind v4 at-rules.
- **Planned (not yet wired): SQLite + Drizzle ORM** for local persistence. When introducing it, place the DB file inside the project root (e.g. `./local.db`) and gitignore it.

## Working Notes (`ai-docs/`)

- `ai-docs/` is the dropbox for Claude's own working artifacts: hand-off notes between sessions, planning/cleanup docs the user explicitly asks for, scratch design memos.
- File naming: `hand-off-<ticket>.md` for hand-offs (e.g. `hand-off-export-pdf.md`); freeform names for planning docs the user requests.
- `ai-docs/` is **gitignored** — never commit, never push, never reference its contents from code or other tracked files. Treat it as local-only context that future Claude instances can read but the repo does not depend on.
- Do **not** create files here unprompted just to "document the work." Only write when (a) finishing a session that another Claude instance will pick up, or (b) the user asks for a plan/summary doc.

## Commands

```bash
bun install              # install deps
bun run dev              # next dev (default localhost:3000)
bun run build            # next build
bun run start            # next start (post-build)
bun run lint             # biome check
bun run format           # biome format --write
bun test                 # bun's built-in test runner
```

There is no test setup yet — when adding tests, prefer `bun test` and colocate `*.test.ts(x)` next to the unit under test. To run one file: `bun test path/to/file.test.ts`.

### Drizzle Studio gotcha

`bun run db:studio` boots `drizzle-kit studio` on `https://localhost:4983` with a **self-signed cert** (CN=localhost, issuer=localhost — *not* mkcert-signed, regardless of whether mkcert is installed). The Studio UI lives at `https://local.drizzle.studio` and fetches that local endpoint, so Chromium browsers (Arc/Chrome) block it with `ERR_CERT_AUTHORITY_INVALID`. The `chrome://flags/#allow-insecure-localhost` flag was removed in Chrome 147+, so don't suggest it.

**Working bypass**: open a new tab → visit `https://localhost:4983` directly → on the cert warning page, type `thisisunsafe` (no input field — just type the string anywhere on the page). Chromium remembers the exception for this origin, after which `https://local.drizzle.studio` reload works.

Arc also blocks Local Network Access by default — toggle it via Site Control Center (sliders icon at the right end of the address bar) → 로컬 네트워크 → 허용. Both fixes are required together.

## Next.js 16 Caveat

`AGENTS.md` warns this Next.js version has breaking changes from prior knowledge. Before writing routing, caching, server actions, or fetch code, **read the relevant page in `node_modules/next/dist/docs/`** (organized as `01-app`, `02-pages`, `03-architecture`, `04-community`). Heed deprecation notices instead of relying on training data.

## Architecture

The `src/` tree is organized so framework, third-party, state, and data concerns each have one home. Match new code to the matching folder rather than colocating freely.

```
src/
├── app/                       # Next.js App Router (layouts, routes, globals.css)
├── components/ui/             # shadcn/ui primitives — generated, not hand-curated
├── hooks/                     # cross-cutting hooks (e.g. use-mobile)
├── lib/utils.ts               # cn() and other tiny helpers
├── services/
│   ├── stores/                # Zustand stores (client state). Each store is a
│   │                          # "use client" module exporting a single hook.
│   ├── providers/             # React context providers (TanStack Query, Tooltip,
│   │                          # Sonner). `AppProviders` composes them and is
│   │                          # mounted once in app/layout.tsx.
│   └── third-party-facade/    # Single point of contact for each third-party SDK.
│                              # axios.ts exposes httpClient + request<T>() with
│                              # normalized errors. New SDKs go here so swaps
│                              # touch one file.
└── data/                      # Data Access Layer (TanStack Query + axios facade)
    ├── query-keys.ts          # central key factory — all keys live here
    └── <resource>/            # one folder per resource (template: users/)
        ├── types.ts           # entity + input types
        ├── api.ts             # CRUD calls via request<T>() facade
        ├── queries.ts         # useXxxQuery hooks
        ├── mutations.ts       # useXxxMutation hooks with invalidation
        └── index.ts           # public surface
```

### Conventions

- **State boundaries**: server state → TanStack Query (`src/data/`); client/UI state → Zustand (`src/services/stores/`); ephemeral local state → component `useState`. Don't put server data in Zustand.
- **No direct axios imports outside the facade.** Every HTTP call goes through `request<T>()` from `@/services/third-party-facade`. Same pattern when adding new SDKs (e.g. PDF/image export libs, Drizzle client) — wrap once, import the wrapper everywhere else.
- **Adding a resource**: copy `src/data/users/` to `src/data/<resource>/`, extend `queryKeys` in `query-keys.ts`. Don't invent ad-hoc query key arrays at call sites.
- **Mutations** must invalidate the relevant `queryKeys.<resource>.all` (and `detail(id)` where applicable). Follow the pattern in `data/users/mutations.ts`.
- **Providers**: add new global providers to `services/providers/app-providers.tsx`. Route-group-scoped providers go into the relevant `app/(group)/layout.tsx` and import from `services/providers/`.
- **Path alias**: `@/*` → `src/*` (see `tsconfig.json`).
- **API base URL**: `httpClient` reads `NEXT_PUBLIC_API_BASE_URL`, falling back to `/api`. For the local-only model, route handlers under `src/app/api/` are the expected backend.

### When SQLite + Drizzle land

Expected layout (not yet present — create when implementing):

- `src/db/schema.ts` — Drizzle schema definitions
- `src/db/client.ts` — Drizzle client + better-sqlite3 / bun:sqlite connection (single instance)
- `drizzle.config.ts` at repo root for migrations
- `drizzle/` for generated migration SQL
- DB file (e.g. `local.db`) in repo root, gitignored

The Drizzle client is a third-party dependency — wrap access through `services/third-party-facade/` (or a dedicated `src/db/` module that is the only importer of `drizzle-orm`) so the rest of the code depends on a project-owned interface, not the ORM directly. Server-side data fetching (route handlers, server actions) calls Drizzle; the client still goes through the existing TanStack/axios DAL hitting `app/api/` routes.

### Document export (PDF / image)

When the export feature is built, the rendering library (puppeteer, playwright, @react-pdf, satori, etc.) belongs in `services/third-party-facade/`. Expose a project-shaped API like `exportToPdf(doc)` / `exportToImage(doc)` so the chosen engine can be swapped without touching call sites.
