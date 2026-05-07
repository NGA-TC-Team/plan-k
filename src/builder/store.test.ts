import { describe, expect, it } from "bun:test";
import { deterministicIdFactory } from "./ids";
import { createBuilderStore, createInitialState } from "./store";
import type { IntentLogEntry } from "./types/intent";
import type { AppState } from "./types/state";

function setup(initialOverrides?: Partial<AppState>) {
  const ids = deterministicIdFactory();
  const persisted: IntentLogEntry[] = [];
  const toasts: Array<{ level: string; message: string }> = [];
  const initialState: AppState = {
    ...createInitialState("human:test"),
    ...initialOverrides,
  };
  const store = createBuilderStore({
    planId: "p1",
    origin: "human:test",
    now: () => 1000,
    newId: ids.newEntryId,
    initialState,
    effects: {
      persistIntent: (e) => persisted.push(e),
      emitToast: (level, message) => toasts.push({ level, message }),
    },
  });
  return { store, persisted, toasts };
}

const seededWithBlock = (): Partial<AppState> => ({
  screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
  blocks: {
    b1: { id: "b1", parentId: "s1", kind: "text", data: { text: "old" } },
  },
  children: { s1: ["b1"] },
});

describe("store basic dispatch", () => {
  it("SELECT_NODE updates selection but is UI-only (no pending/history/persist)", () => {
    const { store, persisted } = setup({
      ...seededWithBlock(),
    });
    store.getState().dispatch({ type: "SELECT_NODE", nodeId: "b1" });
    const s = store.getState().state;
    expect(s.selection).toEqual({ kind: "node", id: "b1" });
    expect(s.lamport).toBe(1);
    expect(Object.keys(s.pending)).toHaveLength(0);
    expect(s.historyPast).toHaveLength(0);
    expect(persisted).toHaveLength(0);
  });

  it("INSERT_BLOCK is a user action: pending + history + persisted", () => {
    const { store, persisted } = setup({
      screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
    });
    store.getState().dispatch({
      type: "INSERT_BLOCK",
      parentId: "s1",
      block: { id: "b9", parentId: "s1", kind: "text", data: {} },
    });
    const s = store.getState().state;
    expect(Object.keys(s.pending)).toHaveLength(1);
    expect(s.historyPast).toHaveLength(1);
    expect(persisted).toHaveLength(1);
    expect(persisted[0]?.intent.type).toBe("INSERT_BLOCK");
  });

  it("rejects an invalid intent: lastError set, EMIT_TOAST(warn) emitted", () => {
    const { store, toasts, persisted } = setup();
    store.getState().dispatch({ type: "COMMIT_EDIT" });
    const s = store.getState().state;
    expect(s.lastError?.reason).toBe("WRONG_MODE");
    expect(toasts).toEqual([{ level: "warn", message: "WRONG_MODE" }]);
    expect(persisted).toEqual([]);
    expect(s.historyPast).toHaveLength(0);
  });
});

describe("store editing scenario (SELECT_NODE → BEGIN_EDIT → CHANGE_DRAFT × 3 → COMMIT_EDIT)", () => {
  it("commits the latest draft and writes block.data + entityMeta", () => {
    const { store, persisted } = setup(seededWithBlock());
    const { dispatch } = store.getState();
    dispatch({ type: "SELECT_NODE", nodeId: "b1" });
    dispatch({ type: "BEGIN_EDIT", nodeId: "b1" });
    dispatch({ type: "CHANGE_DRAFT", value: { text: "v1" } });
    dispatch({ type: "CHANGE_DRAFT", value: { text: "v2" } });
    dispatch({ type: "CHANGE_DRAFT", value: { text: "v3" } });
    dispatch({ type: "COMMIT_EDIT" });

    const s = store.getState().state;
    expect(s.blocks.b1?.data).toEqual({ text: "v3" });
    expect(s.editing).toEqual({ kind: "none" });
    expect(s.entityMeta.b1).toBeDefined();
    // Only COMMIT_EDIT is persisted; SELECT/BEGIN/CHANGE_DRAFT are UI-local.
    expect(persisted.length).toBe(1);
    expect(persisted[0]?.intent.type).toBe("COMMIT_EDIT");
  });

  it("CANCEL_EDIT does not change block.data", () => {
    const { store } = setup(seededWithBlock());
    const { dispatch } = store.getState();
    dispatch({ type: "BEGIN_EDIT", nodeId: "b1" });
    dispatch({ type: "CHANGE_DRAFT", value: { text: "draft-only" } });
    dispatch({ type: "CANCEL_EDIT" });
    const s = store.getState().state;
    expect(s.blocks.b1?.data).toEqual({ text: "old" });
    expect(s.editing).toEqual({ kind: "none" });
  });
});

describe("store history (UNDO/REDO)", () => {
  it("COMMIT_EDIT → UNDO restores block.data to previousValue", () => {
    const { store } = setup(seededWithBlock());
    const { dispatch } = store.getState();
    dispatch({ type: "BEGIN_EDIT", nodeId: "b1" });
    dispatch({ type: "CHANGE_DRAFT", value: { text: "new" } });
    dispatch({ type: "COMMIT_EDIT" });
    expect(store.getState().state.blocks.b1?.data).toEqual({ text: "new" });

    dispatch({ type: "UNDO" });
    expect(store.getState().state.blocks.b1?.data).toEqual({ text: "old" });
  });

  it("UNDO then REDO re-applies the original change", () => {
    const { store } = setup({
      screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
    });
    const { dispatch } = store.getState();
    dispatch({
      type: "INSERT_BLOCK",
      parentId: "s1",
      block: { id: "b9", parentId: "s1", kind: "text", data: {} },
    });
    expect(store.getState().state.blocks.b9).toBeDefined();
    dispatch({ type: "UNDO" });
    expect(store.getState().state.blocks.b9).toBeUndefined();
    dispatch({ type: "REDO" });
    expect(store.getState().state.blocks.b9).toBeDefined();
  });

  it("UNDO on empty history is a no-op", () => {
    const { store } = setup();
    const before = store.getState().state;
    store.getState().dispatch({ type: "UNDO" });
    expect(store.getState().state).toBe(before);
  });
});

describe("store PERSIST_FAILED rollback", () => {
  it("rolls back the original change via DISPATCH_INTENT(inverse) + emits error toast", () => {
    const { store, toasts } = setup({
      screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
    });
    const { dispatch } = store.getState();
    dispatch({
      type: "INSERT_BLOCK",
      parentId: "s1",
      block: { id: "b9", parentId: "s1", kind: "text", data: {} },
    });
    expect(store.getState().state.blocks.b9).toBeDefined();
    const failedEntryId = Object.keys(store.getState().state.pending)[0];
    expect(failedEntryId).toBeDefined();

    dispatch({
      type: "PERSIST_FAILED",
      entryId: failedEntryId as string,
      reason: "server-rejected",
    });

    const s = store.getState().state;
    expect(s.blocks.b9).toBeUndefined();
    expect(s.pending[failedEntryId as string]).toBeUndefined();
    expect(s.lastError?.reason).toBe("server-rejected");
    expect(
      toasts.some(
        (t) => t.level === "error" && t.message.includes("server-rejected"),
      ),
    ).toBe(true);
  });
});

describe("store REMOTE_INTENT_RECEIVED", () => {
  it("applies inner entry, grows appliedEntries, and skips local history/pending", () => {
    const { store, persisted } = setup({
      screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
    });
    const remoteEntry: IntentLogEntry = {
      id: "remote-1",
      planId: "p1",
      origin: "human:other",
      lamport: 7,
      intent: {
        type: "INSERT_BLOCK",
        parentId: "s1",
        block: {
          id: "rb1",
          parentId: "s1",
          kind: "text",
          data: { text: "remote" },
        },
      },
      createdAt: 0,
      kind: "primary",
    };
    store
      .getState()
      .dispatch({ type: "REMOTE_INTENT_RECEIVED", entry: remoteEntry });

    const s = store.getState().state;
    expect(s.appliedEntries).toContain("remote-1");
    expect(s.blocks.rb1).toBeDefined();
    expect(s.children.s1).toEqual(["rb1"]);
    expect(s.historyPast).toHaveLength(0);
    expect(s.pending).toEqual({});
    expect(persisted).toHaveLength(0);
    expect(s.lamport).toBeGreaterThan(7);
  });

  it("idempotent: re-receiving the same remote entry is rejected without effect", () => {
    const { store } = setup({
      screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
    });
    const remoteEntry: IntentLogEntry = {
      id: "remote-2",
      planId: "p1",
      origin: "human:other",
      lamport: 1,
      intent: { type: "SELECT_NODE", nodeId: null },
      createdAt: 0,
      kind: "primary",
    };
    const dispatch = store.getState().dispatch;
    dispatch({ type: "REMOTE_INTENT_RECEIVED", entry: remoteEntry });
    const lamportAfterFirst = store.getState().state.lamport;
    dispatch({ type: "REMOTE_INTENT_RECEIVED", entry: remoteEntry });
    const s = store.getState().state;
    expect(s.appliedEntries.filter((id) => id === "remote-2")).toHaveLength(1);
    expect(s.lastError?.reason).toBe("DUPLICATE_ENTRY");
    expect(s.lamport).toBeGreaterThan(lamportAfterFirst);
  });
});
