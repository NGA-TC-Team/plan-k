import { beforeEach, describe, expect, it } from "bun:test";
import { useBuilderUiStore } from "./builder-ui.store";

// Reset store state before each test to ensure isolation.
beforeEach(() => {
  useBuilderUiStore.setState({
    topMode: "app",
    canvasMode: "screen",
    currentSectionId: null,
    leftRailCollapsed: false,
  });
});

describe("leftRailCollapsed", () => {
  it("defaults to false", () => {
    expect(useBuilderUiStore.getState().leftRailCollapsed).toBe(false);
  });

  it("setLeftRailCollapsed(true) collapses rail", () => {
    useBuilderUiStore.getState().setLeftRailCollapsed(true);
    expect(useBuilderUiStore.getState().leftRailCollapsed).toBe(true);
  });

  it("toggleLeftRail flips false → true", () => {
    useBuilderUiStore.getState().toggleLeftRail();
    expect(useBuilderUiStore.getState().leftRailCollapsed).toBe(true);
  });

  it("toggleLeftRail flips true → false", () => {
    useBuilderUiStore.getState().setLeftRailCollapsed(true);
    useBuilderUiStore.getState().toggleLeftRail();
    expect(useBuilderUiStore.getState().leftRailCollapsed).toBe(false);
  });
});

describe("existing state unaffected by rail ops", () => {
  it("topMode is unchanged after toggleLeftRail", () => {
    useBuilderUiStore.getState().setTopMode("docs");
    useBuilderUiStore.getState().toggleLeftRail();
    expect(useBuilderUiStore.getState().topMode).toBe("docs");
  });
});
