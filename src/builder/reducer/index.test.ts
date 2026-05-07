import { describe, expect, it } from "bun:test";
import { makeBlock, makeEmptyState, makeEntry } from "../fixtures";
import { apply } from "./index";

const screenState = () =>
  makeEmptyState({
    screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
  });

describe("apply (composer)", () => {
  it("routes SELECT_NODE to selection slice", () => {
    const out = apply(
      makeEmptyState(),
      makeEntry({ type: "SELECT_NODE", nodeId: "b1" }),
    );
    expect(out.state.selection).toEqual({ kind: "node", id: "b1" });
  });

  it("routes INSERT_BLOCK to structure slice", () => {
    const out = apply(
      screenState(),
      makeEntry({
        type: "INSERT_BLOCK",
        parentId: "s1",
        block: makeBlock("b1", "s1"),
      }),
    );
    expect(out.state.children.s1).toEqual(["b1"]);
  });

  it("returns identity transition for unhandled intents (UNDO/REDO)", () => {
    const initial = makeEmptyState();
    const out = apply(initial, makeEntry({ type: "UNDO" }));
    expect(out.state).toBe(initial);
    expect(out.commands).toEqual([]);
  });
});
