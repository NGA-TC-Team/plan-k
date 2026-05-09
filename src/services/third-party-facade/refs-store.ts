import { and, eq, inArray } from "drizzle-orm";
import {
  type ExtractedRef,
  extractRefs,
  refRowId,
} from "@/builder/refs/extract";
import type { AppState } from "@/builder/types/state";
// Import schema table objects from schema-only module so that importing this
// file in bun:test does NOT trigger client.ts (better-sqlite3 binding).
// The DB handle is accessed lazily via getDb() so mock.module("@/db") applied
// before the first function call can substitute an in-memory DB for tests.
import { refs } from "@/db/schema";

// biome-ignore lint/suspicious/noExplicitAny: adapter-agnostic drizzle instance
type AnyDb = any;

// Lazy DB accessor — resolves to the module-level mock when running under
// bun:test (registered before the first call), or the production singleton
// (better-sqlite3) in normal operation. Using require() rather than a static
// import prevents client.ts from being evaluated at module-load time.
function getDb(): AnyDb {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require("@/db") as { db: AnyDb }).db;
}

// Replace all outgoing refs for `srcId` with the given set. Idempotent —
// no-op when the next set equals the previous one. Single transaction so
// readers never see a partial graph.
export function syncRefsForBlock(
  planId: string,
  srcId: string,
  data: unknown,
): void {
  const next = extractRefs(data);
  const nextIds = new Set(next.map((r) => refRowId(srcId, r.kind, r.dstId)));

  getDb().transaction((tx: AnyDb) => {
    const existing = tx
      .select({ id: refs.id })
      .from(refs)
      .where(and(eq(refs.planId, planId), eq(refs.srcId, srcId)))
      .all()
      .map((r: { id: string }) => r.id);

    const toDelete = existing.filter((id: string) => !nextIds.has(id));
    if (toDelete.length > 0) {
      tx.delete(refs).where(inArray(refs.id, toDelete)).run();
    }

    if (next.length > 0) {
      // INSERT OR IGNORE — duplicate edges from a previous round are
      // collapsed by the unique index without churn.
      const rows = next.map((r) => ({
        id: refRowId(srcId, r.kind, r.dstId),
        planId,
        srcId,
        dstId: r.dstId,
        kind: r.kind,
      }));
      tx.insert(refs).values(rows).onConflictDoNothing().run();
    }
  });
}

// Removes every outgoing edge from `srcId`. Use when the source block is
// deleted. Incoming refs (other entities pointing AT srcId) are left so
// the UI can render them as broken links.
export function deleteOutgoingRefs(planId: string, srcId: string): void {
  getDb()
    .delete(refs)
    .where(and(eq(refs.planId, planId), eq(refs.srcId, srcId)))
    .run();
}

// Full rebuild from snapshot. Used by the rebuild API + import path. The
// transaction lets readers continue serving an older but consistent
// graph until the new one swaps in.
export function rebuildRefs(
  planId: string,
  snapshot: AppState,
): {
  blocks: number;
  edges: number;
} {
  let edgeCount = 0;
  const blockEntries = Object.entries(snapshot.blocks ?? {});
  getDb().transaction((tx: AnyDb) => {
    tx.delete(refs).where(eq(refs.planId, planId)).run();
    const buffer: {
      id: string;
      planId: string;
      srcId: string;
      dstId: string;
      kind: ExtractedRef["kind"];
    }[] = [];
    for (const [blockId, block] of blockEntries) {
      const next = extractRefs(block.data);
      for (const r of next) {
        buffer.push({
          id: refRowId(blockId, r.kind, r.dstId),
          planId,
          srcId: blockId,
          dstId: r.dstId,
          kind: r.kind,
        });
      }
    }
    if (buffer.length > 0) {
      tx.insert(refs).values(buffer).onConflictDoNothing().run();
      edgeCount = buffer.length;
    }
  });
  return { blocks: blockEntries.length, edges: edgeCount };
}

export function getIncomingRefs(planId: string, dstId: string) {
  return getDb()
    .select()
    .from(refs)
    .where(and(eq(refs.planId, planId), eq(refs.dstId, dstId)))
    .all();
}

export function getOutgoingRefs(planId: string, srcId: string) {
  return getDb()
    .select()
    .from(refs)
    .where(and(eq(refs.planId, planId), eq(refs.srcId, srcId)))
    .all();
}
