/**
 * Integration tests for refs-sync.ts — media edge end-to-end path.
 *
 * Coverage: syncRefsForIntent → syncRefsForBlock / deleteOutgoingRefs →
 *           extractRefs → refs table INSERT / DELETE.
 *
 * Strategy (B-variant): mock.module("@/db/client", ...) + mock.module("@/db")
 * registered BEFORE any transitive import that resolves @/db, so that
 * better-sqlite3 (client.ts line 10) is never evaluated in the bun:test
 * process. The in-memory DB is constructed inside the factory callback so it
 * exists by the time refs-store.ts first reads the mocked module.
 *
 * This mirrors the ssrf-guard.test.ts pattern (mock before import) and reuses
 * the makeTestDb() + migrate() approach from media-store.test.ts.
 */

import { Database } from "bun:sqlite";
import { mock } from "bun:test";
import path from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "@/db/schema";

// ─── In-memory DB ─────────────────────────────────────────────────────────────
// Created here (top of file) so it exists before mock.module factories execute.

function makeTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.run("PRAGMA foreign_keys = ON");
  const db = drizzle({ client: sqlite, schema });
  migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  return db;
}

const testDb = makeTestDb();

// ─── Module-level mocks (must precede all imports that touch @/db) ────────────
//
// @/db/client must be stubbed first because @/db (the barrel) re-exports it
// via `export { db, schema } from "./client"`. Bun evaluates the barrel's
// static imports before our code runs unless we intercept at the leaf.
//
// Both paths are mocked so that whichever resolution path bun takes (barrel or
// direct) lands on our in-memory DB.

mock.module("@/db/client", () => ({
  db: testDb,
  schema,
}));

mock.module("@/db", () => ({
  db: testDb,
  schema,
  refs: schema.refs,
  plans: schema.plans,
  projects: schema.projects,
  intents: schema.intents,
  intentsArchive: schema.intentsArchive,
  media: schema.media,
  chatSessions: schema.chatSessions,
  chatMessages: schema.chatMessages,
  chatAttachments: schema.chatAttachments,
  chatStagedIntents: schema.chatStagedIntents,
}));

// ─── Imports that depend on @/db (after mock registration) ───────────────────

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import type { IntentLogEntry } from "@/builder/types/intent";
import { syncRefsForIntent } from "./refs-sync";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Insert a minimal plans row so FK constraints pass. */
function seedPlan(planId: string) {
  const now = new Date();
  testDb
    .insert(schema.plans)
    .values({
      id: planId,
      kind: "web",
      snapshot: JSON.stringify({ schemaVersion: 0 }),
      snapshotSeq: 0,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

/** Returns all refs rows for a given (planId, srcId) pair. */
function getRefs(planId: string, srcId: string) {
  return testDb
    .select()
    .from(schema.refs)
    .where(and(eq(schema.refs.planId, planId), eq(schema.refs.srcId, srcId)))
    .all();
}

/** Build a minimal IntentLogEntry for INSERT_BLOCK. */
function insertBlockEntry(
  planId: string,
  blockId: string,
  data: Record<string, unknown>,
): IntentLogEntry {
  return {
    id: `entry-${crypto.randomUUID()}`,
    planId,
    origin: "test",
    lamport: 1,
    createdAt: Date.now(),
    kind: "primary",
    intent: {
      type: "INSERT_BLOCK",
      parentId: "screen:root",
      block: {
        id: blockId,
        parentId: "screen:root",
        kind: "figure",
        data,
      },
    },
  } as unknown as IntentLogEntry;
}

/** Build a minimal IntentLogEntry for UPDATE_BLOCK. */
function updateBlockEntry(
  planId: string,
  blockId: string,
  patch: Record<string, unknown>,
): IntentLogEntry {
  return {
    id: `entry-${crypto.randomUUID()}`,
    planId,
    origin: "test",
    lamport: 2,
    createdAt: Date.now(),
    kind: "primary",
    intent: {
      type: "UPDATE_BLOCK",
      nodeId: blockId,
      patch,
    },
  } as unknown as IntentLogEntry;
}

/** Build a minimal IntentLogEntry for DELETE_BLOCK. */
function deleteBlockEntry(planId: string, blockId: string): IntentLogEntry {
  return {
    id: `entry-${crypto.randomUUID()}`,
    planId,
    origin: "test",
    lamport: 3,
    createdAt: Date.now(),
    kind: "primary",
    intent: {
      type: "DELETE_BLOCK",
      nodeId: blockId,
    },
  } as unknown as IntentLogEntry;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("syncRefsForIntent — media edge integration", () => {
  let planId: string;
  let blockId: string;

  beforeEach(() => {
    // Unique IDs per test to avoid cross-test interference.
    planId = `plan-refs-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    blockId = `block-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    seedPlan(planId);
  });

  // Cascade delete via plan row removal cleans up refs rows.
  afterEach(() => {
    testDb.delete(schema.plans).where(eq(schema.plans.id, planId)).run();
  });

  // ── Scenario 1 ─────────────────────────────────────────────────────────────
  it("INSERT_BLOCK with src='media:abc' inserts exactly one media edge", () => {
    syncRefsForIntent(insertBlockEntry(planId, blockId, { src: "media:abc" }));

    const rows = getRefs(planId, blockId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      planId,
      srcId: blockId,
      dstId: "media:abc",
      kind: "media",
    });
    // id is deterministic: ${srcId}::${kind}::${dstId}
    expect(rows[0].id).toBe(`${blockId}::media::media:abc`);
  });

  // ── Scenario 2 ─────────────────────────────────────────────────────────────
  it("UPDATE_BLOCK changing src from media:abc to media:def swaps edge (1 edge total)", () => {
    // Precondition: INSERT_BLOCK creates initial media edge.
    syncRefsForIntent(insertBlockEntry(planId, blockId, { src: "media:abc" }));
    expect(getRefs(planId, blockId)).toHaveLength(1);

    // UPDATE_BLOCK with data containing new src.
    syncRefsForIntent(
      updateBlockEntry(planId, blockId, { data: { src: "media:def" } }),
    );

    const rows = getRefs(planId, blockId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      planId,
      srcId: blockId,
      dstId: "media:def",
      kind: "media",
    });
    // Old edge must be gone.
    expect(rows.find((r) => r.dstId === "media:abc")).toBeUndefined();
  });

  // ── Scenario 3 ─────────────────────────────────────────────────────────────
  //
  // Design note: syncRefsForBlock(planId, blockId, patch.data) computes refs
  // from `patch.data` alone — NOT the merged block snapshot. This is by
  // design (§3-5 D: avoid hydration cost). A caption-only patch produces an
  // empty extractRefs result, so the existing media edge is removed.
  // This test verifies that behavior is correct and consistent.
  it("UPDATE_BLOCK with caption-only data (no media token) clears the media edge", () => {
    // Precondition: INSERT_BLOCK creates initial media edge.
    syncRefsForIntent(insertBlockEntry(planId, blockId, { src: "media:abc" }));
    expect(getRefs(planId, blockId)).toHaveLength(1);

    // patch.data has no media: token — refs-sync correctly computes empty set.
    syncRefsForIntent(
      updateBlockEntry(planId, blockId, {
        data: { caption: "Updated caption text" },
      }),
    );

    const rows = getRefs(planId, blockId);
    expect(rows).toHaveLength(0);
  });

  // ── Scenario 4 ─────────────────────────────────────────────────────────────
  it("DELETE_BLOCK removes all outgoing edges including media edges", () => {
    // Precondition: INSERT_BLOCK creates initial media edge.
    syncRefsForIntent(insertBlockEntry(planId, blockId, { src: "media:abc" }));
    expect(getRefs(planId, blockId)).toHaveLength(1);

    syncRefsForIntent(deleteBlockEntry(planId, blockId));

    expect(getRefs(planId, blockId)).toHaveLength(0);
  });

  // ── Scenario 5 ─────────────────────────────────────────────────────────────
  it("INSERT_BLOCK with two distinct media refs emits two media edges", () => {
    syncRefsForIntent(
      insertBlockEntry(planId, blockId, {
        src: "media:abc",
        faviconUrl: "media:def",
      }),
    );

    const rows = getRefs(planId, blockId);
    expect(rows).toHaveLength(2);

    const dstIds = rows.map((r) => r.dstId).sort();
    expect(dstIds).toEqual(["media:abc", "media:def"]);

    for (const row of rows) {
      expect(row.kind).toBe("media");
      expect(row.planId).toBe(planId);
      expect(row.srcId).toBe(blockId);
    }
  });

  // ── Bonus: UPDATE_BLOCK without data key is a no-op ───────────────────────
  it("UPDATE_BLOCK patch without 'data' key leaves refs untouched", () => {
    // Precondition: INSERT_BLOCK creates initial media edge.
    syncRefsForIntent(insertBlockEntry(planId, blockId, { src: "media:abc" }));
    expect(getRefs(planId, blockId)).toHaveLength(1);

    // Patch without data key — e.g. changing display order only.
    // refs-sync skips UPDATE_BLOCK when patch has no 'data' key (refs-sync.ts L31).
    syncRefsForIntent(updateBlockEntry(planId, blockId, { order: 5 }));

    const rows = getRefs(planId, blockId);
    expect(rows).toHaveLength(1);
    expect(rows[0].dstId).toBe("media:abc");
  });
});
