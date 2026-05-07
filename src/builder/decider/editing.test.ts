import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry, withBlocks } from "../fixtures";
import { decideEditing } from "./editing";

describe("decideEditing.BEGIN_EDIT", () => {
  it("returns null for unrelated intent", () => {
    const out = decideEditing(makeEmptyState(), makeEntry({ type: "UNDO" }));
    expect(out).toBeNull();
  });

  it("rejects with NOT_FOUND when nodeId missing", () => {
    const out = decideEditing(
      makeEmptyState(),
      makeEntry({ type: "BEGIN_EDIT", nodeId: "ghost" }),
    );
    expect(out).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("accepts when no one is editing", () => {
    const state = withBlocks(makeEmptyState(), [{ id: "b1", parentId: "s1" }]);
    const out = decideEditing(
      state,
      makeEntry({ type: "BEGIN_EDIT", nodeId: "b1" }),
    );
    expect(out).toEqual({ ok: true });
  });

  it("rejects with STALE_LAMPORT when incoming stamp is not strictly greater", () => {
    const state = withBlocks(
      makeEmptyState({
        editing: {
          kind: "node",
          id: "b1",
          origin: "human:a",
          lamport: 5,
          draft: {},
          previousValue: {},
        },
      }),
      [{ id: "b1", parentId: "s1" }],
    );
    const out = decideEditing(
      state,
      makeEntry(
        { type: "BEGIN_EDIT", nodeId: "b1" },
        { origin: "human:a", lamport: 5 },
      ),
    );
    expect(out).toEqual({ ok: false, reason: "STALE_LAMPORT" });
  });

  it("accepts when incoming stamp is strictly greater (takeover)", () => {
    const state = withBlocks(
      makeEmptyState({
        editing: {
          kind: "node",
          id: "b1",
          origin: "human:a",
          lamport: 5,
          draft: {},
          previousValue: {},
        },
      }),
      [{ id: "b1", parentId: "s1" }],
    );
    const out = decideEditing(
      state,
      makeEntry(
        { type: "BEGIN_EDIT", nodeId: "b1" },
        { origin: "claude:b", lamport: 10 },
      ),
    );
    expect(out).toEqual({ ok: true });
  });

  it("origin tiebreak: equal lamport, larger origin wins", () => {
    const state = withBlocks(
      makeEmptyState({
        editing: {
          kind: "node",
          id: "b1",
          origin: "human:a",
          lamport: 5,
          draft: {},
          previousValue: {},
        },
      }),
      [{ id: "b1", parentId: "s1" }],
    );
    const out = decideEditing(
      state,
      makeEntry(
        { type: "BEGIN_EDIT", nodeId: "b1" },
        { origin: "human:b", lamport: 5 },
      ),
    );
    expect(out).toEqual({ ok: true });
  });
});

describe("decideEditing.driver-only intents (CHANGE_DRAFT/COMMIT/CANCEL)", () => {
  it("rejects with WRONG_MODE when not editing", () => {
    expect(
      decideEditing(makeEmptyState(), makeEntry({ type: "COMMIT_EDIT" })),
    ).toEqual({ ok: false, reason: "WRONG_MODE" });
    expect(
      decideEditing(makeEmptyState(), makeEntry({ type: "CANCEL_EDIT" })),
    ).toEqual({ ok: false, reason: "WRONG_MODE" });
    expect(
      decideEditing(
        makeEmptyState(),
        makeEntry({ type: "CHANGE_DRAFT", value: "x" }),
      ),
    ).toEqual({ ok: false, reason: "WRONG_MODE" });
  });

  it("rejects with WRONG_MODE when origin does not match the editing origin", () => {
    const state = makeEmptyState({
      editing: {
        kind: "node",
        id: "b1",
        origin: "human:a",
        lamport: 5,
        draft: {},
        previousValue: {},
      },
    });
    const out = decideEditing(
      state,
      makeEntry({ type: "COMMIT_EDIT" }, { origin: "claude:b" }),
    );
    expect(out).toEqual({ ok: false, reason: "WRONG_MODE" });
  });

  it("accepts when origin matches the editing origin", () => {
    const state = makeEmptyState({
      editing: {
        kind: "node",
        id: "b1",
        origin: "human:a",
        lamport: 5,
        draft: {},
        previousValue: {},
      },
    });
    expect(
      decideEditing(
        state,
        makeEntry({ type: "COMMIT_EDIT" }, { origin: "human:a" }),
      ),
    ).toEqual({ ok: true });
    expect(
      decideEditing(
        state,
        makeEntry({ type: "CANCEL_EDIT" }, { origin: "human:a" }),
      ),
    ).toEqual({ ok: true });
    expect(
      decideEditing(
        state,
        makeEntry({ type: "CHANGE_DRAFT", value: "x" }, { origin: "human:a" }),
      ),
    ).toEqual({ ok: true });
  });
});
