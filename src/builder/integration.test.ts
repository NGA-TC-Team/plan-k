import { describe, expect, it } from "bun:test";
import { hydrate } from "./hydrate";
import { deterministicIdFactory } from "./ids";
import { createBuilderStore, createInitialState } from "./store";
import type { Intent, IntentLogEntry } from "./types/intent";
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
    now: () => 1,
    newId: ids.newEntryId,
    initialState,
    effects: {
      persistIntent: (e) => persisted.push(e),
      emitToast: (level, message) => toasts.push({ level, message }),
    },
  });
  return { store, persisted, toasts };
}

function remoteEntry(
  id: string,
  origin: string,
  lamport: number,
  intent: Intent,
): IntentLogEntry {
  return {
    id,
    planId: "p1",
    origin,
    lamport,
    intent,
    createdAt: 0,
    kind: "primary",
  };
}

const seedScreen = (): Partial<AppState> => ({
  screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
});

const seedScreenWithBlock = (): Partial<AppState> => ({
  ...seedScreen(),
  blocks: {
    b1: { id: "b1", parentId: "s1", kind: "text", data: { text: "seed" } },
  },
  children: { s1: ["b1"] },
  entityMeta: { b1: { lamport: 0, origin: "seed" } },
});

describe("integration: concurrent INSERT_BLOCK under same parent", () => {
  it("two different blocks from two origins both survive children list", () => {
    const { store } = setup(seedScreen());
    const dispatch = store.getState().dispatch;
    dispatch({
      type: "REMOTE_INTENT_RECEIVED",
      entry: remoteEntry("ra", "human:a", 3, {
        type: "INSERT_BLOCK",
        parentId: "s1",
        block: { id: "ba", parentId: "s1", kind: "text", data: {} },
      }),
    });
    dispatch({
      type: "REMOTE_INTENT_RECEIVED",
      entry: remoteEntry("rb", "claude:b", 4, {
        type: "INSERT_BLOCK",
        parentId: "s1",
        block: { id: "bb", parentId: "s1", kind: "text", data: {} },
      }),
    });
    const s = store.getState().state;
    expect(s.blocks.ba).toBeDefined();
    expect(s.blocks.bb).toBeDefined();
    expect(s.children.s1).toEqual(["ba", "bb"]);
  });
});

describe("integration: concurrent UPDATE_BLOCK on same field (LWW)", () => {
  it("higher-Lamport update wins regardless of arrival order", () => {
    const cases = [
      { firstLamport: 5, secondLamport: 3 },
      { firstLamport: 3, secondLamport: 5 },
    ];
    for (const c of cases) {
      const { store } = setup(seedScreenWithBlock());
      const dispatch = store.getState().dispatch;
      dispatch({
        type: "REMOTE_INTENT_RECEIVED",
        entry: remoteEntry("e1", "human:a", c.firstLamport, {
          type: "UPDATE_BLOCK",
          nodeId: "b1",
          patch: { data: { text: `from-${c.firstLamport}` } },
        }),
      });
      dispatch({
        type: "REMOTE_INTENT_RECEIVED",
        entry: remoteEntry("e2", "human:b", c.secondLamport, {
          type: "UPDATE_BLOCK",
          nodeId: "b1",
          patch: { data: { text: `from-${c.secondLamport}` } },
        }),
      });
      const winnerLamport = Math.max(c.firstLamport, c.secondLamport);
      expect(store.getState().state.blocks.b1?.data).toEqual({
        text: `from-${winnerLamport}`,
      });
    }
  });
});

describe("integration: edit conflict (BEGIN_EDIT race)", () => {
  it("higher-Lamport BEGIN_EDIT takes over editing and emits a takeover toast", () => {
    const { store, toasts } = setup(seedScreenWithBlock());
    const dispatch = store.getState().dispatch;

    dispatch({ type: "BEGIN_EDIT", nodeId: "b1" });
    const initialEditing = store.getState().state.editing;
    expect(initialEditing.kind === "node" ? initialEditing.origin : null).toBe(
      "human:test",
    );

    dispatch({
      type: "REMOTE_INTENT_RECEIVED",
      entry: remoteEntry("re-take", "claude:other", 1000, {
        type: "BEGIN_EDIT",
        nodeId: "b1",
      }),
    });

    const s = store.getState().state;
    expect(s.editing.kind).toBe("node");
    if (s.editing.kind === "node") {
      expect(s.editing.origin).toBe("claude:other");
      expect(s.editing.lamport).toBe(1000);
    }
    expect(
      toasts.some(
        (t) => t.level === "warn" && t.message.includes("human:test"),
      ),
    ).toBe(true);
  });

  it("lower-Lamport BEGIN_EDIT is rejected with STALE_LAMPORT", () => {
    const { store } = setup(seedScreenWithBlock());
    const dispatch = store.getState().dispatch;

    dispatch({ type: "BEGIN_EDIT", nodeId: "b1" });
    const ownerEditing = store.getState().state.editing;
    const ownerLamport =
      ownerEditing.kind === "node" ? ownerEditing.lamport : 0;

    dispatch({
      type: "REMOTE_INTENT_RECEIVED",
      entry: remoteEntry("re-stale", "claude:other", 0, {
        type: "BEGIN_EDIT",
        nodeId: "b1",
      }),
    });

    const s = store.getState().state;
    if (s.editing.kind === "node") {
      expect(s.editing.origin).toBe("human:test");
      expect(s.editing.lamport).toBe(ownerLamport);
    }
    expect(s.lastError?.reason).toBe("STALE_LAMPORT");
  });
});

describe("integration: hydrate determinism", () => {
  it("hydrate is permutation-invariant: any input order yields the same state", () => {
    const snapshot: AppState = {
      ...createInitialState("human:local"),
      ...seedScreen(),
    };
    const entries: IntentLogEntry[] = [
      remoteEntry("h1", "human:a", 5, {
        type: "INSERT_BLOCK",
        parentId: "s1",
        block: { id: "x1", parentId: "s1", kind: "text", data: {} },
      }),
      remoteEntry("h2", "human:b", 3, {
        type: "INSERT_BLOCK",
        parentId: "s1",
        block: { id: "x2", parentId: "s1", kind: "text", data: {} },
      }),
      remoteEntry("h3", "claude:c", 7, {
        type: "UPDATE_BLOCK",
        nodeId: "x1",
        patch: { data: { v: "set-by-c" } },
      }),
    ];
    const stateA = hydrate(snapshot, entries);
    const stateB = hydrate(snapshot, [...entries].reverse());
    const stateC = hydrate(snapshot, [
      entries[2],
      entries[0],
      entries[1],
    ] as IntentLogEntry[]);
    expect(stateB.blocks).toEqual(stateA.blocks);
    expect(stateB.children).toEqual(stateA.children);
    expect(stateB.entityMeta).toEqual(stateA.entityMeta);
    expect(stateC.blocks).toEqual(stateA.blocks);
  });

  it("hydrate sets appliedEntries and bumps lamport above the max input", () => {
    const snapshot: AppState = {
      ...createInitialState("human:local"),
      ...seedScreen(),
    };
    const entries: IntentLogEntry[] = [
      remoteEntry("h1", "human:a", 4, { type: "SELECT_NODE", nodeId: null }),
      remoteEntry("h2", "human:b", 9, { type: "SELECT_NODE", nodeId: null }),
    ];
    const result = hydrate(snapshot, entries);
    expect(result.appliedEntries).toEqual(["h1", "h2"]);
    expect(result.lamport).toBe(10);
  });

  it("after hydrate, re-receiving an already-applied entry is rejected as DUPLICATE_ENTRY", () => {
    const snapshot: AppState = {
      ...createInitialState("human:local"),
      ...seedScreen(),
    };
    const tail: IntentLogEntry[] = [
      remoteEntry("h1", "human:a", 2, {
        type: "INSERT_BLOCK",
        parentId: "s1",
        block: { id: "y1", parentId: "s1", kind: "text", data: {} },
      }),
    ];
    const initialState = hydrate(snapshot, tail);
    const ids = deterministicIdFactory();
    const store = createBuilderStore({
      planId: "p1",
      origin: "human:local",
      now: () => 1,
      newId: ids.newEntryId,
      initialState,
    });
    store.getState().dispatch({
      type: "REMOTE_INTENT_RECEIVED",
      entry: tail[0] as IntentLogEntry,
    });
    expect(store.getState().state.lastError?.reason).toBe("DUPLICATE_ENTRY");
    expect(
      store.getState().state.appliedEntries.filter((id) => id === "h1"),
    ).toHaveLength(1);
  });
});
