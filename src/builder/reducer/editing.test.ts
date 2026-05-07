import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry, withBlocks } from "../fixtures";
import { applyEditing } from "./editing";

describe("applyEditing.BEGIN_EDIT", () => {
  it("enters editing with draft and previousValue from current block", () => {
    const state = withBlocks(makeEmptyState(), [
      { id: "b1", parentId: "s1", data: { text: "hi" } },
    ]);
    const out = applyEditing(
      state,
      makeEntry(
        { type: "BEGIN_EDIT", nodeId: "b1" },
        { origin: "human:a", lamport: 7 },
      ),
    );
    expect(out?.state.editing).toEqual({
      kind: "node",
      id: "b1",
      origin: "human:a",
      lamport: 7,
      draft: { text: "hi" },
      previousValue: { text: "hi" },
    });
    expect(out?.state.selection).toEqual({ kind: "node", id: "b1" });
  });

  it("emits a takeover toast when overriding another origin", () => {
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
    const out = applyEditing(
      state,
      makeEntry(
        { type: "BEGIN_EDIT", nodeId: "b1" },
        { origin: "claude:b", lamport: 9 },
      ),
    );
    expect(out?.commands).toEqual([
      {
        type: "EMIT_TOAST",
        level: "warn",
        message: "Editing taken over from human:a",
      },
    ]);
    expect(
      out?.state.editing.kind === "node" ? out.state.editing.origin : null,
    ).toBe("claude:b");
  });

  it("emits no toast when same origin re-begins editing", () => {
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
    const out = applyEditing(
      state,
      makeEntry(
        { type: "BEGIN_EDIT", nodeId: "b1" },
        { origin: "human:a", lamport: 6 },
      ),
    );
    expect(out?.commands).toEqual([]);
  });
});

describe("applyEditing.CHANGE_DRAFT", () => {
  it("updates draft only, leaves previousValue and block untouched", () => {
    const state = withBlocks(
      makeEmptyState({
        editing: {
          kind: "node",
          id: "b1",
          origin: "human:a",
          lamport: 5,
          draft: { text: "old" },
          previousValue: { text: "old" },
        },
      }),
      [{ id: "b1", parentId: "s1", data: { text: "old" } }],
    );
    const out = applyEditing(
      state,
      makeEntry(
        { type: "CHANGE_DRAFT", value: { text: "new" } },
        { origin: "human:a" },
      ),
    );
    if (out?.state.editing.kind !== "node") throw new Error("expected editing");
    expect(out.state.editing.draft).toEqual({ text: "new" });
    expect(out.state.editing.previousValue).toEqual({ text: "old" });
    expect(out.state.blocks.b1?.data).toEqual({ text: "old" });
  });
});

describe("applyEditing.COMMIT_EDIT", () => {
  it("writes draft to block.data, exits editing, updates entityMeta", () => {
    const state = withBlocks(
      makeEmptyState({
        editing: {
          kind: "node",
          id: "b1",
          origin: "human:a",
          lamport: 5,
          draft: { text: "new" },
          previousValue: { text: "old" },
        },
      }),
      [{ id: "b1", parentId: "s1", data: { text: "old" } }],
    );
    const out = applyEditing(
      state,
      makeEntry({ type: "COMMIT_EDIT" }, { origin: "human:a", lamport: 9 }),
    );
    expect(out?.state.blocks.b1?.data).toEqual({ text: "new" });
    expect(out?.state.editing).toEqual({ kind: "none" });
    expect(out?.state.entityMeta.b1).toEqual({ lamport: 9, origin: "human:a" });
  });
});

describe("applyEditing.CANCEL_EDIT", () => {
  it("exits editing without changing the block", () => {
    const state = withBlocks(
      makeEmptyState({
        editing: {
          kind: "node",
          id: "b1",
          origin: "human:a",
          lamport: 5,
          draft: { text: "new" },
          previousValue: { text: "old" },
        },
      }),
      [{ id: "b1", parentId: "s1", data: { text: "old" } }],
    );
    const out = applyEditing(
      state,
      makeEntry({ type: "CANCEL_EDIT" }, { origin: "human:a" }),
    );
    expect(out?.state.editing).toEqual({ kind: "none" });
    expect(out?.state.blocks.b1?.data).toEqual({ text: "old" });
  });
});
