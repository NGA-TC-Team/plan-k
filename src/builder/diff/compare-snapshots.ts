import type {
  AgentEdge,
  AgentNode,
  BlockEntity,
  PlanShell,
  ProjectMeta,
  ScreenEdge,
  ScreenEntity,
  SectionEntity,
} from "@/builder/types/entity";
import type { AppState, EntityMeta } from "@/builder/types/state";
import type {
  ChildrenMoveEntry,
  DiffEntityKind,
  DiffReport,
  EntityDiffEntry,
  EntityStatusFields,
} from "./types";

// ---------------------------------------------------------------------------
// stableStringify — sorted-key recursive JSON.stringify for deep equality.
// Produces a canonical string regardless of property insertion order.
// ---------------------------------------------------------------------------
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const sorted = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((k) => {
      const v = (value as Record<string, unknown>)[k];
      return `${JSON.stringify(k)}:${stableStringify(v)}`;
    });
  return `{${sorted.join(",")}}`;
}

// ---------------------------------------------------------------------------
// Entity extractors — strip systemic runtime fields before comparing.
// Only structural/business fields are compared; lamport/origin are excluded.
// ---------------------------------------------------------------------------

function extractBlock(b: BlockEntity) {
  return {
    parentId: b.parentId,
    kind: b.kind,
    data: b.data,
    context: b.context,
  };
}

function extractSection(s: SectionEntity) {
  return {
    planId: s.planId,
    parentId: s.parentId,
    kind: s.kind,
    title: s.title,
    status: s.status,
  };
}

function extractScreen(s: ScreenEntity) {
  return {
    planId: s.planId,
    title: s.title,
    route: s.route,
    position: s.position,
    status: s.status,
  };
}

function extractAgentNode(n: AgentNode) {
  return { role: n.role, label: n.label, data: n.data };
}

function extractAgentEdge(e: AgentEdge) {
  return { from: e.from, to: e.to };
}

function extractScreenEdge(e: ScreenEdge) {
  return { from: e.from, to: e.to, label: e.label };
}

function extractProject(p: ProjectMeta) {
  return {
    kind: p.kind,
    title: p.title,
    summary: p.summary,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function extractPlan(p: PlanShell) {
  return {
    projectId: p.projectId,
    kind: p.kind,
    meta: p.meta,
    agentTab: p.agentTab,
  };
}

// ---------------------------------------------------------------------------
// Generic id-set bucketing helper
// ---------------------------------------------------------------------------

function diffRecords<T>(
  kind: DiffEntityKind,
  aRec: Record<string, T>,
  bRec: Record<string, T>,
  extract: (v: T) => unknown,
  label: (id: string, v: T) => string | undefined,
  blockKind?: (
    id: string,
    v: T,
  ) => import("@/builder/types/entity").BlockKind | undefined,
): {
  added: EntityDiffEntry[];
  removed: EntityDiffEntry[];
  modified: EntityDiffEntry[];
} {
  const aIds = new Set(Object.keys(aRec));
  const bIds = new Set(Object.keys(bRec));

  const added: EntityDiffEntry[] = [];
  const removed: EntityDiffEntry[] = [];
  const modified: EntityDiffEntry[] = [];

  for (const id of bIds) {
    if (!aIds.has(id)) {
      added.push({
        kind,
        id,
        label: label(id, bRec[id]),
        blockKind: blockKind?.(id, bRec[id]),
      });
    }
  }

  for (const id of aIds) {
    if (!bIds.has(id)) {
      removed.push({
        kind,
        id,
        label: label(id, aRec[id]),
        blockKind: blockKind?.(id, aRec[id]),
      });
    }
  }

  for (const id of aIds) {
    if (!bIds.has(id)) continue;
    const aExtracted = extract(aRec[id]);
    const bExtracted = extract(bRec[id]);
    if (stableStringify(aExtracted) !== stableStringify(bExtracted)) {
      // Compute top-level changed fields
      const aObj = aExtracted as Record<string, unknown>;
      const bObj = bExtracted as Record<string, unknown>;
      const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
      const changedFields: string[] = [];
      for (const k of allKeys) {
        if (stableStringify(aObj[k]) !== stableStringify(bObj[k])) {
          changedFields.push(k);
        }
      }
      modified.push({
        kind,
        id,
        changedFields,
        label: label(id, bRec[id]),
        blockKind: blockKind?.(id, bRec[id]),
      });
    }
  }

  return { added, removed, modified };
}

// ---------------------------------------------------------------------------
// Meta diff — compare the 4 semantic fields of EntityMeta
// ---------------------------------------------------------------------------
const META_FIELDS: Array<keyof EntityStatusFields> = [
  "status",
  "assignee",
  "dueDate",
  "viewModeOverride",
];

function diffEntityMeta(
  aMeta: EntityMeta | undefined,
  bMeta: EntityMeta | undefined,
): Array<{
  field: keyof EntityStatusFields;
  before: unknown;
  after: unknown;
}> | null {
  const changes: Array<{
    field: keyof EntityStatusFields;
    before: unknown;
    after: unknown;
  }> = [];
  for (const field of META_FIELDS) {
    const before = aMeta?.[field];
    const after = bMeta?.[field];
    if (stableStringify(before) !== stableStringify(after)) {
      changes.push({ field, before, after });
    }
  }
  return changes.length > 0 ? changes : null;
}

// ---------------------------------------------------------------------------
// compareSnapshots — pure, no React/DOM/Zustand
// ---------------------------------------------------------------------------

const EMPTY_CHILDREN: string[] = [];

export function compareSnapshots(a: AppState, b: AppState): DiffReport {
  const added: EntityDiffEntry[] = [];
  const removed: EntityDiffEntry[] = [];
  const modified: EntityDiffEntry[] = [];
  const moved: ChildrenMoveEntry[] = [];

  // --- projects ---
  const projects = diffRecords(
    "project",
    a.projects ?? {},
    b.projects ?? {},
    extractProject,
    (_, p) => p.title,
  );

  // --- plans ---
  const plans = diffRecords(
    "plan",
    a.plans ?? {},
    b.plans ?? {},
    extractPlan,
    (id) => id,
  );

  // --- sections ---
  const sections = diffRecords(
    "section",
    a.sections ?? {},
    b.sections ?? {},
    extractSection,
    (_, s) => s.title,
  );

  // --- screens ---
  const screens = diffRecords(
    "screen",
    a.screens ?? {},
    b.screens ?? {},
    extractScreen,
    (_, s) => s.title,
  );

  // --- blocks ---
  const blocks = diffRecords(
    "block",
    a.blocks ?? {},
    b.blocks ?? {},
    extractBlock,
    (_, bl) => String(bl.kind),
    (_, bl) => bl.kind,
  );

  // --- agentNodes ---
  const agentNodes = diffRecords(
    "agentNode",
    a.agentNodes ?? {},
    b.agentNodes ?? {},
    extractAgentNode,
    (_, n) => n.label,
  );

  // --- agentEdges ---
  const agentEdges = diffRecords(
    "agentEdge",
    a.agentEdges ?? {},
    b.agentEdges ?? {},
    extractAgentEdge,
    (id) => id,
  );

  // --- screenEdges ---
  const screenEdges = diffRecords(
    "screenEdge",
    a.screenEdges ?? {},
    b.screenEdges ?? {},
    extractScreenEdge,
    (id) => id,
  );

  // Collect all added/removed/modified (unsorted yet)
  added.push(
    ...projects.added,
    ...plans.added,
    ...sections.added,
    ...screens.added,
    ...blocks.added,
    ...agentNodes.added,
    ...agentEdges.added,
    ...screenEdges.added,
  );
  removed.push(
    ...projects.removed,
    ...plans.removed,
    ...sections.removed,
    ...screens.removed,
    ...blocks.removed,
    ...agentNodes.removed,
    ...agentEdges.removed,
    ...screenEdges.removed,
  );
  modified.push(
    ...projects.modified,
    ...plans.modified,
    ...sections.modified,
    ...screens.modified,
    ...blocks.modified,
    ...agentNodes.modified,
    ...agentEdges.modified,
    ...screenEdges.modified,
  );

  // --- children (move detection) ---
  // Build the set of parent ids that were added or removed so we skip them
  const addedIds = new Set(added.map((e) => e.id));
  const removedIds = new Set(removed.map((e) => e.id));

  const allParentIds = new Set([
    ...Object.keys(a.children ?? {}),
    ...Object.keys(b.children ?? {}),
  ]);

  for (const pid of allParentIds) {
    // Skip parents that were themselves added or removed
    if (addedIds.has(pid) || removedIds.has(pid)) continue;
    const aCh = a.children?.[pid] ?? EMPTY_CHILDREN;
    const bCh = b.children?.[pid] ?? EMPTY_CHILDREN;
    if (stableStringify(aCh) !== stableStringify(bCh)) {
      moved.push({ parentId: pid, before: aCh, after: bCh });
    }
  }

  // --- entityMeta diff ---
  // Build a map of already-modified entity ids for O(1) lookup
  const modifiedMap = new Map<string, EntityDiffEntry>();
  for (const entry of modified) {
    modifiedMap.set(entry.id, entry);
  }

  const allMetaIds = new Set([
    ...Object.keys(a.entityMeta ?? {}),
    ...Object.keys(b.entityMeta ?? {}),
  ]);

  for (const id of allMetaIds) {
    const metaChanges = diffEntityMeta(a.entityMeta?.[id], b.entityMeta?.[id]);
    if (!metaChanges) continue;

    const existing = modifiedMap.get(id);
    if (existing) {
      // Append metaChanges to the already-modified entry
      existing.metaChanges = metaChanges;
    } else {
      // Pure meta change: emit a new modified entry
      // Determine kind from whichever snapshot has the entity
      const kind = resolveEntityKind(id, a, b);
      if (!kind) continue; // entity not found in either snapshot — skip
      const entry: EntityDiffEntry = { kind, id, metaChanges };
      modified.push(entry);
      modifiedMap.set(id, entry);
    }
  }

  // --- stable sort by (kind, id) ---
  const sortKey = (e: EntityDiffEntry) => `${e.kind}:${e.id}`;
  added.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  removed.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  modified.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  return { added, removed, modified, moved };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveEntityKind(
  id: string,
  a: AppState,
  b: AppState,
): DiffEntityKind | null {
  for (const snap of [a, b]) {
    if (snap.projects?.[id]) return "project";
    if (snap.plans?.[id]) return "plan";
    if (snap.sections?.[id]) return "section";
    if (snap.screens?.[id]) return "screen";
    if (snap.blocks?.[id]) return "block";
    if (snap.agentNodes?.[id]) return "agentNode";
    if (snap.agentEdges?.[id]) return "agentEdge";
    if (snap.screenEdges?.[id]) return "screenEdge";
  }
  return null;
}
