import { describe, expect, it } from "bun:test";
import { makeEmptyState, withBlocks } from "@/builder/fixtures";
import type { AppState, EntityMeta } from "@/builder/types/state";
import { compareSnapshots } from "./compare-snapshots";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function withSection(
  state: AppState,
  id: string,
  overrides: Partial<import("@/builder/types/entity").SectionEntity> = {},
): AppState {
  return {
    ...state,
    sections: {
      ...state.sections,
      [id]: {
        id,
        planId: "plan-1",
        parentId: null,
        kind: "overview",
        title: "Section",
        ...overrides,
      },
    },
  };
}

function withScreen(
  state: AppState,
  id: string,
  overrides: Partial<import("@/builder/types/entity").ScreenEntity> = {},
): AppState {
  return {
    ...state,
    screens: {
      ...state.screens,
      [id]: {
        id,
        planId: "plan-1",
        title: "Screen",
        ...overrides,
      },
    },
  };
}

function withProject(
  state: AppState,
  id: string,
  overrides: Partial<import("@/builder/types/entity").ProjectMeta> = {},
): AppState {
  return {
    ...state,
    projects: {
      ...state.projects,
      [id]: {
        id,
        kind: "web",
        title: "My Project",
        summary: "",
        createdAt: 0,
        updatedAt: 0,
        ...overrides,
      },
    },
  };
}

function withPlan(
  state: AppState,
  id: string,
  overrides: Partial<import("@/builder/types/entity").PlanShell> = {},
): AppState {
  return {
    ...state,
    plans: {
      ...state.plans,
      [id]: {
        id,
        projectId: "proj-1",
        kind: "web",
        meta: {},
        agentTab: "scenario",
        ...overrides,
      },
    },
  };
}

function withEntityMeta(
  state: AppState,
  id: string,
  meta: Partial<EntityMeta>,
): AppState {
  return {
    ...state,
    entityMeta: {
      ...state.entityMeta,
      [id]: {
        lamport: 1,
        origin: "human:test",
        ...meta,
      },
    },
  };
}

function withAgentNode(
  state: AppState,
  id: string,
  overrides: Partial<import("@/builder/types/entity").AgentNode> = {},
): AppState {
  return {
    ...state,
    agentNodes: {
      ...state.agentNodes,
      [id]: {
        id,
        role: "llm",
        label: "Node",
        data: {},
        ...overrides,
      },
    },
  };
}

function withAgentEdge(
  state: AppState,
  id: string,
  from: string,
  to: string,
): AppState {
  return {
    ...state,
    agentEdges: {
      ...state.agentEdges,
      [id]: { id, from, to },
    },
  };
}

// ---------------------------------------------------------------------------
// 1. Identical snapshots → empty DiffReport
// ---------------------------------------------------------------------------
it("identical snapshots → empty DiffReport", () => {
  const s = makeEmptyState();
  const report = compareSnapshots(s, s);
  expect(report.added).toEqual([]);
  expect(report.removed).toEqual([]);
  expect(report.modified).toEqual([]);
  expect(report.moved).toEqual([]);
});

// ---------------------------------------------------------------------------
// 2. One block added in b
// ---------------------------------------------------------------------------
it("one block added in b", () => {
  const a = makeEmptyState();
  const b = withBlocks(a, [
    {
      id: "blk-1",
      parentId: "sec-1",
      kind: "heading",
      data: { text: "Hello" },
    },
  ]);
  const report = compareSnapshots(a, b);
  expect(report.added).toHaveLength(1);
  expect(report.added[0].id).toBe("blk-1");
  expect(report.added[0].kind).toBe("block");
  expect(report.removed).toHaveLength(0);
  expect(report.modified).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// 3. One block removed in b
// ---------------------------------------------------------------------------
it("one block removed in b", () => {
  const a = withBlocks(makeEmptyState(), [{ id: "blk-1", parentId: "sec-1" }]);
  const b = makeEmptyState();
  const report = compareSnapshots(a, b);
  expect(report.removed).toHaveLength(1);
  expect(report.removed[0].id).toBe("blk-1");
  expect(report.added).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// 4. One block's data.text modified
// ---------------------------------------------------------------------------
it("one block text modified", () => {
  const a = withBlocks(makeEmptyState(), [
    {
      id: "blk-1",
      parentId: "sec-1",
      kind: "heading",
      data: { text: "Before" },
    },
  ]);
  const b = withBlocks(makeEmptyState(), [
    {
      id: "blk-1",
      parentId: "sec-1",
      kind: "heading",
      data: { text: "After" },
    },
  ]);
  const report = compareSnapshots(a, b);
  expect(report.modified).toHaveLength(1);
  expect(report.modified[0].id).toBe("blk-1");
  expect(report.modified[0].changedFields).toContain("data");
});

// ---------------------------------------------------------------------------
// 5. Block moved between parents (parentId change → modified + children diff)
// ---------------------------------------------------------------------------
it("block moved between parents", () => {
  const base = makeEmptyState();
  const aBlocks = withBlocks(base, [{ id: "blk-1", parentId: "sec-A" }]);
  const a: AppState = {
    ...aBlocks,
    children: { "sec-A": ["blk-1"] },
  };
  const bBlocks = withBlocks(base, [{ id: "blk-1", parentId: "sec-B" }]);
  const b: AppState = {
    ...bBlocks,
    children: { "sec-B": ["blk-1"] },
  };
  const report = compareSnapshots(a, b);
  // blk-1's parentId changed → should be in modified
  expect(report.modified.some((e) => e.id === "blk-1")).toBe(true);
  // children diff for sec-A and sec-B
  expect(
    report.moved.some((m) => m.parentId === "sec-A" || m.parentId === "sec-B"),
  ).toBe(true);
});

// ---------------------------------------------------------------------------
// 6. Block data deeply changed
// ---------------------------------------------------------------------------
it("block data deeply changed", () => {
  const a = withBlocks(makeEmptyState(), [
    {
      id: "blk-1",
      parentId: "sec-1",
      kind: "callout",
      data: { text: "Tip", icon: "info" },
    },
  ]);
  const b = withBlocks(makeEmptyState(), [
    {
      id: "blk-1",
      parentId: "sec-1",
      kind: "callout",
      data: { text: "Warning", icon: "alert", extra: true },
    },
  ]);
  const report = compareSnapshots(a, b);
  expect(report.modified).toHaveLength(1);
  expect(report.modified[0].changedFields).toContain("data");
});

// ---------------------------------------------------------------------------
// 7. Children reorder under same parent → moved entry
// ---------------------------------------------------------------------------
it("children reorder under same parent → moved entry", () => {
  const base = withBlocks(makeEmptyState(), [
    { id: "blk-1", parentId: "sec-1" },
    { id: "blk-2", parentId: "sec-1" },
  ]);
  const a: AppState = { ...base, children: { "sec-1": ["blk-1", "blk-2"] } };
  const b: AppState = { ...base, children: { "sec-1": ["blk-2", "blk-1"] } };
  const report = compareSnapshots(a, b);
  expect(report.moved).toHaveLength(1);
  expect(report.moved[0].parentId).toBe("sec-1");
  expect(report.moved[0].before).toEqual(["blk-1", "blk-2"]);
  expect(report.moved[0].after).toEqual(["blk-2", "blk-1"]);
  expect(report.modified).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// 8. One section added
// ---------------------------------------------------------------------------
it("one section added", () => {
  const a = makeEmptyState();
  const b = withSection(a, "sec-1", { title: "Overview" });
  const report = compareSnapshots(a, b);
  expect(
    report.added.some((e) => e.id === "sec-1" && e.kind === "section"),
  ).toBe(true);
});

// ---------------------------------------------------------------------------
// 9. One screen renamed (title change)
// ---------------------------------------------------------------------------
it("one screen renamed → modified", () => {
  const a = withScreen(makeEmptyState(), "scr-1", { title: "Home" });
  const b = withScreen(makeEmptyState(), "scr-1", { title: "Dashboard" });
  const report = compareSnapshots(a, b);
  expect(report.modified).toHaveLength(1);
  expect(report.modified[0].id).toBe("scr-1");
  expect(report.modified[0].changedFields).toContain("title");
});

// ---------------------------------------------------------------------------
// 10. entityMeta status change only (no structural change)
// ---------------------------------------------------------------------------
it("entityMeta status change only → single modified entry with metaChanges", () => {
  const base = withBlocks(makeEmptyState(), [
    { id: "blk-1", parentId: "sec-1" },
  ]);
  const a = withEntityMeta(base, "blk-1", { status: "pending" });
  const b = withEntityMeta(base, "blk-1", { status: "approved" });
  const report = compareSnapshots(a, b);
  const entry = report.modified.find((e) => e.id === "blk-1");
  expect(entry).toBeDefined();
  expect(entry?.metaChanges).toBeDefined();
  expect(entry?.metaChanges?.some((c) => c.field === "status")).toBe(true);
  // No changedFields from structural comparison
  expect(entry?.changedFields ?? []).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// 11. entityMeta + structural change on same entity → single modified entry
// ---------------------------------------------------------------------------
it("entityMeta + structural change on same entity → single modified entry with both", () => {
  const base = withBlocks(makeEmptyState(), [
    { id: "blk-1", parentId: "sec-1", kind: "heading", data: { text: "Old" } },
  ]);
  const aState = withEntityMeta(base, "blk-1", { status: "pending" });
  const bBase = withBlocks(makeEmptyState(), [
    { id: "blk-1", parentId: "sec-1", kind: "heading", data: { text: "New" } },
  ]);
  const bState = withEntityMeta(bBase, "blk-1", { status: "approved" });
  const report = compareSnapshots(aState, bState);
  const entry = report.modified.find((e) => e.id === "blk-1");
  expect(entry).toBeDefined();
  // structural change present
  expect(entry?.changedFields).toContain("data");
  // meta change also present
  expect(entry?.metaChanges?.some((c) => c.field === "status")).toBe(true);
  // should be a single entry, not two
  expect(report.modified.filter((e) => e.id === "blk-1")).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// 12. Project rename + plan kind change
// ---------------------------------------------------------------------------
it("project rename + plan kind change", () => {
  const a = withPlan(
    withProject(makeEmptyState(), "proj-1", { title: "Old" }),
    "plan-1",
    { kind: "web" },
  );
  const b = withPlan(
    withProject(makeEmptyState(), "proj-1", { title: "New" }),
    "plan-1",
    { kind: "mobile" },
  );
  const report = compareSnapshots(a, b);
  const projectEntry = report.modified.find((e) => e.id === "proj-1");
  const planEntry = report.modified.find((e) => e.id === "plan-1");
  expect(projectEntry).toBeDefined();
  expect(projectEntry?.changedFields).toContain("title");
  expect(planEntry).toBeDefined();
  expect(planEntry?.changedFields).toContain("kind");
});

// ---------------------------------------------------------------------------
// 13. agentNode added + agentEdge added pointing to it
// ---------------------------------------------------------------------------
it("agentNode added + agentEdge added pointing to it", () => {
  const a = makeEmptyState();
  const bWithNode = withAgentNode(a, "node-1", { label: "LLM Step" });
  const b = withAgentEdge(bWithNode, "edge-1", "node-in", "node-1");
  const report = compareSnapshots(a, b);
  expect(
    report.added.some((e) => e.id === "node-1" && e.kind === "agentNode"),
  ).toBe(true);
  expect(
    report.added.some((e) => e.id === "edge-1" && e.kind === "agentEdge"),
  ).toBe(true);
});

// ---------------------------------------------------------------------------
// 14. selection / editing / lamport fields must NOT cause modifications
// ---------------------------------------------------------------------------
it("selection / editing / lamport changes → no modifications", () => {
  const base = makeEmptyState();
  const a: AppState = {
    ...base,
    selection: { kind: "none" },
    editing: { kind: "none" },
    lamport: 0,
  };
  const b: AppState = {
    ...base,
    selection: { kind: "node", id: "blk-1" },
    editing: { kind: "none" },
    lamport: 42,
  };
  const report = compareSnapshots(a, b);
  expect(report.added).toHaveLength(0);
  expect(report.removed).toHaveLength(0);
  expect(report.modified).toHaveLength(0);
  expect(report.moved).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// sorted output: added/removed/modified are sorted by (kind, id)
// ---------------------------------------------------------------------------
describe("stable sort", () => {
  it("added list is sorted by kind:id", () => {
    const a = makeEmptyState();
    const b = withBlocks(withSection(a, "sec-z"), [
      { id: "blk-a", parentId: "p" },
      { id: "blk-b", parentId: "p" },
    ]);
    const b2 = withSection(b, "sec-a");
    const report = compareSnapshots(a, b2);
    const keys = report.added.map((e) => `${e.kind}:${e.id}`);
    const sorted = [...keys].sort((x, y) => x.localeCompare(y));
    expect(keys).toEqual(sorted);
  });
});

// ---------------------------------------------------------------------------
// Edge: empty AppStates return empty buckets without throwing
// ---------------------------------------------------------------------------
it("empty AppStates → no throw, empty buckets", () => {
  const empty = makeEmptyState();
  expect(() => compareSnapshots(empty, empty)).not.toThrow();
  const report = compareSnapshots(empty, empty);
  expect(report.added).toHaveLength(0);
  expect(report.removed).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Edge: children entry with undefined array on one side treated as []
// ---------------------------------------------------------------------------
it("children undefined on one side treated as empty array", () => {
  const a: AppState = { ...makeEmptyState(), children: {} };
  const b: AppState = { ...makeEmptyState(), children: { "sec-1": ["blk-1"] } };
  // sec-1 is not in added/removed list so children diff should fire
  expect(() => compareSnapshots(a, b)).not.toThrow();
});
