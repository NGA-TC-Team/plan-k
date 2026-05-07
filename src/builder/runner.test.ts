import { describe, expect, it } from "bun:test";
import { makeEntry } from "./fixtures";
import { type RunnerDeps, runCommand } from "./runner";

function makeMockDeps(): {
  deps: RunnerDeps;
  dispatched: { type: string }[];
  persisted: string[];
  toasts: Array<{ level: string; message: string }>;
  focused: string[];
} {
  const dispatched: { type: string }[] = [];
  const persisted: string[] = [];
  const toasts: Array<{ level: string; message: string }> = [];
  const focused: string[] = [];
  const deps: RunnerDeps = {
    dispatch: (intent) => dispatched.push({ type: intent.type }),
    persistIntent: (entry) => persisted.push(entry.id),
    emitToast: (level, message) => toasts.push({ level, message }),
    focusNode: (id) => focused.push(id),
  };
  return { deps, dispatched, persisted, toasts, focused };
}

describe("runCommand", () => {
  it("DISPATCH_INTENT calls deps.dispatch with the inner intent", () => {
    const m = makeMockDeps();
    runCommand(
      { type: "DISPATCH_INTENT", intent: { type: "CANCEL_EDIT" } },
      m.deps,
    );
    expect(m.dispatched).toEqual([{ type: "CANCEL_EDIT" }]);
  });

  it("PERSIST_INTENT calls deps.persistIntent with the entry", () => {
    const m = makeMockDeps();
    const entry = makeEntry(
      { type: "SELECT_NODE", nodeId: "b1" },
      { id: "ent-1" },
    );
    runCommand({ type: "PERSIST_INTENT", entry }, m.deps);
    expect(m.persisted).toEqual(["ent-1"]);
  });

  it("EMIT_TOAST forwards level and message", () => {
    const m = makeMockDeps();
    runCommand({ type: "EMIT_TOAST", level: "warn", message: "stale" }, m.deps);
    expect(m.toasts).toEqual([{ level: "warn", message: "stale" }]);
  });

  it("FOCUS_NODE forwards the nodeId", () => {
    const m = makeMockDeps();
    runCommand({ type: "FOCUS_NODE", nodeId: "b1" }, m.deps);
    expect(m.focused).toEqual(["b1"]);
  });

  it("does not throw when optional callbacks are missing", () => {
    const minimal: RunnerDeps = { dispatch: () => {} };
    expect(() =>
      runCommand({ type: "EMIT_TOAST", level: "info", message: "x" }, minimal),
    ).not.toThrow();
    expect(() =>
      runCommand({ type: "FOCUS_NODE", nodeId: "b1" }, minimal),
    ).not.toThrow();
    expect(() =>
      runCommand(
        {
          type: "PERSIST_INTENT",
          entry: makeEntry({ type: "CANCEL_EDIT" }, { id: "x" }),
        },
        minimal,
      ),
    ).not.toThrow();
  });
});
