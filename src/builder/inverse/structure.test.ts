import { describe, expect, it } from "bun:test";
import { makeBlock, makeEmptyState, makeEntry, withBlocks } from "../fixtures";
import { applyStructure } from "../reducer/structure";
import { invertStructure } from "./structure";

const screenState = () =>
  makeEmptyState({
    screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
  });

describe("invertStructure", () => {
  it("returns null for unrelated intent", () => {
    expect(
      invertStructure(makeEntry({ type: "UNDO" }), makeEmptyState()),
    ).toBeNull();
  });

  it("INSERT_BLOCK inverts to DELETE_BLOCK and round-trips", () => {
    const before = screenState();
    const forward = makeEntry({
      type: "INSERT_BLOCK",
      parentId: "s1",
      block: makeBlock("b1", "s1"),
    });
    const after = applyStructure(before, forward);
    if (!after) throw new Error("forward apply failed");
    const inv = invertStructure(forward, before);
    expect(inv).toEqual({ type: "DELETE_BLOCK", nodeId: "b1" });
    const reverted = applyStructure(after.state, makeEntry(inv as never));
    expect(reverted?.state.blocks.b1).toBeUndefined();
    expect(reverted?.state.children.s1 ?? []).toEqual([]);
  });

  it("MOVE_BLOCK inverts back to original parent and index", () => {
    const before = withBlocks(screenState(), [
      { id: "anchor", parentId: "s1" },
      { id: "b1", parentId: "s1" },
      { id: "b2", parentId: "s1" },
    ]);
    const forward = makeEntry({
      type: "MOVE_BLOCK",
      nodeId: "b1",
      toParentId: "anchor",
      index: 0,
    });
    const after = applyStructure(before, forward);
    if (!after) throw new Error("forward apply failed");
    const inv = invertStructure(forward, before);
    expect(inv).toEqual({
      type: "MOVE_BLOCK",
      nodeId: "b1",
      toParentId: "s1",
      index: 1,
    });
    const reverted = applyStructure(after.state, makeEntry(inv as never));
    expect(reverted?.state.children.s1).toEqual(["anchor", "b1", "b2"]);
    expect(reverted?.state.children.anchor ?? []).toEqual([]);
  });

  it("DELETE_BLOCK on a leaf inverts to INSERT_BLOCK at original index", () => {
    const before = withBlocks(screenState(), [
      { id: "b1", parentId: "s1" },
      { id: "b2", parentId: "s1" },
      { id: "b3", parentId: "s1" },
    ]);
    const forward = makeEntry({ type: "DELETE_BLOCK", nodeId: "b2" });
    const after = applyStructure(before, forward);
    if (!after) throw new Error("forward apply failed");
    const inv = invertStructure(forward, before);
    expect(inv?.type).toBe("INSERT_BLOCK");
    if (inv?.type !== "INSERT_BLOCK") throw new Error("unexpected inverse");
    expect(inv.parentId).toBe("s1");
    expect(inv.index).toBe(1);
    expect(inv.block.id).toBe("b2");
    const reverted = applyStructure(after.state, makeEntry(inv));
    expect(reverted?.state.children.s1).toEqual(["b1", "b2", "b3"]);
  });

  it("DELETE_BLOCK on a node with children returns null inverse (P3 limit)", () => {
    const before = withBlocks(screenState(), [
      { id: "b1", parentId: "s1" },
      { id: "b2", parentId: "b1" },
    ]);
    const inv = invertStructure(
      makeEntry({ type: "DELETE_BLOCK", nodeId: "b1" }),
      before,
    );
    expect(inv).toBeNull();
  });

  it("UPDATE_BLOCK inverts to UPDATE_BLOCK with prior values for patched keys", () => {
    const before = withBlocks(screenState(), [
      { id: "b1", parentId: "s1", data: { text: "old", count: 1 } },
    ]);
    const forward = makeEntry({
      type: "UPDATE_BLOCK",
      nodeId: "b1",
      patch: { data: { text: "new", count: 2 } },
    });
    const after = applyStructure(before, forward);
    if (!after) throw new Error("forward apply failed");
    const inv = invertStructure(forward, before);
    expect(inv).toEqual({
      type: "UPDATE_BLOCK",
      nodeId: "b1",
      patch: { data: { text: "old", count: 1 } },
    });
    const reverted = applyStructure(after.state, makeEntry(inv as never));
    expect(reverted?.state.blocks.b1?.data).toEqual({ text: "old", count: 1 });
  });
});
