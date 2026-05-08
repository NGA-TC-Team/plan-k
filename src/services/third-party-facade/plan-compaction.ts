import { and, asc, eq, lte, sql } from "drizzle-orm";
import { hydrate } from "@/builder/hydrate";
import type { IntentLogEntry } from "@/builder/types/intent";
import type { AppState } from "@/builder/types/state";
import { db, intents, intentsArchive, plans } from "@/db";

// Threshold of *active* (non-archived) intents that triggers compaction.
// At trigger time we keep the most recent COMPACTION_TARGET entries in
// `intents` and fold the rest into the snapshot + archive.
export const COMPACTION_THRESHOLD = 200;
export const COMPACTION_TARGET = 100;

// How many entries past the cutoff we may shift to keep an inverse(undo)
// entry together with its parent in the same archive batch. If we cannot
// resolve the dependency within this window we skip compaction this round.
const INVERSE_BOUNDARY_WINDOW = 20;

type IntentRowSlim = {
  id: string;
  serverSeq: number;
  parentEntryId: string | null;
};

// Best-effort post-append compaction. Runs synchronously after a successful
// appendIntent so the same process serializes writes (better-sqlite3 is
// blocking). Failures are logged and swallowed — the next append retries.
export function maybeCompact(planId: string): void {
  try {
    runCompactionRound(planId);
  } catch (err) {
    console.warn(
      `[plan-compaction] round failed for plan=${planId}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

function runCompactionRound(planId: string): void {
  // Cheap pre-check outside the transaction. Same connection is single
  // writer so no race here, but `BEGIN IMMEDIATE` below still guards
  // against external clients (drizzle-studio etc).
  const countRow = db
    .select({ n: sql<number>`COUNT(*)` })
    .from(intents)
    .where(eq(intents.planId, planId))
    .get();
  const activeCount = countRow?.n ?? 0;
  if (activeCount <= COMPACTION_THRESHOLD) return;

  db.transaction(
    (tx) => {
      const planRow = tx
        .select({ snapshot: plans.snapshot, snapshotSeq: plans.snapshotSeq })
        .from(plans)
        .where(eq(plans.id, planId))
        .get();
      if (!planRow) return; // plan was deleted between pre-check and tx.

      // Re-check inside the tx — another writer may have already compacted
      // this plan in the very same window.
      const recountRow = tx
        .select({ n: sql<number>`COUNT(*)` })
        .from(intents)
        .where(eq(intents.planId, planId))
        .get();
      const inTxCount = recountRow?.n ?? 0;
      if (inTxCount <= COMPACTION_THRESHOLD) return;

      // Cutoff: keep the trailing COMPACTION_TARGET entries; everything at
      // serverSeq <= cutoffSeq is a candidate for archive.
      const offset = COMPACTION_TARGET - 1;
      const cutoffRow = tx
        .select({ serverSeq: intents.serverSeq })
        .from(intents)
        .where(eq(intents.planId, planId))
        .orderBy(sql`${intents.serverSeq} DESC`)
        .limit(1)
        .offset(offset)
        .get();
      if (!cutoffRow) return;
      const initialCutoff = cutoffRow.serverSeq;

      // Inverse-aware shift: if any entry within INVERSE_BOUNDARY_WINDOW
      // immediately past the cutoff has a parentEntryId pointing back into
      // the about-to-archive batch, push the cutoff forward so they stay
      // grouped. Bail out if the dependency can't be resolved in-window.
      const adjustedCutoff = shiftCutoffForInverse(tx, planId, initialCutoff);
      if (adjustedCutoff === null) return;

      // Materialize the rows we're folding so the snapshot reflects the
      // same set we are about to delete.
      const archiveRows = tx
        .select()
        .from(intents)
        .where(
          and(
            eq(intents.planId, planId),
            lte(intents.serverSeq, adjustedCutoff),
          ),
        )
        .orderBy(asc(intents.serverSeq))
        .all();
      if (archiveRows.length === 0) return;

      const baseSnapshot = JSON.parse(planRow.snapshot) as AppState;
      const tailEntries: IntentLogEntry[] = archiveRows
        .filter((r) => r.serverSeq > planRow.snapshotSeq)
        .map((r) => ({
          id: r.id,
          planId: r.planId,
          lamport: r.lamport,
          origin: r.origin,
          kind: r.kind,
          parentEntryId: r.parentEntryId ?? undefined,
          createdAt: r.createdAt.getTime(),
          intent: JSON.parse(r.intent),
        }));
      const nextSnapshot = hydrate(baseSnapshot, tailEntries);

      // Mirror archived rows. `archivedAt` defaults to now() in SQL so the
      // INSERT can omit it.
      tx.insert(intentsArchive)
        .values(
          archiveRows.map((r) => ({
            id: r.id,
            planId: r.planId,
            serverSeq: r.serverSeq,
            lamport: r.lamport,
            origin: r.origin,
            kind: r.kind,
            parentEntryId: r.parentEntryId,
            intent: r.intent,
            createdAt: r.createdAt,
          })),
        )
        .run();

      tx.update(plans)
        .set({
          snapshot: JSON.stringify(nextSnapshot),
          snapshotSeq: adjustedCutoff,
        })
        .where(eq(plans.id, planId))
        .run();

      tx.delete(intents)
        .where(
          and(
            eq(intents.planId, planId),
            lte(intents.serverSeq, adjustedCutoff),
          ),
        )
        .run();
    },
    { behavior: "immediate" },
  );
}

function shiftCutoffForInverse(
  tx: typeof db,
  planId: string,
  initialCutoff: number,
): number | null {
  const archivedIds = new Set(
    tx
      .select({ id: intents.id })
      .from(intents)
      .where(
        and(eq(intents.planId, planId), lte(intents.serverSeq, initialCutoff)),
      )
      .all()
      .map((r) => r.id),
  );

  // Look at the first INVERSE_BOUNDARY_WINDOW entries immediately past the
  // cutoff. If any of them references a parent in the archive batch we
  // pull the dependent forward so the parent-child pair stays atomic.
  const followers: IntentRowSlim[] = tx
    .select({
      id: intents.id,
      serverSeq: intents.serverSeq,
      parentEntryId: intents.parentEntryId,
    })
    .from(intents)
    .where(
      and(
        eq(intents.planId, planId),
        sql`${intents.serverSeq} > ${initialCutoff}`,
      ),
    )
    .orderBy(asc(intents.serverSeq))
    .limit(INVERSE_BOUNDARY_WINDOW)
    .all();

  let cutoff = initialCutoff;
  for (const row of followers) {
    if (row.parentEntryId && archivedIds.has(row.parentEntryId)) {
      cutoff = row.serverSeq;
      archivedIds.add(row.id);
    }
  }

  // If after the window there is still a follower referencing the archive
  // batch, we cannot guarantee atomicity — skip this round.
  const nextRow = tx
    .select({
      id: intents.id,
      parentEntryId: intents.parentEntryId,
    })
    .from(intents)
    .where(
      and(eq(intents.planId, planId), sql`${intents.serverSeq} > ${cutoff}`),
    )
    .orderBy(asc(intents.serverSeq))
    .limit(1)
    .get();
  if (nextRow?.parentEntryId && archivedIds.has(nextRow.parentEntryId)) {
    return null;
  }
  return cutoff;
}
