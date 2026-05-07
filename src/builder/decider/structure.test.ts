import { describe, expect, it } from "bun:test";
import { makeBlock, makeEmptyState, makeEntry, withBlocks } from "../fixtures";
import { decideStructure } from "./structure";

const screenState = (extra: Parameters<typeof makeEmptyState>[0] = {}) =>
  makeEmptyState({
    screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
    ...extra,
  });

describe("decideStructure.INSERT_BLOCK", () => {
  it("returns null for unrelated intent", () => {
    expect(
      decideStructure(makeEmptyState(), makeEntry({ type: "UNDO" })),
    ).toBeNull();
  });

  it("rejects with NOT_FOUND when parent is missing", () => {
    const out = decideStructure(
      makeEmptyState(),
      makeEntry({
        type: "INSERT_BLOCK",
        parentId: "ghost",
        block: makeBlock("b1", "ghost"),
      }),
    );
    expect(out).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("accepts insert under an existing screen", () => {
    const out = decideStructure(
      screenState(),
      makeEntry({
        type: "INSERT_BLOCK",
        parentId: "s1",
        block: makeBlock("b1", "s1"),
      }),
    );
    expect(out).toEqual({ ok: true });
  });

  it("rejects re-insert with non-greater Lamport (STALE_LAMPORT)", () => {
    const state = withBlocks(screenState(), [{ id: "b1", parentId: "s1" }]);
    const stateWithMeta = {
      ...state,
      entityMeta: { b1: { lamport: 5, origin: "human:a" } },
    };
    const out = decideStructure(
      stateWithMeta,
      makeEntry(
        {
          type: "INSERT_BLOCK",
          parentId: "s1",
          block: makeBlock("b1", "s1"),
        },
        { lamport: 5, origin: "human:a" },
      ),
    );
    expect(out).toEqual({ ok: false, reason: "STALE_LAMPORT" });
  });
});

describe("decideStructure.MOVE_BLOCK", () => {
  it("rejects with NOT_FOUND when nodeId missing", () => {
    const out = decideStructure(
      screenState(),
      makeEntry({
        type: "MOVE_BLOCK",
        nodeId: "ghost",
        toParentId: "s1",
        index: 0,
      }),
    );
    expect(out).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("rejects with NOT_FOUND when toParentId missing", () => {
    const state = withBlocks(screenState(), [{ id: "b1", parentId: "s1" }]);
    const out = decideStructure(
      state,
      makeEntry({
        type: "MOVE_BLOCK",
        nodeId: "b1",
        toParentId: "ghost",
        index: 0,
      }),
    );
    expect(out).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("rejects with CYCLIC_MOVE when moving into self", () => {
    const state = withBlocks(screenState(), [{ id: "b1", parentId: "s1" }]);
    const out = decideStructure(
      state,
      makeEntry({
        type: "MOVE_BLOCK",
        nodeId: "b1",
        toParentId: "b1",
        index: 0,
      }),
    );
    expect(out).toEqual({ ok: false, reason: "CYCLIC_MOVE" });
  });

  it("rejects with CYCLIC_MOVE when moving into descendant", () => {
    const state = withBlocks(screenState(), [
      { id: "b1", parentId: "s1" },
      { id: "b2", parentId: "b1" },
      { id: "b3", parentId: "b2" },
    ]);
    const out = decideStructure(
      state,
      makeEntry({
        type: "MOVE_BLOCK",
        nodeId: "b1",
        toParentId: "b3",
        index: 0,
      }),
    );
    expect(out).toEqual({ ok: false, reason: "CYCLIC_MOVE" });
  });

  it("accepts a valid move", () => {
    const state = withBlocks(screenState(), [
      { id: "b1", parentId: "s1" },
      { id: "b2", parentId: "s1" },
    ]);
    const out = decideStructure(
      state,
      makeEntry({
        type: "MOVE_BLOCK",
        nodeId: "b2",
        toParentId: "b1",
        index: 0,
      }),
    );
    expect(out).toEqual({ ok: true });
  });
});

describe("decideStructure.DELETE_BLOCK / UPDATE_BLOCK", () => {
  it("DELETE rejects missing", () => {
    const out = decideStructure(
      screenState(),
      makeEntry({ type: "DELETE_BLOCK", nodeId: "ghost" }),
    );
    expect(out).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("UPDATE rejects missing", () => {
    const out = decideStructure(
      screenState(),
      makeEntry({ type: "UPDATE_BLOCK", nodeId: "ghost", patch: {} }),
    );
    expect(out).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("UPDATE rejects with STALE_LAMPORT against a higher meta", () => {
    const state = withBlocks(screenState(), [{ id: "b1", parentId: "s1" }]);
    const stateWithMeta = {
      ...state,
      entityMeta: { b1: { lamport: 10, origin: "human:z" } },
    };
    const out = decideStructure(
      stateWithMeta,
      makeEntry(
        { type: "UPDATE_BLOCK", nodeId: "b1", patch: { data: { x: 1 } } },
        { lamport: 5, origin: "human:a" },
      ),
    );
    expect(out).toEqual({ ok: false, reason: "STALE_LAMPORT" });
  });

  it("UPDATE accepts when stamp is strictly greater", () => {
    const state = withBlocks(screenState(), [{ id: "b1", parentId: "s1" }]);
    const stateWithMeta = {
      ...state,
      entityMeta: { b1: { lamport: 5, origin: "human:a" } },
    };
    const out = decideStructure(
      stateWithMeta,
      makeEntry(
        { type: "UPDATE_BLOCK", nodeId: "b1", patch: { data: { x: 1 } } },
        { lamport: 6, origin: "human:a" },
      ),
    );
    expect(out).toEqual({ ok: true });
  });
});

describe("decideStructure.context validation", () => {
  const sectionState = (
    extra: Parameters<typeof makeEmptyState>[0] = {},
    sectionKind: "overview" | "agent-examples" = "overview",
  ) =>
    makeEmptyState({
      sections: {
        sec1: {
          id: "sec1",
          planId: "p1",
          parentId: null,
          kind: sectionKind,
          title: "Sec",
        },
      },
      ...extra,
    });

  it("accepts a docs block under a non-agent section", () => {
    const out = decideStructure(
      sectionState(),
      makeEntry({
        type: "INSERT_BLOCK",
        parentId: "sec1",
        block: {
          id: "b1",
          parentId: "sec1",
          kind: "text",
          data: {},
          context: "docs",
        },
      }),
    );
    expect(out).toEqual({ ok: true });
  });

  it("rejects an app block under a section (WRONG_MODE)", () => {
    const out = decideStructure(
      sectionState(),
      makeEntry({
        type: "INSERT_BLOCK",
        parentId: "sec1",
        block: {
          id: "b1",
          parentId: "sec1",
          kind: "hero",
          data: {},
          context: "app",
        },
      }),
    );
    expect(out).toEqual({ ok: false, reason: "WRONG_MODE" });
  });

  it("rejects a docs block under a screen (WRONG_MODE)", () => {
    const screen = makeEmptyState({
      screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
    });
    const out = decideStructure(
      screen,
      makeEntry({
        type: "INSERT_BLOCK",
        parentId: "s1",
        block: {
          id: "b1",
          parentId: "s1",
          kind: "text",
          data: {},
          context: "docs",
        },
      }),
    );
    expect(out).toEqual({ ok: false, reason: "WRONG_MODE" });
  });

  it("accepts an agent block under an agent-* section", () => {
    const out = decideStructure(
      sectionState({}, "agent-examples"),
      makeEntry({
        type: "INSERT_BLOCK",
        parentId: "sec1",
        block: {
          id: "b1",
          parentId: "sec1",
          kind: "agent-step",
          data: {},
          context: "agent",
        },
      }),
    );
    expect(out).toEqual({ ok: true });
  });

  it("rejects a docs block under an agent-* section (WRONG_MODE)", () => {
    const out = decideStructure(
      sectionState({}, "agent-examples"),
      makeEntry({
        type: "INSERT_BLOCK",
        parentId: "sec1",
        block: {
          id: "b1",
          parentId: "sec1",
          kind: "text",
          data: {},
          context: "docs",
        },
      }),
    );
    expect(out).toEqual({ ok: false, reason: "WRONG_MODE" });
  });

  it("MOVE rejects relocating an app block under a section", () => {
    const screen = makeEmptyState({
      screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
      sections: {
        sec1: {
          id: "sec1",
          planId: "p1",
          parentId: null,
          kind: "overview",
          title: "Sec",
        },
      },
    });
    const state = withBlocks(screen, [{ id: "b1", parentId: "s1" }]); // makeBlock defaults context "app"
    const out = decideStructure(
      state,
      makeEntry({
        type: "MOVE_BLOCK",
        nodeId: "b1",
        toParentId: "sec1",
        index: 0,
      }),
    );
    expect(out).toEqual({ ok: false, reason: "WRONG_MODE" });
  });
});
