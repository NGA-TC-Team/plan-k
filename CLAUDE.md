# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Product Intent

This Next.js app is **not** a deployable web service. It's a **locally-built planning workspace** for designing web/mobile apps together with Claude Code:

- Users clone the repo, build/run locally, and use the UI to draft plans, specs, and design docs.
- Documents must be exportable to **PDF** and **image** files.
- All persistence is **local-only**: SQLite database file lives inside the project folder; no remote DB, no cloud deploy target.
- Treat anything that assumes a hosted environment (auth providers, server secrets, edge runtime, multi-tenant concerns) as out of scope unless explicitly asked.

## Workflow: Plan vs. Implement

이 프로젝트는 **계획과 구현을 분리**한다. 메인 에이전트는 계획·설계·조사를 담당하고, 실제 코드 작성은 `plan-driven-implementer` 서브에이전트에게 위임한다.

- **메인 에이전트(여기) 담당**: 요구사항 정리, DoD 7속성 점검, 아키텍처 결정, 파일/모듈 배치 결정, 대안 비교, 핸드오프 문서 작성, 사용자와의 합의. **결정과 합의에만 집중**하고 탐색·구현은 서브에이전트에 위임한다.
- **`Explore` 서브에이전트 담당 (조사·탐색)**: 코드베이스 탐색, 파일 위치 파악, 심볼/키워드 검색, 컨벤션 확인, "X가 어디에 정의되어 있나 / Y를 참조하는 파일은 어디인가" 류 질문. 메인이 계획을 세우기 전 컨텍스트 수집 단계에서 적극 활용.
- **`plan-driven-implementer` 담당 (구현)**: 합의된 계획을 받아 실제 파일을 생성·수정. Edit/Write/Bash 등 코드를 변경하는 도구 호출은 이 에이전트가 수행.

### Explore 위임 규칙

- **트리거**: 계획·설계 전 코드베이스 이해가 필요한 모든 시점. 한 번의 직접 조회로 끝나지 않을 것 같으면 (3개 이상의 grep/read가 예상되거나, 결과 분량이 클 때) 즉시 위임한다.
- **호출 방식**: `Agent` 도구로 `subagent_type: "Explore"` 지정. 프롬프트에는 (a) 무엇을 찾고 있는지, (b) 왜 필요한지(다음 결정에 어떻게 쓸지), (c) 탐색 범위 — `"quick"`(단일 조회) / `"medium"`(보통) / `"very thorough"`(여러 위치·네이밍 컨벤션 교차 탐색) 중 하나를 명시.
- **병렬 위임**: 독립적인 조사 질문이 둘 이상이면 한 메시지에 여러 `Agent` 호출을 묶어 동시에 실행한다. 메인 컨텍스트도 절약된다.
- **Explore가 적합하지 않은 경우**: 코드 리뷰, 설계 문서 감사, 파일 간 일관성 점검, 개방형 분석은 Explore가 발췌만 읽기 때문에 누락이 발생한다. 이때는 메인이 직접 `Read`로 전체 파일을 읽거나 `general-purpose` 에이전트를 쓴다.
- **직접 조회로 충분한 경우 (위임 불필요)**: 경로가 이미 알려진 단일 파일 `Read`, 정확한 심볼 한 번의 `rg`. 작은 단발 조회까지 위임하지는 않는다.

### plan-driven-implementer 위임 규칙

- **트리거**: 계획이 합의되어 "구현 시작" 단계로 진입하는 모든 시점. 사용자가 "코드 짜줘", "구현해줘", "그대로 만들어줘" 같은 신호를 주거나, 계획 검토가 끝난 직후.
- **호출 방식**: `Agent` 도구로 `subagent_type: "plan-driven-implementer"` 지정. 프롬프트에는 (a) 합의된 계획 전문 또는 `ai-docs/hand-off-*.md` 경로, (b) 변경 대상 파일/폴더, (c) 비목표(Non-goals), (d) 검증 명령(`bun run lint`, `bun test ...`)을 포함.
- **Explore 결과 전달**: Explore가 찾아준 파일 경로·라인 번호·관련 컨벤션을 implementer 프롬프트에 그대로 넣어 재탐색을 막는다.
- **예외 (메인이 직접 편집해도 되는 범위)**: CLAUDE.md / AGENTS.md / `ai-docs/` 안의 메모, 한 줄 오타 수정처럼 계획이 자명한 사소한 변경. 그 외 코드 변경은 모두 위임한다.
- **병렬 가능성 명시**: 메인이 위임 프롬프트를 작성할 때, 계획을 검토해 **병렬화 가능한 단위**가 있으면 그 분해를 프롬프트에 직접 적어준다 (예: "PR-1은 schema·facade·route 3단위로 나뉘며, schema 머지 후 facade·route 병렬 가능"). 단위 disjoint·의존 없음·검증 분리 3조건을 만족할 때만 병렬 후보로 표기.
- **git worktree 권장**: 병렬 위임 시 각 단위마다 worktree를 사용하도록 프롬프트에 명시. 가능하면 `Agent` 호출에 `isolation: "worktree"` 옵션을 사용. 단, **schema/마이그레이션 변경은 worktree 분기 금지** — `local.db`가 공유되어 마이그레이션 충돌이 난다. schema PR은 항상 메인 트리에서 단독.
- **병렬 호출 묶기**: 두 개 이상의 implementer를 병렬로 위임할 때는 한 메시지 안에 복수 `Agent` tool call을 넣어 동시 실행. 직렬 메시지로 분리하지 말 것.
- **머지 책임은 메인**: 각 worktree 작업이 끝나면 메인이 브랜치를 받아 순차 머지 + 통합 검증(`bun test` + `bunx tsc --noEmit` + `bun run build`) 수행. 충돌은 implementer가 아닌 메인이 해결.
- **단일 단위면 병렬화 금지**: 작업이 한 단위로 끝나거나 의존이 강하면 worktree 오버헤드를 피하고 순차 처리.
- **에러 처리 체크 강제**: 위임 프롬프트에 *"코드 작성 후 별도 에러 처리 체크 패스를 돌리고, 누락은 같은 PR에서 보강하라. 보고에 점검 결과 섹션을 포함하라"*를 항상 포함한다. 점검 항목은 외부 입력 검증·I/O catch 분기·HTTP 코드 정합성·non-null assertion 분기화·자원 정리·트랜잭션 경계·구조화 에러 페이로드·boundary 값 처리. (에이전트 파일의 "에러 처리 체크 + 누락 보강" 섹션과 동일.)
- **검증**: 서브에이전트 완료 후 메인이 결과물(diff, 실행 명령 결과, 에러 처리 점검 보고)을 확인하고 사용자에게 요약 보고. 미흡하면 후속 위임으로 보강.

### 표준 작업 흐름

1. 요구 접수 → 메인이 DoD 7속성 점검, 빠진 부분은 1~3개 질문.
2. 컨텍스트 수집 → **`Explore` 위임** (필요시 병렬). 메인은 직접 grep/find을 남발하지 않는다.
3. 메인이 Explore 결과를 종합해 계획·대안·비목표를 사용자에게 제시, 합의.
4. 합의된 계획 + Explore가 파악한 경로/컨벤션을 묶어 **`plan-driven-implementer`에 위임**.
5. 결과 확인 → 검증 명령 실행 결과 점검 → 사용자에게 요약 보고.

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

#### Zustand selectors — avoid the "infinite loop" trap

React 19's `useSyncExternalStore` (which Zustand uses under the hood) requires `getSnapshot` to return a **referentially stable** value when the underlying state hasn't changed. Returning a fresh object/array on every read triggers the runtime warning **"The result of getSnapshot should be cached to avoid an infinite loop"** and frequently escalates to **"Maximum update depth exceeded."**

Two failure shapes occur regularly in this codebase — guard against both whenever you write or modify a selector:

1. **Inline `?? []` / `?? {}` fallbacks.** `useStore(s => s.things[id] ?? [])` allocates a new `[]` on every render even when `s.things[id]` is `undefined`. Fix by hoisting a module-level constant: `const EMPTY: never[] = []` and `useStore(s => s.things[id] ?? EMPTY)`.
2. **Selectors that build a derived object/array.** `useStore(s => ({ a: s.a, b: s.b }))` returns a new object every render. Use the shallow-equal variant — for the chat/UI Zustand stores, wrap with `useShallow` from `zustand/react/shallow`; for the builder store, use the existing `useBuilderStateShallow` helper in `src/hooks/builder/use-builder-store.hook.ts`.

Rule of thumb: a selector is safe **only** if it returns a primitive, a stable function reference, or a value already stored in state. Anything else needs `useShallow`/`useBuilderStateShallow` or a hoisted constant. After adding a new selector, sanity-check by toggling React DevTools "Highlight updates" — a render storm on an idle screen is the symptom.

Do not "fix" the warning by wrapping the selector body in `useMemo`. The selector runs inside `getSnapshot`, which is called outside of React's render phase, so memoization there does not stabilize the reference.
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
