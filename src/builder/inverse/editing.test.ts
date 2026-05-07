import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry, withBlocks } from "../fixtures";
import { applyEditing } from "../reducer/editing";
import { invertEditing } from "./editing";

describe("invertEditing", () => {
  it("returns null for unrelated intent", () => {
    expect(
      invertEditing(makeEntry({ type: "UNDO" }), makeEmptyState()),
    ).toBeNull();
  });

  it("BEGIN_EDIT inverts to CANCEL_EDIT", () => {
    expect(
      invertEditing(
        makeEntry({ type: "BEGIN_EDIT", nodeId: "b1" }),
        makeEmptyState(),
      ),
    ).toEqual({ type: "CANCEL_EDIT" });
  });

  it("CHANGE_DRAFT inverts to a CHANGE_DRAFT with the prior draft value", () => {
    const prev = makeEmptyState({
      editing: {
        kind: "node",
        id: "b1",
        origin: "human:a",
        lamport: 1,
        draft: { text: "old-draft" },
        previousValue: { text: "old" },
      },
    });
    const inv = invertEditing(
      makeEntry({ type: "CHANGE_DRAFT", value: { text: "new-draft" } }),
      prev,
    );
    expect(inv).toEqual({ type: "CHANGE_DRAFT", value: { text: "old-draft" } });
  });

  it("CANCEL_EDIT inverts to BEGIN_EDIT on the previously edited node", () => {
    const prev = makeEmptyState({
      editing: {
        kind: "node",
        id: "b1",
        origin: "human:a",
        lamport: 1,
        draft: {},
        previousValue: {},
      },
    });
    const inv = invertEditing(makeEntry({ type: "CANCEL_EDIT" }), prev);
    expect(inv).toEqual({ type: "BEGIN_EDIT", nodeId: "b1" });
  });

  it("COMMIT_EDIT inverts to UPDATE_BLOCK with previousValue", () => {
    const prev = makeEmptyState({
      editing: {
        kind: "node",
        id: "b1",
        origin: "human:a",
        lamport: 1,
        draft: { text: "new" },
        previousValue: { text: "old" },
      },
    });
    const inv = invertEditing(makeEntry({ type: "COMMIT_EDIT" }), prev);
    expect(inv).toEqual({
      type: "UPDATE_BLOCK",
      nodeId: "b1",
      patch: { data: { text: "old" } },
    });
  });

  it("BEGIN_EDIT then inverse round-trips editing.kind to none", () => {
    const initial = withBlocks(makeEmptyState(), [
      { id: "b1", parentId: "s1", data: { text: "hi" } },
    ]);
    const beginEntry = makeEntry(
      { type: "BEGIN_EDIT", nodeId: "b1" },
      { origin: "human:a", lamport: 2 },
    );
    const after = applyEditing(initial, beginEntry);
    if (!after) throw new Error("apply BEGIN_EDIT failed");
    const inverse = invertEditing(beginEntry, initial);
    if (!inverse) throw new Error("invert returned null");
    const restored = applyEditing(
      after.state,
      makeEntry(inverse, { origin: "human:a" }),
    );
    expect(restored?.state.editing).toEqual({ kind: "none" });
  });
});
