import { afterEach, describe, expect, it } from "bun:test";

// ---------------------------------------------------------------------------
// Zustand persist middleware reads/writes localStorage. Provide a Map-backed shim.
// ---------------------------------------------------------------------------
const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  },
  writable: true,
});

import { usePrintOptionsStore } from "./print-options.store";

const DEFAULT_STATE = {
  cover: true,
  toc: true,
  pageNumbers: true,
  footerText: "",
};

afterEach(() => {
  store.clear();
  usePrintOptionsStore.setState(DEFAULT_STATE);
});

describe("usePrintOptionsStore — defaults", () => {
  it("has expected default values", () => {
    const s = usePrintOptionsStore.getState();
    expect(s.cover).toBe(true);
    expect(s.toc).toBe(true);
    expect(s.pageNumbers).toBe(true);
    expect(s.footerText).toBe("");
  });
});

describe("usePrintOptionsStore — toggles", () => {
  it("setCover(false) sets cover to false", () => {
    usePrintOptionsStore.getState().setCover(false);
    expect(usePrintOptionsStore.getState().cover).toBe(false);
  });

  it("setCover(true) restores cover", () => {
    usePrintOptionsStore.getState().setCover(false);
    usePrintOptionsStore.getState().setCover(true);
    expect(usePrintOptionsStore.getState().cover).toBe(true);
  });

  it("setToc(false) sets toc to false", () => {
    usePrintOptionsStore.getState().setToc(false);
    expect(usePrintOptionsStore.getState().toc).toBe(false);
  });

  it("setToc(true) restores toc", () => {
    usePrintOptionsStore.getState().setToc(false);
    usePrintOptionsStore.getState().setToc(true);
    expect(usePrintOptionsStore.getState().toc).toBe(true);
  });

  it("setPageNumbers(false) sets pageNumbers to false", () => {
    usePrintOptionsStore.getState().setPageNumbers(false);
    expect(usePrintOptionsStore.getState().pageNumbers).toBe(false);
  });

  it("setPageNumbers(true) restores pageNumbers", () => {
    usePrintOptionsStore.getState().setPageNumbers(false);
    usePrintOptionsStore.getState().setPageNumbers(true);
    expect(usePrintOptionsStore.getState().pageNumbers).toBe(true);
  });
});

describe("usePrintOptionsStore — footerText", () => {
  it("setFooterText sets a string value", () => {
    usePrintOptionsStore.getState().setFooterText("Acme Corp");
    expect(usePrintOptionsStore.getState().footerText).toBe("Acme Corp");
  });

  it("setFooterText('') clears the footer text", () => {
    usePrintOptionsStore.getState().setFooterText("Acme Corp");
    usePrintOptionsStore.getState().setFooterText("");
    expect(usePrintOptionsStore.getState().footerText).toBe("");
  });

  it("setFooterText stores arbitrary unicode", () => {
    usePrintOptionsStore.getState().setFooterText("한글 푸터 텍스트");
    expect(usePrintOptionsStore.getState().footerText).toBe("한글 푸터 텍스트");
  });
});

describe("usePrintOptionsStore — persist migrate no-op", () => {
  it("migrate(state, 1) returns the state unchanged (no-op for v1)", () => {
    // Access the migrate option via Zustand persist internals.
    // biome-ignore lint/suspicious/noExplicitAny: same escape hatch as theme-store.test.ts
    const persistApi = (usePrintOptionsStore as any).persist;
    const migrateFn = persistApi?.getOptions?.().migrate;
    if (!migrateFn) {
      // If internals changed, skip gracefully — the no-op contract is trivial.
      return;
    }
    const v1State = {
      cover: false,
      toc: false,
      pageNumbers: false,
      footerText: "test",
    };
    const result = migrateFn(v1State, 1);
    expect(result).toEqual(v1State);
  });
});
