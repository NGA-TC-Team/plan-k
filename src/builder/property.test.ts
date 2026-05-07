import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { decide } from "./decider";
import { makeEmptyState, makeEntry } from "./fixtures";
import { deterministicIdFactory } from "./ids";
import { invertSelection } from "./inverse/selection";
import { apply } from "./reducer";
import { applySelection } from "./reducer/selection";
import { createBuilderStore, createInitialState } from "./store";
import type { Intent, IntentLogEntry } from "./types/intent";
import type { AppState } from "./types/state";

const BLOCK_IDS = ["b1", "b2", "b3", "b4"] as const;
const PARENT_IDS = ["s1", "b1", "b2", "b3", "b4"] as const;

type Op =
  | { kind: "insert"; id: string; parent: string }
  | { kind: "delete"; id: string }
  | { kind: "move"; id: string; toParent: string; index: number }
  | { kind: "update"; id: string; data: Record<string, unknown> };

const arbOp: fc.Arbitrary<Op> = fc.oneof(
  fc.record({
    kind: fc.constant("insert" as const),
    id: fc.constantFrom(...BLOCK_IDS),
    parent: fc.constantFrom(...PARENT_IDS),
  }),
  fc.record({
    kind: fc.constant("delete" as const),
    id: fc.constantFrom(...BLOCK_IDS),
  }),
  fc.record({
    kind: fc.constant("move" as const),
    id: fc.constantFrom(...BLOCK_IDS),
    toParent: fc.constantFrom(...PARENT_IDS),
    index: fc.integer({ min: 0, max: 3 }),
  }),
  fc.record({
    kind: fc.constant("update" as const),
    id: fc.constantFrom(...BLOCK_IDS),
    data: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 2 }),
      fc.integer({ min: 0, max: 9 }),
    ),
  }),
);

function opToIntent(op: Op): Intent {
  switch (op.kind) {
    case "insert":
      return {
        type: "INSERT_BLOCK",
        parentId: op.parent,
        block: { id: op.id, parentId: op.parent, kind: "text", data: {} },
      };
    case "delete":
      return { type: "DELETE_BLOCK", nodeId: op.id };
    case "move":
      return {
        type: "MOVE_BLOCK",
        nodeId: op.id,
        toParentId: op.toParent,
        index: op.index,
      };
    case "update":
      return { type: "UPDATE_BLOCK", nodeId: op.id, patch: { data: op.data } };
  }
}

function setupStoreWithScreen(): ReturnType<typeof createBuilderStore> {
  const ids = deterministicIdFactory();
  const initialState: AppState = {
    ...createInitialState("human:test"),
    screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
  };
  return createBuilderStore({
    planId: "p1",
    origin: "human:test",
    now: () => 1,
    newId: ids.newEntryId,
    initialState,
  });
}

function applyDirect(state: AppState, entry: IntentLogEntry): AppState {
  const decision = decide(state, entry);
  if (!decision.ok) return state;
  return apply(state, entry).state;
}

describe("property: normalization invariant after random sequences", () => {
  it("every children[parent] id exists in blocks or screens", () => {
    fc.assert(
      fc.property(fc.array(arbOp, { minLength: 1, maxLength: 30 }), (ops) => {
        const store = setupStoreWithScreen();
        for (const op of ops) store.getState().dispatch(opToIntent(op));
        const s = store.getState().state;
        for (const ids of Object.values(s.children)) {
          for (const id of ids) {
            expect(id in s.blocks || id in s.screens).toBe(true);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("every block's parentId points to a parent that still exists", () => {
    fc.assert(
      fc.property(fc.array(arbOp, { minLength: 1, maxLength: 30 }), (ops) => {
        const store = setupStoreWithScreen();
        for (const op of ops) store.getState().dispatch(opToIntent(op));
        const s = store.getState().state;
        for (const block of Object.values(s.blocks)) {
          expect(
            block.parentId in s.blocks || block.parentId in s.screens,
          ).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("no cycles: a block id never appears in its own ancestor chain", () => {
    fc.assert(
      fc.property(fc.array(arbOp, { minLength: 1, maxLength: 30 }), (ops) => {
        const store = setupStoreWithScreen();
        for (const op of ops) store.getState().dispatch(opToIntent(op));
        const s = store.getState().state;
        for (const block of Object.values(s.blocks)) {
          const seen = new Set<string>();
          let cursor: string | undefined = block.id;
          while (cursor) {
            if (seen.has(cursor)) {
              throw new Error(`cycle detected at ${cursor}`);
            }
            seen.add(cursor);
            const parent: string | undefined = s.blocks[cursor]?.parentId;
            if (parent === undefined) break;
            if (parent in s.screens) break;
            cursor = parent;
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe("property: Lamport monotonicity", () => {
  it("each dispatch yields a non-decreasing Lamport", () => {
    fc.assert(
      fc.property(fc.array(arbOp, { minLength: 1, maxLength: 20 }), (ops) => {
        const store = setupStoreWithScreen();
        let prev = store.getState().state.lamport;
        for (const op of ops) {
          store.getState().dispatch(opToIntent(op));
          const cur = store.getState().state.lamport;
          expect(cur).toBeGreaterThanOrEqual(prev);
          prev = cur;
        }
      }),
      { numRuns: 50 },
    );
  });
});

describe("property: REMOTE_INTENT_RECEIVED idempotency", () => {
  it("re-receiving the same remote entry leaves block state unchanged from one apply", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BLOCK_IDS),
        fc.string({ minLength: 1, maxLength: 8 }),
        fc.integer({ min: 1, max: 100 }),
        (blockId, entryId, lamport) => {
          const remoteEntry: IntentLogEntry = {
            id: entryId,
            planId: "p1",
            origin: "human:other",
            lamport,
            intent: {
              type: "INSERT_BLOCK",
              parentId: "s1",
              block: { id: blockId, parentId: "s1", kind: "text", data: {} },
            },
            createdAt: 0,
            kind: "primary",
          };
          const oneShot = setupStoreWithScreen();
          oneShot
            .getState()
            .dispatch({ type: "REMOTE_INTENT_RECEIVED", entry: remoteEntry });
          const after1 = oneShot.getState().state;

          const twoShot = setupStoreWithScreen();
          twoShot
            .getState()
            .dispatch({ type: "REMOTE_INTENT_RECEIVED", entry: remoteEntry });
          twoShot
            .getState()
            .dispatch({ type: "REMOTE_INTENT_RECEIVED", entry: remoteEntry });
          const after2 = twoShot.getState().state;

          expect(after2.blocks[blockId]).toEqual(after1.blocks[blockId]);
          expect(after2.children.s1).toEqual(after1.children.s1);
          expect(
            after2.appliedEntries.filter((id) => id === entryId),
          ).toHaveLength(1);
        },
      ),
      { numRuns: 50 },
    );
  });
});

describe("property: selection slice inverse round-trip", () => {
  const arbInitial = fc.option(fc.constantFrom(...BLOCK_IDS), { nil: null });
  const arbTarget = fc.option(fc.constantFrom(...BLOCK_IDS), { nil: null });

  it("apply(forward) then apply(inverse) restores selection", () => {
    fc.assert(
      fc.property(arbInitial, arbTarget, (initialId, targetId) => {
        const blocks = Object.fromEntries(
          BLOCK_IDS.map((id) => [
            id,
            { id, parentId: "s1", kind: "text" as const, data: {} },
          ]),
        );
        const prev: AppState = makeEmptyState({
          screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
          blocks,
          children: { s1: [...BLOCK_IDS] },
          selection: initialId
            ? { kind: "node", id: initialId }
            : { kind: "none" },
        });
        const forwardEntry = makeEntry({
          type: "SELECT_NODE",
          nodeId: targetId,
        });
        const after = applySelection(prev, forwardEntry);
        if (!after) return;
        const inv = invertSelection(forwardEntry, prev);
        if (!inv) return;
        const restored = applySelection(after.state, makeEntry(inv));
        expect(restored?.state.selection).toEqual(prev.selection);
      }),
      { numRuns: 50 },
    );
  });
});

describe("property: LWW convergence on UPDATE_BLOCK", () => {
  it("two UPDATE_BLOCKs on same id: final block matches the entry with higher (lamport, origin)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 0, max: 999 }),
        fc.integer({ min: 0, max: 999 }),
        (l1, l2, v1, v2) => {
          fc.pre(l1 !== l2);
          const initial: AppState = makeEmptyState({
            screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
            blocks: {
              b1: { id: "b1", parentId: "s1", kind: "text", data: { v: 0 } },
            },
            children: { s1: ["b1"] },
            entityMeta: { b1: { lamport: 0, origin: "seed" } },
          });
          const e1: IntentLogEntry = {
            id: "e1",
            planId: "p1",
            origin: "human:a",
            lamport: l1,
            intent: {
              type: "UPDATE_BLOCK",
              nodeId: "b1",
              patch: { data: { v: v1 } },
            },
            createdAt: 0,
            kind: "primary",
          };
          const e2: IntentLogEntry = {
            id: "e2",
            planId: "p1",
            origin: "human:b",
            lamport: l2,
            intent: {
              type: "UPDATE_BLOCK",
              nodeId: "b1",
              patch: { data: { v: v2 } },
            },
            createdAt: 0,
            kind: "primary",
          };
          const stateAB = applyDirect(applyDirect(initial, e1), e2);
          const stateBA = applyDirect(applyDirect(initial, e2), e1);

          const expected = l1 > l2 ? v1 : v2;
          expect(stateAB.blocks.b1?.data).toEqual({ v: expected });
          expect(stateBA.blocks.b1?.data).toEqual({ v: expected });
          expect(stateAB.blocks.b1?.data).toEqual(stateBA.blocks.b1?.data);
        },
      ),
      { numRuns: 100 },
    );
  });
});
