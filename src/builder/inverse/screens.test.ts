import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import { applyScreens } from "../reducer/screens";
import type { ScreenEdge, ScreenEntity } from "../types/entity";
import { invertScreens } from "./screens";

const makeScreen = (
  id: string,
  overrides: Partial<ScreenEntity> = {},
): ScreenEntity => ({
  id,
  planId: "p1",
  title: id,
  ...overrides,
});

describe("invertScreens", () => {
  it("returns null for unrelated intent", () => {
    expect(
      invertScreens(makeEntry({ type: "UNDO" }), makeEmptyState()),
    ).toBeNull();
  });

  it("INSERT_SCREEN → DELETE_SCREEN", () => {
    expect(
      invertScreens(
        makeEntry({ type: "INSERT_SCREEN", screen: makeScreen("s1") }),
        makeEmptyState(),
      ),
    ).toEqual({ type: "DELETE_SCREEN", screenId: "s1" });
  });

  it("DELETE_SCREEN of a leaf round-trips via INSERT_SCREEN", () => {
    const before = makeEmptyState({
      screens: { s1: makeScreen("s1") },
    });
    const forward = makeEntry({ type: "DELETE_SCREEN", screenId: "s1" });
    const after = applyScreens(before, forward);
    if (!after) throw new Error("forward apply failed");
    const inv = invertScreens(forward, before);
    expect(inv).toEqual({ type: "INSERT_SCREEN", screen: makeScreen("s1") });
    const reverted = applyScreens(after.state, makeEntry(inv as never));
    expect(reverted?.state.screens.s1).toEqual(makeScreen("s1"));
  });

  it("DELETE_SCREEN with children returns null inverse (P3 limit)", () => {
    const before = makeEmptyState({
      screens: { s1: makeScreen("s1") },
      blocks: { b1: { id: "b1", parentId: "s1", kind: "text", data: {} } },
      children: { s1: ["b1"] },
    });
    expect(
      invertScreens(
        makeEntry({ type: "DELETE_SCREEN", screenId: "s1" }),
        before,
      ),
    ).toBeNull();
  });

  it("UPDATE_SCREEN inverts to UPDATE_SCREEN with prior values", () => {
    const before = makeEmptyState({
      screens: {
        s1: makeScreen("s1", {
          title: "Old",
          position: { x: 0, y: 0 },
        }),
      },
    });
    const forward = makeEntry({
      type: "UPDATE_SCREEN",
      screenId: "s1",
      patch: { title: "New", position: { x: 100, y: 50 } },
    });
    const inv = invertScreens(forward, before);
    expect(inv).toEqual({
      type: "UPDATE_SCREEN",
      screenId: "s1",
      patch: { title: "Old", position: { x: 0, y: 0 } },
    });
  });

  it("INSERT_SCREEN_EDGE round-trips", () => {
    const before = makeEmptyState({
      screens: { s1: makeScreen("s1"), s2: makeScreen("s2") },
    });
    const edge: ScreenEdge = { id: "e1", from: "s1", to: "s2" };
    const forward = makeEntry({ type: "INSERT_SCREEN_EDGE", edge });
    const inv = invertScreens(forward, before);
    expect(inv).toEqual({ type: "DELETE_SCREEN_EDGE", edgeId: "e1" });
  });

  it("DELETE_SCREEN_EDGE inverts to INSERT_SCREEN_EDGE", () => {
    const edge: ScreenEdge = { id: "e1", from: "s1", to: "s2" };
    const before = makeEmptyState({
      screens: { s1: makeScreen("s1"), s2: makeScreen("s2") },
      screenEdges: { e1: edge },
    });
    const inv = invertScreens(
      makeEntry({ type: "DELETE_SCREEN_EDGE", edgeId: "e1" }),
      before,
    );
    expect(inv).toEqual({ type: "INSERT_SCREEN_EDGE", edge });
  });
});
