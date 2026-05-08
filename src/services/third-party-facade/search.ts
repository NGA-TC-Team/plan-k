import { and, inArray } from "drizzle-orm";
import type { BlockEntity } from "@/builder/types/entity";
import type { AppState } from "@/builder/types/state";
import { db, plans, projects, refs } from "@/db";
import { searchFts } from "@/db/search-index";

export type SearchHit =
  | {
      kind: "project";
      planId: string;
      projectTitle: string;
      field: "title" | "summary";
      snippet: string;
      refDepth: 0 | 1 | 2;
    }
  | {
      kind: "section";
      planId: string;
      projectTitle: string;
      sectionId: string;
      sectionTitle: string;
      snippet: string;
      refDepth: 0 | 1 | 2;
    }
  | {
      kind: "block";
      planId: string;
      projectTitle: string;
      blockId: string;
      blockKind: string;
      sectionId: string | null;
      snippet: string;
      refDepth: 0 | 1 | 2;
    };

const DEFAULT_LIMIT = 50;

export type SearchOptions = {
  planId?: string;
  kinds?: ("project" | "section" | "block")[];
  limit?: number;
};

// FTS5-backed cross-plan search. Each direct match (depth 0) is
// expanded with up to two ref-graph hops so the results surface
// "entities that mention what you searched for" alongside literal
// matches. No hydration — snapshot rows are read once per plan.
export async function searchAcrossPlans(
  query: string,
  opts: SearchOptions = {},
): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const limit = opts.limit ?? DEFAULT_LIMIT;
  const direct = searchFts(trimmed, {
    planId: opts.planId,
    kinds: opts.kinds,
    limit,
  });
  if (direct.length === 0) return [];

  const directIds = new Set(direct.map((d) => d.entityId));

  // Walk the refs graph two hops out from the direct hits. Each ref's
  // src becomes a depth-1 hit; following one more hop yields depth-2.
  // We stay within the same planId set so we don't accidentally bridge
  // unrelated plans through shared id strings.
  const planIds = Array.from(new Set(direct.map((d) => d.planId)));
  const depthOne = expandViaRefs(planIds, [...directIds], directIds);
  const directAndOne = new Set([...directIds, ...depthOne]);
  const depthTwo = expandViaRefs(planIds, [...depthOne], directAndOne);

  const depths = new Map<string, 0 | 1 | 2>();
  for (const id of directIds) depths.set(id, 0);
  for (const id of depthOne) depths.set(id, 1);
  for (const id of depthTwo) if (!depths.has(id)) depths.set(id, 2);

  // Enrich each hit using the migrated snapshots from the active plan
  // rows. Projects table feeds the human-readable title.
  const snapshots = loadSnapshots(planIds);
  const projectsById = new Map(
    db
      .select()
      .from(projects)
      .where(inArray(projects.id, planIds))
      .all()
      .map((p) => [p.id, p]),
  );

  const hits: SearchHit[] = [];

  // Direct hits first — preserves the underlying bm25 ordering.
  for (const row of direct) {
    const built = buildHit(row, depths.get(row.entityId) ?? 0, {
      snapshots,
      projectsById,
    });
    if (built) hits.push(built);
  }

  // Then depth-1 / depth-2 expansions. We can't call searchFts for them
  // (they aren't text matches), so we build synthetic block hits from
  // the snapshot. Skip ids already in `direct`.
  for (const id of depthOne) {
    if (directIds.has(id)) continue;
    const built = buildExpansionHit(id, 1, { snapshots, projectsById });
    if (built) hits.push(built);
  }
  for (const id of depthTwo) {
    if (directAndOne.has(id)) continue;
    const built = buildExpansionHit(id, 2, { snapshots, projectsById });
    if (built) hits.push(built);
  }

  return hits;
}

function expandViaRefs(
  planIds: string[],
  dstIds: string[],
  exclude: Set<string>,
): string[] {
  if (dstIds.length === 0 || planIds.length === 0) return [];
  const rows = db
    .select({ srcId: refs.srcId })
    .from(refs)
    .where(and(inArray(refs.planId, planIds), inArray(refs.dstId, dstIds)))
    .all();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (exclude.has(r.srcId) || seen.has(r.srcId)) continue;
    seen.add(r.srcId);
    out.push(r.srcId);
  }
  return out;
}

type Enrichment = {
  snapshots: Map<string, AppState>;
  projectsById: Map<string, { id: string; title: string; summary: string }>;
};

function loadSnapshots(planIds: string[]): Map<string, AppState> {
  const out = new Map<string, AppState>();
  if (planIds.length === 0) return out;
  const rows = db
    .select({ id: plans.id, snapshot: plans.snapshot })
    .from(plans)
    .where(inArray(plans.id, planIds))
    .all();
  for (const row of rows) {
    try {
      out.set(row.id, JSON.parse(row.snapshot) as AppState);
    } catch {
      // Skip — recovery dialog will surface this plan separately.
    }
  }
  return out;
}

function buildHit(
  row: {
    entityId: string;
    planId: string;
    kind: "project" | "section" | "block";
    snippet: string;
  },
  refDepth: 0 | 1 | 2,
  enrich: Enrichment,
): SearchHit | null {
  const snapshot = enrich.snapshots.get(row.planId);
  const projectMeta = enrich.projectsById.get(row.planId);
  const projectTitle =
    projectMeta?.title ?? snapshot?.projects?.[row.planId]?.title ?? row.planId;

  if (row.kind === "project") {
    // The snippet covers either title or summary — we can't tell which
    // from FTS alone, so report the broader "title" for now and let the
    // UI decide presentation.
    return {
      kind: "project",
      planId: row.planId,
      projectTitle,
      field: "title",
      snippet: row.snippet,
      refDepth,
    };
  }
  if (row.kind === "section") {
    const section = snapshot?.sections?.[row.entityId];
    return {
      kind: "section",
      planId: row.planId,
      projectTitle,
      sectionId: row.entityId,
      sectionTitle: section?.title ?? row.entityId,
      snippet: row.snippet,
      refDepth,
    };
  }
  // block
  const block = snapshot?.blocks?.[row.entityId];
  if (!block) return null;
  return {
    kind: "block",
    planId: row.planId,
    projectTitle,
    blockId: row.entityId,
    blockKind: block.kind,
    sectionId: snapshot ? ancestorSectionId(snapshot, row.entityId) : null,
    snippet: row.snippet,
    refDepth,
  };
}

function buildExpansionHit(
  entityId: string,
  refDepth: 1 | 2,
  enrich: Enrichment,
): SearchHit | null {
  // Find which plan owns this id by scanning the loaded snapshots —
  // expansion candidates only come from the same plan set as direct
  // hits, so the cost is bounded.
  for (const [planId, snapshot] of enrich.snapshots) {
    const block = snapshot.blocks?.[entityId];
    if (block) {
      const projectMeta = enrich.projectsById.get(planId);
      const projectTitle =
        projectMeta?.title ?? snapshot.projects?.[planId]?.title ?? planId;
      return {
        kind: "block",
        planId,
        projectTitle,
        blockId: entityId,
        blockKind: block.kind,
        sectionId: ancestorSectionId(snapshot, entityId),
        snippet: "",
        refDepth,
      };
    }
    const section = snapshot.sections?.[entityId];
    if (section) {
      const projectMeta = enrich.projectsById.get(planId);
      const projectTitle =
        projectMeta?.title ?? snapshot.projects?.[planId]?.title ?? planId;
      return {
        kind: "section",
        planId,
        projectTitle,
        sectionId: entityId,
        sectionTitle: section.title,
        snippet: "",
        refDepth,
      };
    }
  }
  return null;
}

function ancestorSectionId(state: AppState, blockId: string): string | null {
  let current: string = blockId;
  const seen = new Set<string>();
  while (!seen.has(current)) {
    seen.add(current);
    const node: BlockEntity | undefined = state.blocks?.[current];
    if (!node) return null;
    if (state.sections?.[node.parentId]) return node.parentId;
    current = node.parentId;
  }
  return null;
}
