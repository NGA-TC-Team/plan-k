import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry, withPending } from "../fixtures";
import { APPLIED_ENTRIES_LIMIT, applySync } from "./sync";

describe("applySync.PERSIST_SUCCEEDED", () => {
  it("removes the entry from pending", () => {
    const pendingEntry = makeEntry(
      { type: "SELECT_NODE", nodeId: "b1" },
      { id: "p-1" },
    );
    const state = withPending(makeEmptyState(), [{ entry: pendingEntry }]);
    const out = applySync(
      state,
      makeEntry({ type: "PERSIST_SUCCEEDED", entryId: "p-1" }),
    );
    expect(out?.state.pending["p-1"]).toBeUndefined();
    expect(out?.commands).toEqual([]);
  });

  it("is a no-op on commands when entry is unknown", () => {
    const out = applySync(
      makeEmptyState(),
      makeEntry({ type: "PERSIST_SUCCEEDED", entryId: "ghost" }),
    );
    expect(out?.commands).toEqual([]);
  });
});

describe("applySync.PERSIST_FAILED", () => {
  it("removes pending, sets lastError, emits a toast and DISPATCH_INTENT for inverse", () => {
    const pendingEntry = makeEntry({ type: "COMMIT_EDIT" }, { id: "p-2" });
    const inverseIntent = {
      type: "UPDATE_BLOCK",
      nodeId: "b1",
      patch: { data: { text: "old" } },
    } as const;
    const state = withPending(makeEmptyState(), [
      { entry: pendingEntry, inverse: inverseIntent },
    ]);
    const out = applySync(
      state,
      makeEntry(
        { type: "PERSIST_FAILED", entryId: "p-2", reason: "server-rejected" },
        { createdAt: 1234 },
      ),
    );
    expect(out?.state.pending["p-2"]).toBeUndefined();
    expect(out?.state.lastError).toEqual({
      reason: "server-rejected",
      at: 1234,
    });
    expect(out?.commands).toEqual([
      {
        type: "EMIT_TOAST",
        level: "error",
        message: "persist failed: server-rejected",
      },
      { type: "DISPATCH_INTENT", intent: inverseIntent },
    ]);
  });

  it("emits only the toast when the pending entry has no inverse", () => {
    const pendingEntry = makeEntry(
      { type: "SELECT_NODE", nodeId: "b1" },
      { id: "p-3" },
    );
    const state = withPending(makeEmptyState(), [
      { entry: pendingEntry, inverse: null },
    ]);
    const out = applySync(
      state,
      makeEntry({
        type: "PERSIST_FAILED",
        entryId: "p-3",
        reason: "network",
      }),
    );
    expect(out?.commands).toHaveLength(1);
    expect(out?.commands[0]).toEqual({
      type: "EMIT_TOAST",
      level: "error",
      message: "persist failed: network",
    });
  });
});

describe("applySync.REMOTE_INTENT_RECEIVED", () => {
  it("appends to appliedEntries and merges Lamport (max + 1)", () => {
    const remote = makeEntry(
      { type: "SELECT_NODE", nodeId: "b1" },
      { id: "r-1", lamport: 7 },
    );
    const state = makeEmptyState({ lamport: 3 });
    const out = applySync(
      state,
      makeEntry({ type: "REMOTE_INTENT_RECEIVED", entry: remote }),
    );
    expect(out?.state.appliedEntries).toEqual(["r-1"]);
    expect(out?.state.lamport).toBe(8);
  });

  it("uses local Lamport when it is already higher than incoming", () => {
    const remote = makeEntry(
      { type: "SELECT_NODE", nodeId: "b1" },
      { id: "r-2", lamport: 2 },
    );
    const state = makeEmptyState({ lamport: 10 });
    const out = applySync(
      state,
      makeEntry({ type: "REMOTE_INTENT_RECEIVED", entry: remote }),
    );
    expect(out?.state.lamport).toBe(11);
  });

  it("trims appliedEntries to APPLIED_ENTRIES_LIMIT", () => {
    const fullList = Array.from(
      { length: APPLIED_ENTRIES_LIMIT },
      (_, i) => `e-${i}`,
    );
    const state = makeEmptyState({ appliedEntries: fullList });
    const remote = makeEntry(
      { type: "SELECT_NODE", nodeId: "b1" },
      { id: "newest", lamport: 1 },
    );
    const out = applySync(
      state,
      makeEntry({ type: "REMOTE_INTENT_RECEIVED", entry: remote }),
    );
    expect(out?.state.appliedEntries.length).toBe(APPLIED_ENTRIES_LIMIT);
    expect(out?.state.appliedEntries[0]).toBe("e-1");
    expect(out?.state.appliedEntries.at(-1)).toBe("newest");
  });
});
