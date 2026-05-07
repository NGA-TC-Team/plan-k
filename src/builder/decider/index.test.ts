import { describe, expect, it } from "bun:test";
import { makeBlock, makeEmptyState, makeEntry, withBlocks } from "../fixtures";
import { decide } from "./index";

const screenState = () =>
  makeEmptyState({
    screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
  });

describe("decide (composer)", () => {
  it("routes SELECT_NODE to selection slice and accepts existing block", () => {
    const state = withBlocks(screenState(), [{ id: "b1", parentId: "s1" }]);
    expect(
      decide(state, makeEntry({ type: "SELECT_NODE", nodeId: "b1" })),
    ).toEqual({ ok: true });
  });

  it("returns the slice's Reason for invalid intent", () => {
    expect(
      decide(makeEmptyState(), makeEntry({ type: "COMMIT_EDIT" })),
    ).toEqual({ ok: false, reason: "WRONG_MODE" });
  });

  it("routes structure intents", () => {
    expect(
      decide(
        screenState(),
        makeEntry({
          type: "INSERT_BLOCK",
          parentId: "s1",
          block: makeBlock("b1", "s1"),
        }),
      ),
    ).toEqual({ ok: true });
  });

  it("returns ok no-op for intents no slice claims (e.g. UNDO)", () => {
    expect(decide(makeEmptyState(), makeEntry({ type: "UNDO" }))).toEqual({
      ok: true,
    });
  });
});
