import { beforeEach, describe, expect, it } from "bun:test";
import { useBuilderUiStore } from "./builder-ui.store";

// Reset store state before each test to ensure isolation.
beforeEach(() => {
  useBuilderUiStore.setState({
    topMode: "app",
    canvasMode: "screen",
    currentSectionId: null,
    leftRailCollapsed: false,
    zenMode: false,
  });
});

describe("zenMode", () => {
  it("defaults to false", () => {
    expect(useBuilderUiStore.getState().zenMode).toBe(false);
  });

  it("setZenMode(true) sets zenMode to true", () => {
    useBuilderUiStore.getState().setZenMode(true);
    expect(useBuilderUiStore.getState().zenMode).toBe(true);
  });

  it("setZenMode(false) sets zenMode to false", () => {
    useBuilderUiStore.getState().setZenMode(true);
    useBuilderUiStore.getState().setZenMode(false);
    expect(useBuilderUiStore.getState().zenMode).toBe(false);
  });

  it("toggleZenMode flips false → true", () => {
    useBuilderUiStore.getState().toggleZenMode();
    expect(useBuilderUiStore.getState().zenMode).toBe(true);
  });

  it("toggleZenMode flips true → false", () => {
    useBuilderUiStore.getState().setZenMode(true);
    useBuilderUiStore.getState().toggleZenMode();
    expect(useBuilderUiStore.getState().zenMode).toBe(false);
  });

  it("toggleZenMode twice returns to original state", () => {
    useBuilderUiStore.getState().toggleZenMode();
    useBuilderUiStore.getState().toggleZenMode();
    expect(useBuilderUiStore.getState().zenMode).toBe(false);
  });
});

describe("existing state unaffected by zenMode ops", () => {
  it("topMode is unchanged after toggleZenMode", () => {
    useBuilderUiStore.getState().setTopMode("docs");
    useBuilderUiStore.getState().toggleZenMode();
    expect(useBuilderUiStore.getState().topMode).toBe("docs");
  });

  it("leftRailCollapsed is unchanged after toggleZenMode", () => {
    useBuilderUiStore.getState().setLeftRailCollapsed(true);
    useBuilderUiStore.getState().toggleZenMode();
    expect(useBuilderUiStore.getState().leftRailCollapsed).toBe(true);
  });
});
