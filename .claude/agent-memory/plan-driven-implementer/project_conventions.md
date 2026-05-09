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

## E7 PR-4 패턴 (2026-05-09)

### SSRF 가드 (ssrf-guard.ts)
- 순수 함수로 분리: `isBlockedIPv4`, `isBlockedIPv6`, `checkHostname`, `guardUrl`.
- `SsrfError extends Error` 클래스 — `code: SsrfErrorCode` 필드로 HTTP 응답 분기.
- DNS lookup: `import { lookup } from "node:dns/promises"`. 도메인에만 적용, IP 리터럴은 skip.
- TOCTOU 잔재 인지됨 — v1 수용 (완전 방어는 소켓 레벨 peer-IP 검사 필요).

### Bun 테스트 패턴
- `mock.module("node:dns/promises", ...)` — 반드시 테스트 파일 최상단 (import 전)에 호출.
- `rejects.toSatisfy` Bun에서 불안정 — `try/catch + instanceof + expect` 패턴 사용.

### 공유 media 검증 헬퍼 (media-store.ts)
- `validateAndClassifyMediaBuffer(buffer, declaredMime?)`: mime sniff + SVG script 가드 + raster dimension 추출 통합.
- `ALLOWED_MEDIA_MIMES` Set export — upload route와 from-url route 양쪽에서 import.
- throw는 `MediaValidationError` discriminated union (code: UNSUPPORTED_MIME | MIME_MISMATCH | SVG_SCRIPT).

### from-url 라우트
- `AbortSignal.timeout(30_000)` — fetch 타임아웃. TimeoutError catch.
- streaming cap: `response.body.getReader()` loop, 누적 바이트 초과 시 즉시 abort + 413.
- Content-Length 사전 체크 후 streaming 이중 cap 패턴.

### Biome import 정렬 규칙
- `type` import는 value import 앞에 위치 (alphabetical 내에서도). `organizeImports` 어시스트 오류 발생 시 수동 재정렬.
