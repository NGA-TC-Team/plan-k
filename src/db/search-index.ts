// FTS5 search index. Lives outside the drizzle schema graph because
// virtual tables are not modeled by drizzle-kit; raw SQL through the
// underlying better-sqlite3 connection only.
//
// Indexing strategy: Korean syllables don't tokenize well under
// `unicode61`, so we run a bigram pass before INSERT and again before
// MATCH so partial-word queries hit. Latin/digit runs go through
// unchanged so English word boundaries stay intact.

import { extractBlockText } from "@/builder/blocks/extract-text";
import type { AppState } from "@/builder/types/state";
import { db } from "./client";
import { bigramKorean, buildMatchExpr } from "./search-tokens";

export type EntityKind = "project" | "section" | "block";

// Lazy capability probe — cached so dev restarts log once.
let fts5Cache: boolean | null = null;
export function isFts5Available(): boolean {
  if (fts5Cache !== null) return fts5Cache;
  const row = db.$client
    .prepare(
      "SELECT 1 AS ok FROM pragma_compile_options() WHERE compile_options = 'ENABLE_FTS5'",
    )
    .get() as { ok?: number } | undefined;
  fts5Cache = Boolean(row?.ok);
  return fts5Cache;
}

// Idempotent CREATE so dev environments without the matching migration
// still get a working index (e.g. ad-hoc DBs in tests).
export function ensureSearchSchema(): void {
  if (!isFts5Available()) return;
  db.$client.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS entity_search USING fts5(
      entity_id UNINDEXED,
      plan_id   UNINDEXED,
      kind      UNINDEXED,
      content,
      tokenize = 'unicode61 remove_diacritics 1'
    );
  `);
  db.$client.exec(`
    CREATE TRIGGER IF NOT EXISTS entity_search_plans_delete
    AFTER DELETE ON plans
    BEGIN
      DELETE FROM entity_search WHERE plan_id = OLD.id;
    END;
  `);
}

export function upsertEntity(
  planId: string,
  kind: EntityKind,
  entityId: string,
  rawContent: string,
): void {
  if (!isFts5Available()) return;
  const content = bigramKorean(rawContent);
  // FTS5 doesn't have ON CONFLICT — delete-then-insert keeps the row
  // unique by entity_id.
  db.$client
    .prepare("DELETE FROM entity_search WHERE entity_id = ?")
    .run(entityId);
  if (!rawContent.trim()) return;
  db.$client
    .prepare(
      "INSERT INTO entity_search (entity_id, plan_id, kind, content) VALUES (?, ?, ?, ?)",
    )
    .run(entityId, planId, kind, content);
}

export function deleteEntity(entityId: string): void {
  if (!isFts5Available()) return;
  db.$client
    .prepare("DELETE FROM entity_search WHERE entity_id = ?")
    .run(entityId);
}

export function deleteByPlan(planId: string): void {
  if (!isFts5Available()) return;
  db.$client.prepare("DELETE FROM entity_search WHERE plan_id = ?").run(planId);
}

// Full rebuild from a (migrated) snapshot. Wipes the plan's rows and
// re-INSERTs every project/section/block in one transaction so readers
// see a consistent view across the swap. Used by the rebuild API and
// import path. No-op when FTS5 is unavailable.
export function rebuildSearch(
  planId: string,
  snapshot: AppState,
): { rows: number } {
  if (!isFts5Available()) return { rows: 0 };
  let rowCount = 0;
  const tx = db.$client.transaction(() => {
    db.$client
      .prepare("DELETE FROM entity_search WHERE plan_id = ?")
      .run(planId);

    const insert = db.$client.prepare(
      "INSERT INTO entity_search (entity_id, plan_id, kind, content) VALUES (?, ?, ?, ?)",
    );

    const project = snapshot.projects?.[planId];
    if (project) {
      const text = [project.title, project.summary].filter(Boolean).join(" ");
      if (text.trim()) {
        insert.run(planId, planId, "project", bigramKorean(text));
        rowCount += 1;
      }
    }

    for (const [id, section] of Object.entries(snapshot.sections ?? {})) {
      const text = section.title;
      if (!text || !text.trim()) continue;
      insert.run(id, planId, "section", bigramKorean(text));
      rowCount += 1;
    }

    for (const [id, block] of Object.entries(snapshot.blocks ?? {})) {
      const text = extractBlockText(block);
      if (!text || !text.trim()) continue;
      insert.run(id, planId, "block", bigramKorean(text));
      rowCount += 1;
    }
  });
  tx();
  return { rows: rowCount };
}

export type SearchHitRow = {
  entityId: string;
  planId: string;
  kind: EntityKind;
  bm25: number;
  snippet: string;
};

export function searchFts(
  rawQuery: string,
  opts: {
    planId?: string;
    kinds?: EntityKind[];
    limit?: number;
  } = {},
): SearchHitRow[] {
  if (!isFts5Available()) return [];
  const q = rawQuery.trim();
  if (!q) return [];
  const { planId, kinds, limit = 50 } = opts;

  // Apply the same bigram pass to the query, then quote each token to
  // make MATCH treat them as literal terms (no operators baked in by
  // user input).
  const matchExpr = buildMatchExpr(q);
  if (!matchExpr) return [];

  const filters: string[] = ["entity_search MATCH ?"];
  const params: unknown[] = [matchExpr];
  if (planId) {
    filters.push("plan_id = ?");
    params.push(planId);
  }
  if (kinds && kinds.length > 0) {
    filters.push(`kind IN (${kinds.map(() => "?").join(",")})`);
    params.push(...kinds);
  }
  params.push(limit);

  const sql = `
    SELECT entity_id, plan_id, kind, bm25(entity_search) AS rank,
           snippet(entity_search, 3, '<mark>', '</mark>', '…', 12) AS snip
      FROM entity_search
     WHERE ${filters.join(" AND ")}
     ORDER BY rank ASC
     LIMIT ?
  `;
  const rows = db.$client.prepare(sql).all(...params) as {
    entity_id: string;
    plan_id: string;
    kind: EntityKind;
    rank: number;
    snip: string;
  }[];
  return rows.map((r) => ({
    entityId: r.entity_id,
    planId: r.plan_id,
    kind: r.kind,
    bm25: r.rank,
    snippet: r.snip,
  }));
}
