import { describe, expect, it } from "bun:test";
import {
  makeBlock,
  makeEmptyState,
  makeEntry,
  withBlocks,
  withPending,
} from "./fixtures";
import {
  selectBlock,
  selectCanRedo,
  selectCanUndo,
  selectChildren,
  selectEditingDraft,
  selectError,
  selectIsEditingNode,
  selectIsPending,
  selectIsSelected,
  selectScreen,
} from "./selectors";

const screenState = () =>
  makeEmptyState({
    screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
  });

describe("selectBlock / selectScreen / selectChildren", () => {
  it("selectBlock returns the block or undefined", () => {
    const state = withBlocks(screenState(), [{ id: "b1", parentId: "s1" }]);
    expect(selectBlock(state, "b1")).toBeDefined();
    expect(selectBlock(state, "ghost")).toBeUndefined();
  });

  it("selectScreen returns the screen or undefined", () => {
    expect(selectScreen(screenState(), "s1")).toBeDefined();
    expect(selectScreen(screenState(), "ghost")).toBeUndefined();
  });

  it("selectChildren returns blocks in children order, skipping missing", () => {
    const state = withBlocks(screenState(), [
      { id: "b1", parentId: "s1" },
      { id: "b2", parentId: "s1" },
    ]);
    const children = selectChildren(state, "s1");
    expect(children.map((b) => b.id)).toEqual(["b1", "b2"]);
  });

  it("selectChildren returns empty array for unknown parent", () => {
    expect(selectChildren(makeEmptyState(), "ghost")).toEqual([]);
  });
});

describe("selection / editing predicates", () => {
  it("selectIsSelected reflects state.selection", () => {
    const state = makeEmptyState({ selection: { kind: "node", id: "b1" } });
    expect(selectIsSelected(state, "b1")).toBe(true);
    expect(selectIsSelected(state, "b2")).toBe(false);
  });

  it("selectIsEditingNode reflects state.editing", () => {
    const state = makeEmptyState({
      editing: {
        kind: "node",
        id: "b1",
        origin: "human:a",
        lamport: 1,
        draft: {},
        previousValue: {},
      },
    });
    expect(selectIsEditingNode(state, "b1")).toBe(true);
    expect(selectIsEditingNode(state, "b2")).toBe(false);
  });

  it("selectEditingDraft returns the draft or null", () => {
    const draft = { text: "x" };
    const state = makeEmptyState({
      editing: {
        kind: "node",
        id: "b1",
        origin: "human:a",
        lamport: 1,
        draft,
        previousValue: {},
      },
    });
    expect(selectEditingDraft(state)).toBe(draft);
    expect(selectEditingDraft(makeEmptyState())).toBeNull();
  });
});

describe("selectIsPending", () => {
  it("returns true when an INSERT_BLOCK pending touches the entity", () => {
    const state = withPending(makeEmptyState(), [
      {
        entry: makeEntry(
          {
            type: "INSERT_BLOCK",
            parentId: "s1",
            block: makeBlock("b1", "s1"),
          },
          { id: "p-1" },
        ),
      },
    ]);
    expect(selectIsPending(state, "b1")).toBe(true);
    expect(selectIsPending(state, "b2")).toBe(false);
  });

  it("returns true for UPDATE/MOVE/DELETE/BEGIN_EDIT pending entries", () => {
    const state = withPending(makeEmptyState(), [
      {
        entry: makeEntry(
          { type: "UPDATE_BLOCK", nodeId: "b2", patch: {} },
          { id: "p-2" },
        ),
      },
    ]);
    expect(selectIsPending(state, "b2")).toBe(true);
  });

  it("returns false for SELECT_NODE pending (does not target an entity)", () => {
    const state = withPending(makeEmptyState(), [
      {
        entry: makeEntry({ type: "SELECT_NODE", nodeId: "b1" }, { id: "p-3" }),
      },
    ]);
    expect(selectIsPending(state, "b1")).toBe(false);
  });
});

describe("history selectors", () => {
  it("selectCanUndo / selectCanRedo reflect stack lengths", () => {
    expect(selectCanUndo(makeEmptyState())).toBe(false);
    expect(selectCanRedo(makeEmptyState())).toBe(false);
    const seeded = makeEmptyState({
      historyPast: [
        {
          entry: makeEntry({ type: "CANCEL_EDIT" }, { id: "x" }),
          inverse: null,
        },
      ],
      historyFuture: [
        {
          entry: makeEntry({ type: "CANCEL_EDIT" }, { id: "y" }),
          inverse: null,
        },
      ],
    });
    expect(selectCanUndo(seeded)).toBe(true);
    expect(selectCanRedo(seeded)).toBe(true);
  });
});

describe("selectError", () => {
  it("returns the lastError value", () => {
    expect(selectError(makeEmptyState())).toBeNull();
    const state = makeEmptyState({
      lastError: { reason: "WRONG_MODE", at: 100 },
    });
    expect(selectError(state)).toEqual({ reason: "WRONG_MODE", at: 100 });
  });
});
