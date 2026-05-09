import { afterEach, beforeAll, describe, expect, it, mock } from "bun:test";

// ---------------------------------------------------------------------------
// Mock sonner BEFORE any import that transitively loads errors-store.ts.
// Bun's mock.module intercepts the module registry at resolution time.
// ---------------------------------------------------------------------------
const toastErrorSpy = mock(() => {});
const toastWarningSpy = mock(() => {});
const toastMessageSpy = mock(() => {});

mock.module("sonner", () => ({
  toast: {
    error: toastErrorSpy,
    warning: toastWarningSpy,
    message: toastMessageSpy,
  },
}));

// Import after mock.module is registered.
import { useErrorsStore } from "./errors-store";

// ---------------------------------------------------------------------------
// Pre-suite isolation: reset singleton store state before any test in this file
// runs. Other test files (e.g. builder store tests) may have pushed entries into
// the errors-store singleton before Bun loads this file; afterEach alone is not
// enough because the very first test would already see polluted state.
// ---------------------------------------------------------------------------
beforeAll(() => {
  useErrorsStore.setState({ buffer: [] });
});

// ---------------------------------------------------------------------------
// Reset store + spy call counts between tests.
// ---------------------------------------------------------------------------
afterEach(() => {
  useErrorsStore.setState({ buffer: [] });
  toastErrorSpy.mockClear();
  toastWarningSpy.mockClear();
  toastMessageSpy.mockClear();
});

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

describe("useErrorsStore — default state", () => {
  it("buffer is empty on init", () => {
    const { buffer } = useErrorsStore.getState();
    expect(buffer).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// push — record shape
// ---------------------------------------------------------------------------

describe("useErrorsStore — push record shape", () => {
  it("adds the record at index 0 with id and at populated", () => {
    const before = Date.now();
    useErrorsStore.getState().push({
      severity: "error",
      source: "manual",
      message: "something broke",
    });
    const { buffer } = useErrorsStore.getState();
    expect(buffer.length).toBe(1);
    const rec = buffer[0];
    expect(typeof rec.id).toBe("string");
    expect(rec.id.length).toBeGreaterThan(0);
    expect(rec.at).toBeGreaterThanOrEqual(before);
    expect(rec.severity).toBe("error");
    expect(rec.source).toBe("manual");
    expect(rec.message).toBe("something broke");
  });

  it("newest entry is always at index 0", () => {
    useErrorsStore
      .getState()
      .push({ severity: "info", source: "manual", message: "first" });
    useErrorsStore
      .getState()
      .push({ severity: "warn", source: "manual", message: "second" });
    const { buffer } = useErrorsStore.getState();
    expect(buffer[0].message).toBe("second");
    expect(buffer[1].message).toBe("first");
  });
});

// ---------------------------------------------------------------------------
// push — ring buffer (N=20)
// ---------------------------------------------------------------------------

describe("useErrorsStore — ring buffer", () => {
  it("keeps at most 20 records after 21 pushes", () => {
    for (let i = 0; i < 21; i++) {
      useErrorsStore.getState().push({
        severity: "info",
        source: "manual",
        message: `msg-${i}`,
      });
    }
    const { buffer } = useErrorsStore.getState();
    expect(buffer.length).toBe(20);
  });

  it("drops the oldest entry when buffer overflows", () => {
    for (let i = 0; i < 21; i++) {
      useErrorsStore.getState().push({
        severity: "info",
        source: "manual",
        message: `msg-${i}`,
      });
    }
    const { buffer } = useErrorsStore.getState();
    // msg-0 is the oldest → dropped; msg-20 is newest → at index 0
    expect(buffer[0].message).toBe("msg-20");
    expect(buffer[buffer.length - 1].message).toBe("msg-1");
  });
});

// ---------------------------------------------------------------------------
// push — severity routing (toast calls)
// ---------------------------------------------------------------------------

describe("useErrorsStore — severity toast routing", () => {
  it("severity=error fires toast.error", () => {
    useErrorsStore
      .getState()
      .push({ severity: "error", source: "manual", message: "err msg" });
    expect(toastErrorSpy).toHaveBeenCalledTimes(1);
    expect(toastErrorSpy).toHaveBeenCalledWith("err msg");
    expect(toastWarningSpy).not.toHaveBeenCalled();
    expect(toastMessageSpy).not.toHaveBeenCalled();
  });

  it("severity=warn fires toast.warning", () => {
    useErrorsStore
      .getState()
      .push({ severity: "warn", source: "manual", message: "warn msg" });
    expect(toastWarningSpy).toHaveBeenCalledTimes(1);
    expect(toastWarningSpy).toHaveBeenCalledWith("warn msg");
    expect(toastErrorSpy).not.toHaveBeenCalled();
  });

  it("severity=info fires toast.message", () => {
    useErrorsStore
      .getState()
      .push({ severity: "info", source: "manual", message: "info msg" });
    expect(toastMessageSpy).toHaveBeenCalledTimes(1);
    expect(toastMessageSpy).toHaveBeenCalledWith("info msg");
    expect(toastErrorSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// push — dedupe gate
// ---------------------------------------------------------------------------

describe("useErrorsStore — dedupe within 1000 ms", () => {
  it("same message within 1000ms: record still pushed, toast not fired again", () => {
    // First push — should fire toast
    useErrorsStore
      .getState()
      .push({ severity: "error", source: "manual", message: "dup" });
    expect(toastErrorSpy).toHaveBeenCalledTimes(1);

    // Second push immediately (same message, < 1000ms) — record added, no new toast
    useErrorsStore
      .getState()
      .push({ severity: "error", source: "manual", message: "dup" });
    expect(toastErrorSpy).toHaveBeenCalledTimes(1); // still 1
    const { buffer } = useErrorsStore.getState();
    expect(buffer.length).toBe(2); // both records present
    expect(buffer[0].message).toBe("dup");
    expect(buffer[1].message).toBe("dup");
  });

  it("different messages always fire toast", () => {
    useErrorsStore
      .getState()
      .push({ severity: "error", source: "manual", message: "first" });
    useErrorsStore
      .getState()
      .push({ severity: "error", source: "manual", message: "second" });
    expect(toastErrorSpy).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// clear
// ---------------------------------------------------------------------------

describe("useErrorsStore — clear", () => {
  it("empties the buffer", () => {
    useErrorsStore
      .getState()
      .push({ severity: "info", source: "manual", message: "a" });
    useErrorsStore
      .getState()
      .push({ severity: "info", source: "manual", message: "b" });
    useErrorsStore.getState().clear();
    expect(useErrorsStore.getState().buffer).toEqual([]);
  });
});
