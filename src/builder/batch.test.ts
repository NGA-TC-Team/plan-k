import { describe, expect, it } from "bun:test";
import { makeBlock } from "./fixtures";
import { defaultIdFactory } from "./ids";
import { createBuilderStore } from "./store";
import type { Intent } from "./types/intent";

function makeStore() {
  const idFactory = defaultIdFactory();
  let counter = 0;
  const store = createBuilderStore({
    planId: "plan-1",
    origin: "human:test",
    now: () => 0,
    newId: () => `e-${++counter}`,
  });
  return { store, idFactory };
}

describe("BATCH intent", () => {
  it("collapses N inserts into a single history frame", () => {
    const { store } = makeStore();
    // Seed a screen so INSERT_BLOCK has a parent.
    const dispatch = store.getState().dispatch;
    dispatch({
      type: "INSERT_SCREEN",
      screen: { id: "s1", planId: "plan-1", title: "S1" },
    });
    const beforePast = store.getState().state.historyPast.length;

    const intents: Intent[] = [
      { type: "INSERT_BLOCK", parentId: "s1", block: makeBlock("b1", "s1") },
      { type: "INSERT_BLOCK", parentId: "s1", block: makeBlock("b2", "s1") },
      { type: "INSERT_BLOCK", parentId: "s1", block: makeBlock("b3", "s1") },
    ];
    dispatch({ type: "BATCH", intents });

    const state = store.getState().state;
    expect(state.historyPast.length).toBe(beforePast + 1);
    expect(Object.keys(state.blocks)).toEqual(["b1", "b2", "b3"]);
  });

  it("single ⌘Z undoes the whole batch", () => {
    const { store } = makeStore();
    const dispatch = store.getState().dispatch;
    dispatch({
      type: "INSERT_SCREEN",
      screen: { id: "s1", planId: "plan-1", title: "S1" },
    });
    dispatch({
      type: "BATCH",
      intents: [
        { type: "INSERT_BLOCK", parentId: "s1", block: makeBlock("b1", "s1") },
        { type: "INSERT_BLOCK", parentId: "s1", block: makeBlock("b2", "s1") },
      ],
    });
    expect(Object.keys(store.getState().state.blocks).sort()).toEqual([
      "b1",
      "b2",
    ]);

    dispatch({ type: "UNDO" });
    expect(Object.keys(store.getState().state.blocks)).toEqual([]);
  });

  it("redo restores the full batch", () => {
    const { store } = makeStore();
    const dispatch = store.getState().dispatch;
    dispatch({
      type: "INSERT_SCREEN",
      screen: { id: "s1", planId: "plan-1", title: "S1" },
    });
    dispatch({
      type: "BATCH",
      intents: [
        { type: "INSERT_BLOCK", parentId: "s1", block: makeBlock("b1", "s1") },
        { type: "INSERT_BLOCK", parentId: "s1", block: makeBlock("b2", "s1") },
      ],
    });
    dispatch({ type: "UNDO" });
    dispatch({ type: "REDO" });
    expect(Object.keys(store.getState().state.blocks).sort()).toEqual([
      "b1",
      "b2",
    ]);
  });

  it("inverse children execute in reverse order (delete restores original order)", () => {
    const { store } = makeStore();
    const dispatch = store.getState().dispatch;
    dispatch({
      type: "INSERT_SCREEN",
      screen: { id: "s1", planId: "plan-1", title: "S1" },
    });
    dispatch({
      type: "INSERT_BLOCK",
      parentId: "s1",
      block: makeBlock("a", "s1"),
    });
    dispatch({
      type: "INSERT_BLOCK",
      parentId: "s1",
      block: makeBlock("b", "s1"),
    });
    dispatch({
      type: "INSERT_BLOCK",
      parentId: "s1",
      block: makeBlock("c", "s1"),
    });
    expect(store.getState().state.children.s1).toEqual(["a", "b", "c"]);

    dispatch({
      type: "BATCH",
      intents: [
        { type: "DELETE_BLOCK", nodeId: "a" },
        { type: "DELETE_BLOCK", nodeId: "b" },
        { type: "DELETE_BLOCK", nodeId: "c" },
      ],
    });
    expect(store.getState().state.children.s1 ?? []).toEqual([]);

    dispatch({ type: "UNDO" });
    expect(store.getState().state.children.s1).toEqual(["a", "b", "c"]);
  });

  it("empty BATCH is a no-op", () => {
    const { store } = makeStore();
    const before = store.getState().state.historyPast.length;
    store.getState().dispatch({ type: "BATCH", intents: [] });
    expect(store.getState().state.historyPast.length).toBe(before);
  });
});
