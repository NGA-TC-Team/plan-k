---
name: build_known_issues
description: TS/build failures that were pre-existing before E7 PR-1 and how they were finally resolved
type: project
---

## Resolved on 2026-05-09 (E9 후속 정리 PR)

이전에 "pre-existing"으로 미뤄둔 3종 빌드/타입 에러를 해소.

### Scripts global-scope collision (TS2451 / TS2393)
- 원인: `scripts/plan-{export,import,orphans,rebuild-refs,rebuild-search}.ts` 5개 파일이 import/export가 없어 글로벌 스크립트로 취급됨 → `const API = ...` 와 함수명이 같은 짝수에서 redeclare 충돌.
- 해소: 각 파일 끝에 `export {};` 추가하여 모듈 스코프로 격상.

### plan-compaction.ts:87 (TS2345)
- 원인: `shiftCutoffForInverse(tx: typeof db, ...)`에 트랜잭션 콜백 인자(SQLiteTransaction)를 넘겼으나 `typeof db`는 `BetterSQLite3Database & { $client }`로 더 넓어 호환 실패.
- 해소: `type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0]`를 정의해 helper 시그니처에 사용. 트랜잭션 콜백 안에서만 호출되므로 안전.

### migrate.test.ts:8 (TS2769)
- 원인: bun `expect`가 received 타입(AppState)을 expected 인자로 좁히는데, 테스트의 `snap`은 `{ schemaVersion, foo }` 부분 객체였음.
- 해소: `expect(migrateSnapshot(snap) === (snap as unknown)).toBe(true)`로 reference equality를 boolean으로 환원.

**Why:** 6+ phase 동안 누적된 "pre-existing build red"가 후속 작업의 빌드 회귀 판별을 흐리게 함. 체인 끊고 클린 베이스로 E10 진입.

**How to apply:** 새 스크립트 파일은 처음부터 `export {};` 또는 실제 export를 포함. drizzle 트랜잭션 helper에는 `DbTx` 타입 사용.
