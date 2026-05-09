---
name: build_known_issues
description: Pre-existing TS and build failures that existed before E7 PR-1 and are not our responsibility
type: project
---

## Pre-existing failures (as of 2026-05-09, commit 6384341)

### `bun run build` fails
- `scripts/plan-export.ts`, `plan-import.ts`, `plan-orphans.ts`, `plan-rebuild-refs.ts`, `plan-rebuild-search.ts`: `TS2451 Cannot redeclare block-scoped variable 'API'` — scripts share a global scope issue.
- These are in the `scripts/` folder which is NOT excluded from `tsconfig.json` `include` but was apparently broken before E7.

### `bunx tsc --noEmit` fails
- Same `scripts/` errors as above.
- `src/db/migrate.test.ts`: `TS2769` — test passes incomplete AppState object to `expect()`.
- `src/services/third-party-facade/plan-compaction.ts:87`: `TS2345` — SQLiteTransaction vs BetterSQLite3Database mismatch.

**Why:** Confirmed by git stash test — build was already broken at HEAD before PR-1.
**How to apply:** Do not count these as PR-1 regressions. Document in PR diff summary.

## E7 PR-5 추가 확인 (2026-05-09)

- `bunx tsc --noEmit` 결과에서 `src/` 내 PR-5 관련 신규 에러 없음.
- `src/services/third-party-facade/plan-compaction.ts:87` 에러는 기존 이슈 — `$client` 누락.
- 위 항목들 모두 pre-existing이며 PR-5 코드는 TS 에러 없음.
