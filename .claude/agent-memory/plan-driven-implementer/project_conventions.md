---
name: project_conventions
description: DB client setup, facade patterns, ID generation, and test isolation patterns confirmed in this codebase
type: project
---

## DB client

- `src/db/client.ts`: opens `better-sqlite3` at module evaluation time. `DB_FILE_NAME` env var selects the file (default `./local.db`).
- `src/db/index.ts`: barrel re-exports from `client.ts` and `schema.ts`.
- `migrate()` runs automatically when `client.ts` loads — no separate migrate step needed at runtime.

## Facade pattern

- All facades live in `src/services/third-party-facade/`.
- `chat-uploads.ts` is the template: `LOCAL_ROOT` constant, `sanitizeFilename`, `ensureDir`, `buildStoragePath`, `deleteDir`.
- `media-store.ts` follows the same pattern for `local-media/<planId>/`.
- Facades import DB schema objects from `@/db/schema` (NOT `@/db`) to avoid loading `client.ts` eagerly.

## ID generation

- Pattern: `` `${prefix}_${crypto.randomUUID().replace(/-/g, "")}` ``
- Examples: `cs_` (chat session), `med_` (media), `am_` (assistant message).
- No `ulid` package in this repo — use `crypto.randomUUID()`.

## Test isolation (facade tests)

- `better-sqlite3` is NOT supported in `bun test` — crashes with `ERR_DLOPEN_FAILED`.
- Solution: use `makeXxxStore(db)` factory pattern in facades, inject a `bun:sqlite` + `drizzle-orm/bun-sqlite` in-memory DB in tests.
- Run `migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") })` in test setup to get full schema.
- Production singletons use lazy `require("@/db").db` inside function bodies — avoids loading `better-sqlite3` at import time when tests import the facade module.

## Route handler pattern (Next.js 16)

- `params` is a **Promise** in Next.js 16: `{ params }: { params: Promise<{ id: string }> }` → `const { id } = await params`.
- Always add `export const runtime = "nodejs"` for routes that do file I/O.
- Response pattern: `new NextResponse(new Uint8Array(buffer), { headers: {...} })` (same as PDF export route).

## Drizzle migrations

- Run `bunx drizzle-kit generate` to create migration SQL from schema diff.
- Generator may assign a random name — rename to `0008_<slug>.sql` and update `drizzle/meta/_journal.json` tag field.
- `drizzle/meta/0008_snapshot.json` has no `tag` field — only `_journal.json` needs updating.
- Confirm clean after rename: `bunx drizzle-kit generate` → "No schema changes, nothing to migrate".

**Why:** Confirmed during E7 PR-1 implementation (2026-05-09).
**How to apply:** Follow this pattern for any new schema migration.

## DAL (data/) conventions

- Template: `src/data/users/` — copy and adapt for each new resource.
- `api.ts`: `request<T>()` facade only. Multipart: build `FormData`, pass `headers: { "Content-Type": undefined }` to let axios set the boundary.
- `queries.ts`/`mutations.ts`: `"use client"` directive required; import `queryKeys` from `../query-keys`.
- `mutations.ts`: invalidate `queryKeys.<resource>.all` + `queryKeys.<resource>.list(id)` both on success.
- `query-keys.ts`: extend with `{ all, list(planId), detail?(id) }` namespaces. `as const` required.

## Biome lint pitfalls (E7 PR-2)

- Hook-named functions called inside loops trigger `useHookAtTopLevel` — expand to individual `it()` calls per case.
- `let row;` without init triggers `noImplicitAnyLet` — use `let row: Awaited<ReturnType<typeof fn>>`.
- Import order must be alphabetical within groups — run `bunx biome check --apply` or sort manually.

## file-type / image-size (E7 PR-2)

- `file-type` is ESM-only; use `await import("file-type")` (dynamic) inside async functions to avoid static ESM/CJS interop issues with Next.js.
- `image-size` v2: `imageSize(buf)` (sync, pure JS); import as `import { imageSize } from "image-size"`.
- Both packages installed at E7 PR-2 (file-type@22.0.1, image-size@2.0.2).
