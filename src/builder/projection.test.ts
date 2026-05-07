import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry, withBlocks, withPending } from "./fixtures";
import {
  projectBlock,
  projectBlockTree,
  projectBuilder,
  projectScreen,
} from "./projection";

const screenState = () =>
  makeEmptyState({
    screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
  });

describe("projectBlock", () => {
  it("returns null when block is missing", () => {
    expect(projectBlock(screenState(), "ghost")).toBeNull();
  });

  it("flags isSelected and isEditing correctly", () => {
    const state = withBlocks(screenState(), [
      { id: "b1", parentId: "s1", data: { text: "hi" } },
    ]);
    const idle = projectBlock(state, "b1");
    expect(idle?.isSelected).toBe(false);
    expect(idle?.isEditing).toBe(false);

    const editing = withBlocks(
      makeEmptyState({
        screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
        selection: { kind: "node", id: "b1" },
        editing: {
          kind: "node",
          id: "b1",
          origin: "human:a",
          lamport: 1,
          draft: { text: "draft" },
          previousValue: { text: "hi" },
        },
      }),
      [{ id: "b1", parentId: "s1", data: { text: "hi" } }],
    );
    const editingVm = projectBlock(editing, "b1");
    expect(editingVm?.isSelected).toBe(true);
    expect(editingVm?.isEditing).toBe(true);
    expect(editingVm?.displayValue).toEqual({ text: "draft" });
    expect(editingVm?.data).toEqual({ text: "hi" });
  });

  it("displayValue falls back to block.data when not editing", () => {
    const state = withBlocks(screenState(), [
      { id: "b1", parentId: "s1", data: { text: "static" } },
    ]);
    const vm = projectBlock(state, "b1");
    expect(vm?.displayValue).toEqual({ text: "static" });
  });

  it("isPending true when a pending entry targets the block", () => {
    const seeded = withBlocks(screenState(), [{ id: "b1", parentId: "s1" }]);
    const state = withPending(seeded, [
      {
        entry: makeEntry(
          { type: "UPDATE_BLOCK", nodeId: "b1", patch: { data: { x: 1 } } },
          { id: "p-1" },
        ),
      },
    ]);
    expect(projectBlock(state, "b1")?.isPending).toBe(true);
  });
});

describe("projectBlockTree", () => {
  it("returns nested tree of children blocks", () => {
    const state = withBlocks(screenState(), [
      { id: "b1", parentId: "s1" },
      { id: "b2", parentId: "b1" },
      { id: "b3", parentId: "b2" },
    ]);
    const tree = projectBlockTree(state, "b1");
    expect(tree?.id).toBe("b1");
    expect(tree?.children[0]?.id).toBe("b2");
    expect(tree?.children[0]?.children[0]?.id).toBe("b3");
  });
});

describe("projectScreen", () => {
  it("returns ordered top-level blocks as trees", () => {
    const state = withBlocks(screenState(), [
      { id: "b1", parentId: "s1" },
      { id: "b2", parentId: "s1" },
    ]);
    const vm = projectScreen(state, "s1");
    expect(vm?.id).toBe("s1");
    expect(vm?.title).toBe("Home");
    expect(vm?.blocks.map((b) => b.id)).toEqual(["b1", "b2"]);
  });

  it("returns null for missing screen", () => {
    expect(projectScreen(makeEmptyState(), "ghost")).toBeNull();
  });
});

describe("projectBuilder", () => {
  it("aggregates screen + selection + editing + history flags + error", () => {
    const state = withBlocks(
      makeEmptyState({
        screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
        selection: { kind: "node", id: "b1" },
        editing: {
          kind: "node",
          id: "b1",
          origin: "human:a",
          lamport: 1,
          draft: { text: "d" },
          previousValue: { text: "p" },
        },
        viewMode: "wireframe",
        agentTab: "graph",
        historyPast: [
          {
            entry: makeEntry({ type: "CANCEL_EDIT" }, { id: "h1" }),
            inverse: null,
          },
        ],
        lastError: { reason: "STALE_LAMPORT", at: 1 },
      }),
      [{ id: "b1", parentId: "s1" }],
    );
    const vm = projectBuilder(state, "s1");
    expect(vm.screen?.id).toBe("s1");
    expect(vm.screen?.blocks[0]?.isSelected).toBe(true);
    expect(vm.selectionId).toBe("b1");
    expect(vm.editingId).toBe("b1");
    expect(vm.viewMode).toBe("wireframe");
    expect(vm.agentTab).toBe("graph");
    expect(vm.canUndo).toBe(true);
    expect(vm.canRedo).toBe(false);
    expect(vm.lastError).toEqual({ reason: "STALE_LAMPORT", at: 1 });
  });

  it("returns null screen when screenId is null", () => {
    const vm = projectBuilder(makeEmptyState(), null);
    expect(vm.screen).toBeNull();
  });
});
