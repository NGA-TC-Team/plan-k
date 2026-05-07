import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import { applyUi } from "./ui";

describe("applyUi", () => {
  it("returns null for unrelated intent", () => {
    expect(applyUi(makeEmptyState(), makeEntry({ type: "UNDO" }))).toBeNull();
  });

  it("SWITCH_VIEW_MODE flips state.viewMode", () => {
    const out = applyUi(
      makeEmptyState(),
      makeEntry({ type: "SWITCH_VIEW_MODE", mode: "wireframe" }),
    );
    expect(out?.state.viewMode).toBe("wireframe");
    expect(out?.commands).toEqual([]);
  });

  it("SWITCH_AGENT_TAB flips state.agentTab", () => {
    const out = applyUi(
      makeEmptyState(),
      makeEntry({ type: "SWITCH_AGENT_TAB", tab: "graph" }),
    );
    expect(out?.state.agentTab).toBe("graph");
  });

  it("SWITCH_SCREEN sets state.currentScreenId", () => {
    const out = applyUi(
      makeEmptyState(),
      makeEntry({ type: "SWITCH_SCREEN", screenId: "s1" }),
    );
    expect(out?.state.currentScreenId).toBe("s1");
  });

  it("SWITCH_SCREEN with null clears state.currentScreenId", () => {
    const seeded = makeEmptyState({ currentScreenId: "s1" });
    const out = applyUi(
      seeded,
      makeEntry({ type: "SWITCH_SCREEN", screenId: null }),
    );
    expect(out?.state.currentScreenId).toBeNull();
  });
});
