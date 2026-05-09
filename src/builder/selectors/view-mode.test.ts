import { describe, expect, it } from "bun:test";
import { makeEmptyState } from "@/builder/fixtures";
import { getEffectiveViewMode } from "./view-mode";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function withViewMode(
  state: ReturnType<typeof makeEmptyState>,
  mode: "detail" | "wireframe",
) {
  return { ...state, viewMode: mode };
}

function withOverride(
  state: ReturnType<typeof makeEmptyState>,
  entityId: string,
  override: "detail" | "wireframe",
) {
  return {
    ...state,
    entityMeta: {
      ...state.entityMeta,
      [entityId]: {
        lamport: 1,
        origin: "human:test" as const,
        viewModeOverride: override,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// getEffectiveViewMode
// ---------------------------------------------------------------------------

describe("getEffectiveViewMode", () => {
  it("returns global viewMode when entityId is null", () => {
    const state = withViewMode(makeEmptyState(), "wireframe");
    expect(getEffectiveViewMode(state, null)).toBe("wireframe");
  });

  it("returns global viewMode when entityId has no entityMeta", () => {
    const state = withViewMode(makeEmptyState(), "detail");
    expect(getEffectiveViewMode(state, "sec-unknown")).toBe("detail");
  });

  it("returns global viewMode when entityMeta exists but has no viewModeOverride", () => {
    const state = {
      ...withViewMode(makeEmptyState(), "wireframe"),
      entityMeta: {
        sec1: { lamport: 1, origin: "human:test" as const },
      },
    };
    expect(getEffectiveViewMode(state, "sec1")).toBe("wireframe");
  });

  it("override 'detail' beats global 'wireframe'", () => {
    const state = withOverride(
      withViewMode(makeEmptyState(), "wireframe"),
      "sec1",
      "detail",
    );
    expect(getEffectiveViewMode(state, "sec1")).toBe("detail");
  });

  it("override 'wireframe' beats global 'detail'", () => {
    const state = withOverride(
      withViewMode(makeEmptyState(), "detail"),
      "scr1",
      "wireframe",
    );
    expect(getEffectiveViewMode(state, "scr1")).toBe("wireframe");
  });

  it("override applies only to the given entityId, not others", () => {
    const base = withViewMode(makeEmptyState(), "detail");
    const state = withOverride(base, "sec1", "wireframe");
    expect(getEffectiveViewMode(state, "sec1")).toBe("wireframe");
    expect(getEffectiveViewMode(state, "sec2")).toBe("detail");
    expect(getEffectiveViewMode(state, null)).toBe("detail");
  });
});
