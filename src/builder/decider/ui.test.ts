import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import { decideUi } from "./ui";

describe("decideUi", () => {
  it("returns null for unrelated intent", () => {
    expect(decideUi(makeEmptyState(), makeEntry({ type: "UNDO" }))).toBeNull();
  });

  it("accepts SWITCH_VIEW_MODE", () => {
    expect(
      decideUi(
        makeEmptyState(),
        makeEntry({ type: "SWITCH_VIEW_MODE", mode: "wireframe" }),
      ),
    ).toEqual({ ok: true });
  });

  it("accepts SWITCH_AGENT_TAB", () => {
    expect(
      decideUi(
        makeEmptyState(),
        makeEntry({ type: "SWITCH_AGENT_TAB", tab: "graph" }),
      ),
    ).toEqual({ ok: true });
  });

  it("SWITCH_SCREEN: rejects with NOT_FOUND when screenId missing", () => {
    expect(
      decideUi(
        makeEmptyState(),
        makeEntry({ type: "SWITCH_SCREEN", screenId: "ghost" }),
      ),
    ).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("SWITCH_SCREEN: accepts null (no current screen)", () => {
    expect(
      decideUi(
        makeEmptyState(),
        makeEntry({ type: "SWITCH_SCREEN", screenId: null }),
      ),
    ).toEqual({ ok: true });
  });

  it("SWITCH_SCREEN: accepts existing screen", () => {
    const state = makeEmptyState({
      screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
    });
    expect(
      decideUi(state, makeEntry({ type: "SWITCH_SCREEN", screenId: "s1" })),
    ).toEqual({ ok: true });
  });
});
