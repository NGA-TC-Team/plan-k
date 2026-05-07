import { asc, eq, sql } from "drizzle-orm";
import { buildSeedSnapshot } from "@/builder/defaults";
import { defaultIdFactory } from "@/builder/ids";
import type { ProjectKind } from "@/builder/types/entity";
import type { IntentLogEntry } from "@/builder/types/intent";
import type { AppState } from "@/builder/types/state";
import { db, intents, plans, projects } from "@/db";

export type PlanRecord = {
  snapshot: AppState;
  tailEntries: IntentLogEntry[];
};

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

export async function getPlan(planId: string): Promise<PlanRecord | null> {
  const existing = db.select().from(plans).where(eq(plans.id, planId)).get();
  if (existing) {
    const tailRows = db
      .select()
      .from(intents)
      .where(eq(intents.planId, planId))
      .orderBy(asc(intents.serverSeq))
      .all();
    return {
      snapshot: JSON.parse(existing.snapshot) as AppState,
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

  db.update(plans)
    .set({ updatedAt: new Date() })
    .where(eq(plans.id, entry.planId))
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

  return { ok: true, serverVersion: serverSeq };
}

export async function resetForTests(): Promise<void> {
  db.delete(intents).run();
  db.delete(plans).run();
}
