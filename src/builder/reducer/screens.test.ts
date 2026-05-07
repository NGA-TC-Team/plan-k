import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry, withBlocks } from "../fixtures";
import type { ScreenEntity } from "../types/entity";
import { applyScreens } from "./screens";

const makeScreen = (
  id: string,
  overrides: Partial<ScreenEntity> = {},
): ScreenEntity => ({
  id,
  planId: "p1",
  title: id,
  ...overrides,
});

describe("applyScreens.INSERT_SCREEN", () => {
  it("adds a screen and entityMeta", () => {
    const out = applyScreens(
      makeEmptyState(),
      makeEntry(
        { type: "INSERT_SCREEN", screen: makeScreen("s1") },
        { lamport: 3, origin: "human:a" },
      ),
    );
    expect(out?.state.screens.s1).toEqual(makeScreen("s1"));
    expect(out?.state.entityMeta.s1).toEqual({
      lamport: 3,
      origin: "human:a",
    });
  });
});

describe("applyScreens.DELETE_SCREEN", () => {
  it("removes the screen and unlinks descendants/edges", () => {
    const seeded = withBlocks(
      makeEmptyState({
        screens: { s1: makeScreen("s1"), s2: makeScreen("s2") },
        screenEdges: {
          e1: { id: "e1", from: "s1", to: "s2" },
          e2: { id: "e2", from: "s2", to: "s1" },
        },
        currentScreenId: "s1",
      }),
      [{ id: "b1", parentId: "s1" }],
    );
    const out = applyScreens(
      seeded,
      makeEntry({ type: "DELETE_SCREEN", screenId: "s1" }),
    );
    expect(out?.state.screens.s1).toBeUndefined();
    expect(out?.state.children.s1).toBeUndefined();
    expect(Object.keys(out?.state.screenEdges ?? {})).toEqual([]);
    expect(out?.state.currentScreenId).toBeNull();
  });

  it("does not change currentScreenId if deleting a different screen", () => {
    const seeded = makeEmptyState({
      screens: { s1: makeScreen("s1"), s2: makeScreen("s2") },
      currentScreenId: "s1",
    });
    const out = applyScreens(
      seeded,
      makeEntry({ type: "DELETE_SCREEN", screenId: "s2" }),
    );
    expect(out?.state.currentScreenId).toBe("s1");
  });
});

describe("applyScreens.UPDATE_SCREEN", () => {
  it("merges title and position; ignores id/planId in patch", () => {
    const seeded = makeEmptyState({
      screens: { s1: makeScreen("s1") },
    });
    const out = applyScreens(
      seeded,
      makeEntry(
        {
          type: "UPDATE_SCREEN",
          screenId: "s1",
          patch: {
            title: "Renamed",
            position: { x: 100, y: 200 },
            id: "ghost",
            planId: "ghost",
          },
        },
        { lamport: 7, origin: "human:b" },
      ),
    );
    expect(out?.state.screens.s1?.title).toBe("Renamed");
    expect(out?.state.screens.s1?.position).toEqual({ x: 100, y: 200 });
    expect(out?.state.screens.s1?.id).toBe("s1");
    expect(out?.state.screens.s1?.planId).toBe("p1");
    expect(out?.state.entityMeta.s1).toEqual({ lamport: 7, origin: "human:b" });
  });
});

describe("applyScreens.INSERT_SCREEN_EDGE / DELETE_SCREEN_EDGE", () => {
  const seeded = () =>
    makeEmptyState({
      screens: { s1: makeScreen("s1"), s2: makeScreen("s2") },
    });

  it("inserts an edge and meta", () => {
    const out = applyScreens(
      seeded(),
      makeEntry(
        {
          type: "INSERT_SCREEN_EDGE",
          edge: { id: "e1", from: "s1", to: "s2" },
        },
        { lamport: 5, origin: "human:a" },
      ),
    );
    expect(out?.state.screenEdges.e1).toBeDefined();
    expect(out?.state.entityMeta.e1).toEqual({ lamport: 5, origin: "human:a" });
  });

  it("deletes an edge cleanly", () => {
    const seededWithEdge = makeEmptyState({
      screens: { s1: makeScreen("s1"), s2: makeScreen("s2") },
      screenEdges: { e1: { id: "e1", from: "s1", to: "s2" } },
      entityMeta: { e1: { lamport: 1, origin: "human:a" } },
    });
    const out = applyScreens(
      seededWithEdge,
      makeEntry({ type: "DELETE_SCREEN_EDGE", edgeId: "e1" }),
    );
    expect(out?.state.screenEdges.e1).toBeUndefined();
    expect(out?.state.entityMeta.e1).toBeUndefined();
  });
});
