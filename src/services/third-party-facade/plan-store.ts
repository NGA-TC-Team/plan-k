import { and, asc, eq, gt, sql } from "drizzle-orm";
import { buildSeedSnapshot } from "@/builder/defaults";
import { defaultIdFactory } from "@/builder/ids";
import type { ProjectKind } from "@/builder/types/entity";
import type { IntentLogEntry } from "@/builder/types/intent";
import type { AppState } from "@/builder/types/state";
import { db, intents, plans, projects } from "@/db";
import { MigrationError, migrateSnapshot } from "@/db/migrate";
import { maybeCompact } from "./plan-compaction";
import { planStream } from "./plan-stream";
import { syncRefsForIntent } from "./refs-sync";

export type PlanRecord = {
  snapshot: AppState;
  tailEntries: IntentLogEntry[];
};

export type PlanLoadError = {
  error: "MIGRATION_FAILED";
  planId: string;
  fromVersion: number;
  toVersion: number;
  message: string;
};

export type PlanLoadResult = PlanRecord | PlanLoadError | null;

export function isPlanLoadError(
  result: PlanLoadResult,
): result is PlanLoadError {
  return result !== null && "error" in result;
}

const SEED_KINDS: Record<string, ProjectKind> = {
  demo: "web",
  "demo-web": "web",
  "demo-mobile": "mobile",
  "demo-agent": "agent",
};

function seedSnapshotFor(planId: string, kind: ProjectKind): AppState {
  const ids = defaultIdFactory();
  return buildSeedSnapshot(planId, kind, {
    newId: ids.newEntryId,
    origin: `seed:${planId}`,
  });
}

function rowToTailEntry(row: {
  id: string;
  planId: string;
  lamport: number;
  origin: string;
  kind: "primary" | "inverse";
  parentEntryId: string | null;
  intent: string;
  createdAt: Date;
}): IntentLogEntry {
  return {
    id: row.id,
    planId: row.planId,
    lamport: row.lamport,
    origin: row.origin,
    kind: row.kind,
    parentEntryId: row.parentEntryId ?? undefined,
    createdAt: row.createdAt.getTime(),
    intent: JSON.parse(row.intent),
  };
}

export async function getPlan(planId: string): Promise<PlanLoadResult> {
  const existing = db.select().from(plans).where(eq(plans.id, planId)).get();
  if (existing) {
    const raw = JSON.parse(existing.snapshot) as unknown;
    let snapshot: AppState;
    try {
      snapshot = migrateSnapshot(raw);
    } catch (err) {
      if (err instanceof MigrationError) {
        return {
          error: "MIGRATION_FAILED",
          planId,
          fromVersion: err.fromVersion,
          toVersion: err.toVersion,
          message: err.message,
        };
      }
      throw err;
    }
    // Persist the migrated snapshot so future loads skip the work.
    if (snapshot !== raw) {
      db.update(plans)
        .set({ snapshot: JSON.stringify(snapshot) })
        .where(eq(plans.id, planId))
        .run();
    }
    // Hydration only replays entries that postdate the folded snapshot.
    // For uncompacted plans snapshotSeq is 0 so this is equivalent to
    // fetching the full log.
    const tailRows = db
      .select()
      .from(intents)
      .where(
        and(
          eq(intents.planId, planId),
          gt(intents.serverSeq, existing.snapshotSeq),
        ),
      )
      .orderBy(asc(intents.serverSeq))
      .all();
    return {
      snapshot,
      tailEntries: tailRows.map(rowToTailEntry),
    };
  }

  const kind = SEED_KINDS[planId];
  if (!kind) return null;
  const snapshot = seedSnapshotFor(planId, kind);
  db.insert(plans)
    .values({
      id: planId,
      kind,
      snapshot: JSON.stringify(snapshot),
    })
    .run();
  return { snapshot, tailEntries: [] };
}

export async function appendIntent(
  entry: IntentLogEntry,
): Promise<
  { ok: true; serverVersion: number } | { ok: false; reason: string }
> {
  const planRow = db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.id, entry.planId))
    .get();
  if (!planRow) return { ok: false, reason: "PLAN_NOT_FOUND" };

  const seqRow = db
    .select({ next: sql<number>`COALESCE(MAX(${intents.serverSeq}), 0) + 1` })
    .from(intents)
    .where(eq(intents.planId, entry.planId))
    .get();
  const serverSeq = seqRow?.next ?? 1;

  try {
    db.insert(intents)
      .values({
        id: entry.id,
        planId: entry.planId,
        serverSeq,
        lamport: entry.lamport,
        origin: entry.origin,
        kind: entry.kind,
        parentEntryId: entry.parentEntryId ?? null,
        intent: JSON.stringify(entry.intent),
        createdAt: new Date(entry.createdAt),
      })
      .run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/UNIQUE/i.test(message)) {
      return { ok: false, reason: "DUPLICATE_ENTRY" };
    }
    throw err;
  }

  const touchedAt = new Date();
  db.update(plans)
    .set({ updatedAt: touchedAt })
    .where(eq(plans.id, entry.planId))
    .run();
  // Mirror to project meta so the Home/Projects list shows last-edited time
  // for any kind of edit, not just UPDATE_PROJECT.
  db.update(projects)
    .set({ updatedAt: touchedAt })
    .where(eq(projects.id, entry.planId))
    .run();

  // Project meta lives in two places — the plan snapshot (so the builder shows
  // it after hydrate) and the `projects` row (so the /projects list shows the
  // latest title/summary). Mirror UPDATE_PROJECT mutations into the projects
  // table so the list view stays in sync without an extra round-trip.
  if (entry.intent.type === "UPDATE_PROJECT") {
    const patch: { title?: string; summary?: string; updatedAt?: Date } = {};
    if (entry.intent.patch.title !== undefined) {
      patch.title = entry.intent.patch.title;
    }
    if (entry.intent.patch.summary !== undefined) {
      patch.summary = entry.intent.patch.summary;
    }
    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date();
      db.update(projects)
        .set(patch)
        .where(eq(projects.id, entry.intent.projectId))
        .run();
    }
  }

  // DELETE_PROJECT cascade: remove the project row and the plan row. The
  // intents row we just inserted is removed by the FK CASCADE on plans —
  // intentional, because the log lives inside the doomed plan and there is
  // no separate audit table.
  if (entry.intent.type === "DELETE_PROJECT") {
    const projectId = entry.intent.projectId;
    db.transaction((tx) => {
      tx.delete(plans).where(eq(plans.id, projectId)).run();
      tx.delete(projects).where(eq(projects.id, projectId)).run();
    });
  }

  // Fan out to any open SSE subscribers (other tabs / Claude Code editing
  // the same plan). Subscribers filter by origin so the originator does
  // not re-apply its own intent.
  planStream.emit(entry);

  // Best-effort refs index maintenance — runs in-process before
  // compaction so the graph reflects the new state by the time the
  // archive batch is folded in.
  syncRefsForIntent(entry);

  // Best-effort compaction. No-op when the active log is below threshold;
  // failures log + swallow so the append response is unaffected.
  maybeCompact(entry.planId);

  return { ok: true, serverVersion: serverSeq };
}

export async function resetForTests(): Promise<void> {
  // refs cascade-delete via FK on plans.
  db.delete(intents).run();
  db.delete(plans).run();
  db.delete(projects).run();
}
