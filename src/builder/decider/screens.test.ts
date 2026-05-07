import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import type { ScreenEdge, ScreenEntity } from "../types/entity";
import { decideScreens } from "./screens";

const makeScreen = (id: string): ScreenEntity => ({
  id,
  planId: "p1",
  title: id,
});

const makeEdge = (id: string, from: string, to: string): ScreenEdge => ({
  id,
  from,
  to,
});

describe("decideScreens.INSERT_SCREEN", () => {
  it("returns null for unrelated intent", () => {
    expect(
      decideScreens(makeEmptyState(), makeEntry({ type: "UNDO" })),
    ).toBeNull();
  });

  it("accepts a fresh screen", () => {
    expect(
      decideScreens(
        makeEmptyState(),
        makeEntry({ type: "INSERT_SCREEN", screen: makeScreen("s1") }),
      ),
    ).toEqual({ ok: true });
  });

  it("rejects re-insert with non-greater Lamport", () => {
    const state = makeEmptyState({
      screens: { s1: makeScreen("s1") },
      entityMeta: { s1: { lamport: 5, origin: "human:a" } },
    });
    expect(
      decideScreens(
        state,
        makeEntry(
          { type: "INSERT_SCREEN", screen: makeScreen("s1") },
          { lamport: 5, origin: "human:a" },
        ),
      ),
    ).toEqual({ ok: false, reason: "STALE_LAMPORT" });
  });
});

describe("decideScreens.UPDATE/DELETE_SCREEN", () => {
  const stateWith = (screen: ScreenEntity) =>
    makeEmptyState({ screens: { [screen.id]: screen } });

  it("rejects missing screen", () => {
    expect(
      decideScreens(
        makeEmptyState(),
        makeEntry({ type: "DELETE_SCREEN", screenId: "ghost" }),
      ),
    ).toEqual({ ok: false, reason: "NOT_FOUND" });
    expect(
      decideScreens(
        makeEmptyState(),
        makeEntry({ type: "UPDATE_SCREEN", screenId: "ghost", patch: {} }),
      ),
    ).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("UPDATE accepts existing", () => {
    expect(
      decideScreens(
        stateWith(makeScreen("s1")),
        makeEntry({
          type: "UPDATE_SCREEN",
          screenId: "s1",
          patch: { title: "Renamed" },
        }),
      ),
    ).toEqual({ ok: true });
  });
});

describe("decideScreens.SCREEN_EDGE", () => {
  const stateWithScreens = () =>
    makeEmptyState({
      screens: { s1: makeScreen("s1"), s2: makeScreen("s2") },
    });

  it("INSERT_SCREEN_EDGE rejects when from missing", () => {
    expect(
      decideScreens(
        stateWithScreens(),
        makeEntry({
          type: "INSERT_SCREEN_EDGE",
          edge: makeEdge("e1", "ghost", "s2"),
        }),
      ),
    ).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("INSERT_SCREEN_EDGE accepts valid edge", () => {
    expect(
      decideScreens(
        stateWithScreens(),
        makeEntry({
          type: "INSERT_SCREEN_EDGE",
          edge: makeEdge("e1", "s1", "s2"),
        }),
      ),
    ).toEqual({ ok: true });
  });

  it("DELETE_SCREEN_EDGE rejects unknown id", () => {
    expect(
      decideScreens(
        stateWithScreens(),
        makeEntry({ type: "DELETE_SCREEN_EDGE", edgeId: "ghost" }),
      ),
    ).toEqual({ ok: false, reason: "NOT_FOUND" });
  });
});
