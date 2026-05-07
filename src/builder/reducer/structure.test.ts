import { describe, expect, it } from "bun:test";
import { makeBlock, makeEmptyState, makeEntry, withBlocks } from "../fixtures";
import { applyStructure } from "./structure";

const screenState = () =>
  makeEmptyState({
    screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
  });

describe("applyStructure.INSERT_BLOCK", () => {
  it("inserts at the end when index is omitted", () => {
    const state = withBlocks(screenState(), [{ id: "b1", parentId: "s1" }]);
    const out = applyStructure(
      state,
      makeEntry(
        {
          type: "INSERT_BLOCK",
          parentId: "s1",
          block: makeBlock("b2", "s1"),
        },
        { lamport: 2, origin: "human:a" },
      ),
    );
    expect(out?.state.children.s1).toEqual(["b1", "b2"]);
    expect(out?.state.blocks.b2?.parentId).toBe("s1");
    expect(out?.state.entityMeta.b2).toEqual({ lamport: 2, origin: "human:a" });
  });

  it("inserts at given index, clamping out-of-range values", () => {
    const state = withBlocks(screenState(), [
      { id: "b1", parentId: "s1" },
      { id: "b2", parentId: "s1" },
    ]);
    const out = applyStructure(
      state,
      makeEntry({
        type: "INSERT_BLOCK",
        parentId: "s1",
        block: makeBlock("b3", "s1"),
        index: 99,
      }),
    );
    expect(out?.state.children.s1).toEqual(["b1", "b2", "b3"]);

    const out2 = applyStructure(
      state,
      makeEntry({
        type: "INSERT_BLOCK",
        parentId: "s1",
        block: makeBlock("b4", "s1"),
        index: 0,
      }),
    );
    expect(out2?.state.children.s1).toEqual(["b4", "b1", "b2"]);
  });

  it("two concurrent INSERTs under same parent both survive", () => {
    const state = screenState();
    const after1 = applyStructure(
      state,
      makeEntry(
        {
          type: "INSERT_BLOCK",
          parentId: "s1",
          block: makeBlock("b1", "s1"),
        },
        { lamport: 1, origin: "human:a" },
      ),
    );
    const after2 = applyStructure(
      after1?.state ?? state,
      makeEntry(
        {
          type: "INSERT_BLOCK",
          parentId: "s1",
          block: makeBlock("b2", "s1"),
        },
        { lamport: 1, origin: "claude:b" },
      ),
    );
    expect(after2?.state.children.s1).toEqual(["b1", "b2"]);
    expect(Object.keys(after2?.state.blocks ?? {})).toEqual(["b1", "b2"]);
  });
});

describe("applyStructure.MOVE_BLOCK", () => {
  it("moves to new parent, removes from old", () => {
    const state = withBlocks(screenState(), [
      { id: "s2-anchor", parentId: "s1" },
      { id: "b1", parentId: "s1" },
    ]);
    const out = applyStructure(
      state,
      makeEntry({
        type: "MOVE_BLOCK",
        nodeId: "b1",
        toParentId: "s2-anchor",
        index: 0,
      }),
    );
    expect(out?.state.children.s1).toEqual(["s2-anchor"]);
    expect(out?.state.children["s2-anchor"]).toEqual(["b1"]);
    expect(out?.state.blocks.b1?.parentId).toBe("s2-anchor");
  });

  it("reorders within the same parent without duplicating", () => {
    const state = withBlocks(screenState(), [
      { id: "b1", parentId: "s1" },
      { id: "b2", parentId: "s1" },
      { id: "b3", parentId: "s1" },
    ]);
    const out = applyStructure(
      state,
      makeEntry({
        type: "MOVE_BLOCK",
        nodeId: "b3",
        toParentId: "s1",
        index: 0,
      }),
    );
    expect(out?.state.children.s1).toEqual(["b3", "b1", "b2"]);
  });
});

describe("applyStructure.DELETE_BLOCK", () => {
  it("removes a leaf and unlinks from parent", () => {
    const state = withBlocks(screenState(), [
      { id: "b1", parentId: "s1" },
      { id: "b2", parentId: "s1" },
    ]);
    const out = applyStructure(
      state,
      makeEntry({ type: "DELETE_BLOCK", nodeId: "b1" }),
    );
    expect(out?.state.blocks.b1).toBeUndefined();
    expect(out?.state.children.s1).toEqual(["b2"]);
  });

  it("cascades to all descendants", () => {
    const state = withBlocks(screenState(), [
      { id: "b1", parentId: "s1" },
      { id: "b2", parentId: "b1" },
      { id: "b3", parentId: "b2" },
      { id: "b4", parentId: "s1" },
    ]);
    const out = applyStructure(
      state,
      makeEntry({ type: "DELETE_BLOCK", nodeId: "b1" }),
    );
    expect(out?.state.blocks.b1).toBeUndefined();
    expect(out?.state.blocks.b2).toBeUndefined();
    expect(out?.state.blocks.b3).toBeUndefined();
    expect(out?.state.blocks.b4).toBeDefined();
    expect(out?.state.children.b1).toBeUndefined();
    expect(out?.state.children.b2).toBeUndefined();
    expect(out?.state.children.s1).toEqual(["b4"]);
  });
});

describe("applyStructure.UPDATE_BLOCK", () => {
  it("merges patch into block.data and updates entityMeta", () => {
    const state = withBlocks(screenState(), [
      { id: "b1", parentId: "s1", data: { text: "old" } },
    ]);
    const out = applyStructure(
      state,
      makeEntry(
        {
          type: "UPDATE_BLOCK",
          nodeId: "b1",
          patch: { data: { text: "new" } },
        },
        { lamport: 7, origin: "human:a" },
      ),
    );
    expect(out?.state.blocks.b1?.data).toEqual({ text: "new" });
    expect(out?.state.entityMeta.b1).toEqual({ lamport: 7, origin: "human:a" });
  });

  it("ignores parentId in patch (MOVE is the only way to reparent)", () => {
    const state = withBlocks(screenState(), [{ id: "b1", parentId: "s1" }]);
    const out = applyStructure(
      state,
      makeEntry({
        type: "UPDATE_BLOCK",
        nodeId: "b1",
        patch: { parentId: "ghost", data: { x: 1 } },
      }),
    );
    expect(out?.state.blocks.b1?.parentId).toBe("s1");
    expect(out?.state.blocks.b1?.data).toEqual({ x: 1 });
  });
});
