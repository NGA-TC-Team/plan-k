import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import { applySelection } from "../reducer/selection";
import { invertSelection } from "./selection";

describe("invertSelection", () => {
  it("returns null for unrelated intent", () => {
    const out = invertSelection(
      makeEntry({ type: "COMMIT_EDIT" }),
      makeEmptyState(),
    );
    expect(out).toBeNull();
  });

  it("from a node selection, inverse restores prior id", () => {
    const prev = makeEmptyState({ selection: { kind: "node", id: "b0" } });
    const inv = invertSelection(
      makeEntry({ type: "SELECT_NODE", nodeId: "b1" }),
      prev,
    );
    expect(inv).toEqual({ type: "SELECT_NODE", nodeId: "b0" });
  });

  it("from no selection, inverse restores null", () => {
    const inv = invertSelection(
      makeEntry({ type: "SELECT_NODE", nodeId: "b1" }),
      makeEmptyState(),
    );
    expect(inv).toEqual({ type: "SELECT_NODE", nodeId: null });
  });

  it("forward then inverse round-trips selection state", () => {
    const prev = makeEmptyState({ selection: { kind: "node", id: "b0" } });
    const forwardEntry = makeEntry({ type: "SELECT_NODE", nodeId: "b1" });
    const afterForward = applySelection(prev, forwardEntry);
    if (!afterForward) throw new Error("forward apply returned null");
    expect(afterForward.state.selection).toEqual({ kind: "node", id: "b1" });

    const inverseIntent = invertSelection(forwardEntry, prev);
    if (!inverseIntent) throw new Error("invert returned null");
    const afterInverse = applySelection(
      afterForward.state,
      makeEntry(inverseIntent),
    );
    expect(afterInverse?.state.selection).toEqual(prev.selection);
  });

  it("round-trips deselect from no prior selection", () => {
    const prev = makeEmptyState();
    const forwardEntry = makeEntry({ type: "SELECT_NODE", nodeId: "b1" });
    const afterForward = applySelection(prev, forwardEntry);
    if (!afterForward) throw new Error("forward apply returned null");

    const inverseIntent = invertSelection(forwardEntry, prev);
    if (!inverseIntent) throw new Error("invert returned null");

    const afterInverse = applySelection(
      afterForward.state,
      makeEntry(inverseIntent),
    );
    expect(afterInverse?.state.selection).toEqual({ kind: "none" });
  });
});
