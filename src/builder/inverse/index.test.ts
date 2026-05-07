import { describe, expect, it } from "bun:test";
import { makeBlock, makeEmptyState, makeEntry, withBlocks } from "../fixtures";
import { invert } from "./index";

const screenState = () =>
  makeEmptyState({
    screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
  });

describe("invert (composer)", () => {
  it("routes SELECT_NODE to the selection slice", () => {
    const prev = makeEmptyState({ selection: { kind: "node", id: "b0" } });
    const inv = invert(makeEntry({ type: "SELECT_NODE", nodeId: "b1" }), prev);
    expect(inv).toEqual({ type: "SELECT_NODE", nodeId: "b0" });
  });

  it("routes BEGIN_EDIT to the editing slice", () => {
    const inv = invert(
      makeEntry({ type: "BEGIN_EDIT", nodeId: "b1" }),
      makeEmptyState(),
    );
    expect(inv).toEqual({ type: "CANCEL_EDIT" });
  });

  it("routes INSERT_BLOCK to the structure slice", () => {
    const prev = screenState();
    const inv = invert(
      makeEntry({
        type: "INSERT_BLOCK",
        parentId: "s1",
        block: makeBlock("b1", "s1"),
      }),
      prev,
    );
    expect(inv).toEqual({ type: "DELETE_BLOCK", nodeId: "b1" });
  });

  it("routes UPDATE_BLOCK to the structure slice", () => {
    const prev = withBlocks(screenState(), [
      { id: "b1", parentId: "s1", data: { text: "old" } },
    ]);
    const inv = invert(
      makeEntry({
        type: "UPDATE_BLOCK",
        nodeId: "b1",
        patch: { data: { text: "new" } },
      }),
      prev,
    );
    expect(inv).toEqual({
      type: "UPDATE_BLOCK",
      nodeId: "b1",
      patch: { data: { text: "old" } },
    });
  });

  it("returns null for sync intents (not undoable)", () => {
    expect(
      invert(
        makeEntry({ type: "PERSIST_SUCCEEDED", entryId: "x" }),
        makeEmptyState(),
      ),
    ).toBeNull();
    expect(
      invert(
        makeEntry({
          type: "PERSIST_FAILED",
          entryId: "x",
          reason: "n/a",
        }),
        makeEmptyState(),
      ),
    ).toBeNull();
  });

  it("returns null for UNDO and REDO meta intents", () => {
    expect(invert(makeEntry({ type: "UNDO" }), makeEmptyState())).toBeNull();
    expect(invert(makeEntry({ type: "REDO" }), makeEmptyState())).toBeNull();
  });
});
