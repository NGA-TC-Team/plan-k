import { afterEach, beforeAll, describe, expect, it } from "bun:test";

// Import after any mock setup (none needed for this store — no side effects).
import { useErrorsUiStore } from "./errors-ui.store";

// ---------------------------------------------------------------------------
// Pre-suite isolation: reset singleton before tests run.
// ---------------------------------------------------------------------------
beforeAll(() => {
  useErrorsUiStore.setState({ open: false, selectedErrorId: null });
});

afterEach(() => {
  useErrorsUiStore.setState({ open: false, selectedErrorId: null });
});

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

describe("useErrorsUiStore — default state", () => {
  it("open is false on init", () => {
    expect(useErrorsUiStore.getState().open).toBe(false);
  });

  it("selectedErrorId is null on init", () => {
    expect(useErrorsUiStore.getState().selectedErrorId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// openDrawer / closeDrawer
// ---------------------------------------------------------------------------

describe("useErrorsUiStore — openDrawer / closeDrawer", () => {
  it("openDrawer sets open to true", () => {
    useErrorsUiStore.getState().openDrawer();
    expect(useErrorsUiStore.getState().open).toBe(true);
  });

  it("closeDrawer sets open to false", () => {
    useErrorsUiStore.getState().openDrawer();
    useErrorsUiStore.getState().closeDrawer();
    expect(useErrorsUiStore.getState().open).toBe(false);
  });

  it("closeDrawer clears selectedErrorId", () => {
    useErrorsUiStore.getState().openDrawer();
    useErrorsUiStore.getState().selectError("err-1");
    useErrorsUiStore.getState().closeDrawer();
    expect(useErrorsUiStore.getState().selectedErrorId).toBeNull();
  });

  it("openDrawer is idempotent — calling twice stays open", () => {
    useErrorsUiStore.getState().openDrawer();
    useErrorsUiStore.getState().openDrawer();
    expect(useErrorsUiStore.getState().open).toBe(true);
  });

  it("closeDrawer is idempotent — calling twice stays closed", () => {
    useErrorsUiStore.getState().closeDrawer();
    useErrorsUiStore.getState().closeDrawer();
    expect(useErrorsUiStore.getState().open).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectError
// ---------------------------------------------------------------------------

describe("useErrorsUiStore — selectError", () => {
  it("selectError sets selectedErrorId", () => {
    useErrorsUiStore.getState().selectError("err-42");
    expect(useErrorsUiStore.getState().selectedErrorId).toBe("err-42");
  });

  it("selectError(null) clears selectedErrorId", () => {
    useErrorsUiStore.getState().selectError("err-42");
    useErrorsUiStore.getState().selectError(null);
    expect(useErrorsUiStore.getState().selectedErrorId).toBeNull();
  });

  it("selectError can be updated to a different id", () => {
    useErrorsUiStore.getState().selectError("err-1");
    useErrorsUiStore.getState().selectError("err-2");
    expect(useErrorsUiStore.getState().selectedErrorId).toBe("err-2");
  });
});
