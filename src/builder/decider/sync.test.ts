import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry, withPending } from "../fixtures";
import { decideSync } from "./sync";

describe("decideSync", () => {
  it("returns null for unrelated intent", () => {
    expect(
      decideSync(makeEmptyState(), makeEntry({ type: "COMMIT_EDIT" })),
    ).toBeNull();
  });

  describe("PERSIST_SUCCEEDED", () => {
    it("accepts when entryId is in pending", () => {
      const pendingEntry = makeEntry(
        { type: "SELECT_NODE", nodeId: "b1" },
        { id: "pend-1" },
      );
      const state = withPending(makeEmptyState(), [{ entry: pendingEntry }]);
      const out = decideSync(
        state,
        makeEntry({ type: "PERSIST_SUCCEEDED", entryId: "pend-1" }),
      );
      expect(out).toEqual({ ok: true });
    });

    it("rejects with DUPLICATE_ENTRY when entryId is unknown", () => {
      const out = decideSync(
        makeEmptyState(),
        makeEntry({ type: "PERSIST_SUCCEEDED", entryId: "ghost" }),
      );
      expect(out).toEqual({ ok: false, reason: "DUPLICATE_ENTRY" });
    });
  });

  describe("PERSIST_FAILED", () => {
    it("accepts when entryId is in pending", () => {
      const pendingEntry = makeEntry({ type: "COMMIT_EDIT" }, { id: "pend-2" });
      const state = withPending(makeEmptyState(), [{ entry: pendingEntry }]);
      const out = decideSync(
        state,
        makeEntry({
          type: "PERSIST_FAILED",
          entryId: "pend-2",
          reason: "boom",
        }),
      );
      expect(out).toEqual({ ok: true });
    });

    it("rejects DUPLICATE_ENTRY when entryId not pending", () => {
      const out = decideSync(
        makeEmptyState(),
        makeEntry({
          type: "PERSIST_FAILED",
          entryId: "ghost",
          reason: "n/a",
        }),
      );
      expect(out).toEqual({ ok: false, reason: "DUPLICATE_ENTRY" });
    });
  });

  describe("REMOTE_INTENT_RECEIVED", () => {
    it("accepts a fresh remote entry", () => {
      const remote = makeEntry(
        { type: "SELECT_NODE", nodeId: "b1" },
        { id: "remote-1" },
      );
      const out = decideSync(
        makeEmptyState(),
        makeEntry({ type: "REMOTE_INTENT_RECEIVED", entry: remote }),
      );
      expect(out).toEqual({ ok: true });
    });

    it("rejects DUPLICATE_ENTRY when remote id already in appliedEntries", () => {
      const remote = makeEntry(
        { type: "SELECT_NODE", nodeId: "b1" },
        { id: "remote-2" },
      );
      const state = makeEmptyState({ appliedEntries: ["remote-2"] });
      const out = decideSync(
        state,
        makeEntry({ type: "REMOTE_INTENT_RECEIVED", entry: remote }),
      );
      expect(out).toEqual({ ok: false, reason: "DUPLICATE_ENTRY" });
    });
  });
});
