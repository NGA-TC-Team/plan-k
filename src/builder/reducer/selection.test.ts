import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import { applySelection } from "./selection";

describe("applySelection", () => {
  it("returns null for unrelated intent", () => {
    const out = applySelection(
      makeEmptyState(),
      makeEntry({ type: "COMMIT_EDIT" }),
    );
    expect(out).toBeNull();
  });

  it("sets selection.kind=node with id when selecting", () => {
    const out = applySelection(
      makeEmptyState(),
      makeEntry({ type: "SELECT_NODE", nodeId: "b1" }),
    );
    expect(out?.state.selection).toEqual({ kind: "node", id: "b1" });
    expect(out?.commands).toEqual([]);
  });

  it("sets selection.kind=none when deselecting", () => {
    const prev = makeEmptyState({ selection: { kind: "node", id: "b1" } });
    const out = applySelection(
      prev,
      makeEntry({ type: "SELECT_NODE", nodeId: null }),
    );
    expect(out?.state.selection).toEqual({ kind: "none" });
  });

  it("does not mutate the input state", () => {
    const prev = makeEmptyState();
    const out = applySelection(
      prev,
      makeEntry({ type: "SELECT_NODE", nodeId: "b1" }),
    );
    expect(prev.selection).toEqual({ kind: "none" });
    expect(out?.state).not.toBe(prev);
  });

  it("emits no commands for selection changes", () => {
    const out = applySelection(
      makeEmptyState(),
      makeEntry({ type: "SELECT_NODE", nodeId: "b1" }),
    );
    expect(out?.commands).toEqual([]);
  });
});
