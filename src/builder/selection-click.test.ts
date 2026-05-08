import { describe, expect, it } from "bun:test";
import { makeEmptyState, withBlocks } from "./fixtures";
import { resolveClickSelection } from "./selection-click";

describe("resolveClickSelection", () => {
  it("plain click → SELECT_NODE", () => {
    const state = withBlocks(makeEmptyState(), [
      { id: "a", parentId: "s1" },
      { id: "b", parentId: "s1" },
    ]);
    const intent = resolveClickSelection(state, "a", "none");
    expect(intent).toEqual({ type: "SELECT_NODE", nodeId: "a" });
  });

  it("toggle click adds clicked id to single selection", () => {
    const state = {
      ...withBlocks(makeEmptyState(), [
        { id: "a", parentId: "s1" },
        { id: "b", parentId: "s1" },
      ]),
      selection: { kind: "node" as const, id: "a" },
    };
    const intent = resolveClickSelection(state, "b", "toggle");
    expect(intent).toEqual({ type: "SELECT_NODES", ids: ["a", "b"] });
  });

  it("toggle click removes clicked id when already in multi", () => {
    const state = {
      ...withBlocks(makeEmptyState(), [
        { id: "a", parentId: "s1" },
        { id: "b", parentId: "s1" },
      ]),
      selection: { kind: "multi" as const, ids: ["a", "b"] },
    };
    const intent = resolveClickSelection(state, "b", "toggle");
    expect(intent).toEqual({ type: "SELECT_NODES", ids: ["a"] });
  });

  it("shift click selects sibling range inclusive", () => {
    const state = {
      ...withBlocks(makeEmptyState(), [
        { id: "a", parentId: "s1" },
        { id: "b", parentId: "s1" },
        { id: "c", parentId: "s1" },
        { id: "d", parentId: "s1" },
      ]),
      selection: { kind: "node" as const, id: "b" },
    };
    const intent = resolveClickSelection(state, "d", "shift");
    expect(intent).toEqual({ type: "SELECT_NODES", ids: ["b", "c", "d"] });
  });

  it("shift click falls back to single select when anchor not a sibling", () => {
    const state = {
      ...withBlocks(makeEmptyState(), [
        { id: "a", parentId: "s1" },
        { id: "x", parentId: "s2" },
      ]),
      selection: { kind: "node" as const, id: "a" },
    };
    const intent = resolveClickSelection(state, "x", "shift");
    expect(intent).toEqual({ type: "SELECT_NODE", nodeId: "x" });
  });
});
