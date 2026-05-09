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
- Solution A (preferred for new facades): `makeXxxStore(db)` factory pattern — inject `bun:sqlite` + `drizzle-orm/bun-sqlite` in-memory DB. No `@/db` barrel import needed.
- Solution B (for existing facades with static `@/db` imports): make DB access lazy via `getDb() { return require("@/db").db }` + import schema objects from `@/db/schema` directly. Then `mock.module("@/db", ...)` in test file (before all imports) substitutes in-memory DB.
- `refs-store.ts` was refactored to Solution B pattern (PR-5 test boilerplate). `getDb()` lazy getter + `import { refs } from "@/db/schema"`.
- Run `migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") })` in test setup to get full schema.
- `mock.module` must be called BEFORE importing any module that transitively imports `@/db`. Use `ssrf-guard.test.ts` ordering as reference.
- `bun test src/services/third-party-facade/refs-sync.test.ts` works standalone. For multi-file runs, use `--isolate` if module cache conflicts appear.

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

## Builder types import 그래프 (E8 PR-1, 2026-05-09)

- `entity.ts` → 아무것도 import하지 않음 (leaf).
- `state.ts` → `entity.ts`, `intent.ts`를 import.
- `intent.ts` → `entity.ts`를 import.
- 신규 타입은 `entity.ts`에 두면 순환 없이 state.ts/intent.ts 양쪽이 import 가능.
- `EntityStatus`를 `entity.ts`에 두고 `SectionStatus`는 alias로 유지 (breaking change 없음).

## Builder reducer/inverse 슬라이스 패턴 (E8 PR-1)

- 신규 슬라이스 파일: `reducer/<name>.ts` + `inverse/<name>.ts`.
- reducer: `apply<Name>(state, entry): SliceResult | null` — 미매칭 인텐트는 null 반환.
- inverse: `invert<Name>(entry, prevState): Intent | null` — 미매칭 인텐트는 null 반환.
- `reducer/index.ts` SLICES 배열과 `inverse/index.ts` SLICES 배열에 각각 추가.
- `applySync`는 reducer 마지막에 위치해야 함 (search-index 동기화) — 새 슬라이스는 그 앞에 삽입.

## DropdownMenuTrigger render prop 패턴 (E9 PR-D)

- 이 프로젝트의 Radix/shadcn DropdownMenuTrigger는 `asChild` 대신 `render` prop을 사용.
- `<DropdownMenuTrigger render={<Button ...>...</Button>} />` (self-closing).
- `asChild` 사용 시 TS2322 타입 오류 발생.

## Zustand subscribe 2인자 불가 (E9 PR-D)

- vanilla Zustand subscribe는 `(state, prevState) => void` 1-listener 시그니처.
- selector + callback 형태의 2인자 subscribe는 `subscribeWithSelector` 미들웨어 필요.
- 미들웨어 없이 selector 패턴 쓰려면: 리스너 안에서 prev 값을 클로저로 캐싱해 변경 감지.

## diff 패키지 (E10 PR-C, 2026-05-10)

- `diff` v9 + `@types/diff` v8 installed.
- `diffLines(before, after)` 반환 타입: `Array<{ added?: boolean; removed?: boolean; value: string }>`.
- `import { diffLines } from "diff"` — named export 사용.

## compareSnapshots 순수 함수 패턴 (E10 PR-C, 2026-05-10)

- `src/builder/diff/compare-snapshots.ts`: no React/Zustand/DOM import — bun:test에서 직접 구동 가능.
- `stableStringify`: sorted-key recursive JSON.stringify로 deep equality 판단. inline 15줄.
- entity extractor: lamport/origin/appliedEntries 등 런타임 필드 제거 후 structural 필드만 비교.
- `diffRecords<T>`: 범용 id-set bucketer — added/removed/modified 3-way 분류.
- entityMeta diff: status/assignee/dueDate/viewModeOverride 4개 필드만. modified 맵에 병합(중복 entry 방지).
- children move: addedIds/removedIds에 속한 parent는 skip.
- 정렬: `(kind, id)` ascending — 테스트 assertion 안정화.
- `(obj ?? {})[id]` 패턴 → biome `useOptionalChain` 경고 유발. `obj?.[id]` 로 써야 함.

## DiffPanel live state 접근 패턴 (E10 PR-C, 2026-05-10)

- `useActiveBuilderStore((s) => s.store)` 로 BuilderStore hook 참조 획득.
- 획득한 hook을 `builderStoreHook((s) => s.state)` 처럼 직접 호출해 AppState 읽기.
- hook이 null이면(BuilderProvider 외부) `liveState = null` — DiffPanel이 에러 상태 표시.
- `version.snapshot` JSON 파싱은 `useMemo` 안에서 try/catch 처리 → `{ ok, snapshot | message }` discriminated union.

## PrintOptionsStore + PrintView Cover/TOC 패턴 (E10 PR-D, 2026-05-10)

- `print-options.store.ts`: persist v1 + no-op migrate. `usePrintOptionsStore.getState()` 로 render 외부(trigger 함수)에서 단발 읽기 — selector 불필요.
- `PopoverTrigger render={<Button .../>}` + children 아이콘 포함: base-ui Trigger가 render prop Element에 자식을 병합. DropdownMenuTrigger와 동일 패턴.
- `Switch` base-ui API: `checked` + `onCheckedChange={(v) => setter(v)}`. `onCheckedChange` 첫 인자가 `boolean`.
- PrintView Cover/TOC props: `Omit<PrintViewProps, "pageNumbers" | "footerText">` 패턴 — PDF-only props를 타입 정의에는 두되 함수 파라미터에서는 제외(Biome noUnusedVariables 방지).
- Boolean searchParam 파싱: `param !== "false"` (null/missing → defaultVal) 패턴. route handler + print page 양쪽에 동일하게 적용.
- footerText 길이 클램핑: route handler에서 `slice(0, 200)` 적용.
- PNG export에 cover/toc 파라미터 전달: full-page screenshot이므로 커버+TOC 포함 전체 페이지 캡처 (적용 결정).

## VersionsUiStore + Drawer 패턴 (E10 PR-B, 2026-05-10)

- `versions-ui.store.ts`: persist 없는 에페머럴 Zustand 스토어. `create<T>()(...)` 패턴(theme-store 방식). `tagDialogOpen` 플래그도 같은 스토어에 포함해 커맨드팔레트에서 드로어+다이얼로그 동시 오픈 가능.
- `VersionsDrawer`에서 `openTagDialog` selector는 실제로 사용하지 않으면 Biome noUnusedVariables 에러 발생 — 사용하는 selector만 선언.
- `DropdownMenuTrigger`의 `render` prop 패턴은 `asChild` 대신 반드시 사용 (TS2322 방지). 자식 노드는 trigger 사이에 넣는 방식: `<DropdownMenuTrigger render={<Button .../>}><Icon/></DropdownMenuTrigger>`.
- Biome organizeImports: `theme-store`는 `time-window` 앞에 위치해야 알파벳 순서가 맞음.
- 커맨드팔레트 등록 절차: (1) `actions.ts`에 핸들러 추가, (2) `registry.ts` ICON_MAP에 아이콘 추가, (3) `commands.json`에 그룹과 커맨드 항목 추가 — 3파일 모두 수정 필요.
- React 컴포넌트 테스트: `@testing-library/react` 미설치. 컴포넌트 테스트 요구 시 Zustand 스토어 로직 단위 테스트(.test.ts)로 대체 가능 (기존 컨벤션 일치).

## Biome unsafe fix 주의 (E8 PR-1)

- `after!.state` → `after?.state` unsafe fix는 TS 타입 오류를 유발.
- round-trip 테스트에서는 `if (!after) throw new Error(...)` 가드 후 `after.state` 사용 (sections.test.ts L45 패턴).
