import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "./fixtures";
import type { HistoryFrame } from "./types/state";
import { HISTORY_DEPTH_DEFAULT, popRedo, popUndo, recordHistory } from "./undo";

function frame(id: string): HistoryFrame {
  return {
    entry: makeEntry({ type: "SELECT_NODE", nodeId: id }, { id: `e-${id}` }),
    inverse: { type: "SELECT_NODE", nodeId: null },
  };
}

describe("recordHistory", () => {
  it("appends a frame to the past stack", () => {
    const next = recordHistory(makeEmptyState(), frame("a"));
    expect(next.historyPast.map((f) => f.entry.id)).toEqual(["e-a"]);
    expect(next.historyFuture).toEqual([]);
  });

  it("clears the future stack on any new record", () => {
    const seeded = makeEmptyState({ historyFuture: [frame("ghost")] });
    const next = recordHistory(seeded, frame("a"));
    expect(next.historyFuture).toEqual([]);
  });

  it("enforces the default depth (100), trimming oldest frames", () => {
    let s = makeEmptyState();
    for (let i = 0; i < HISTORY_DEPTH_DEFAULT + 5; i++) {
      s = recordHistory(s, frame(`x${i}`));
    }
    expect(s.historyPast.length).toBe(HISTORY_DEPTH_DEFAULT);
    expect(s.historyPast[0]?.entry.id).toBe("e-x5");
    expect(s.historyPast.at(-1)?.entry.id).toBe(
      `e-x${HISTORY_DEPTH_DEFAULT + 4}`,
    );
  });

  it("respects a custom depth", () => {
    let s = makeEmptyState();
    for (let i = 0; i < 5; i++) s = recordHistory(s, frame(`x${i}`), 3);
    expect(s.historyPast.length).toBe(3);
  });
});

describe("popUndo", () => {
  it("returns null when the past stack is empty", () => {
    expect(popUndo(makeEmptyState())).toBeNull();
  });

  it("moves the top frame from past to future", () => {
    const seeded = recordHistory(
      recordHistory(makeEmptyState(), frame("a")),
      frame("b"),
    );
    const undone = popUndo(seeded);
    expect(undone?.frame.entry.id).toBe("e-b");
    expect(undone?.state.historyPast.map((f) => f.entry.id)).toEqual(["e-a"]);
    expect(undone?.state.historyFuture.map((f) => f.entry.id)).toEqual(["e-b"]);
  });
});

describe("popRedo", () => {
  it("returns null when the future stack is empty", () => {
    expect(popRedo(makeEmptyState())).toBeNull();
  });

  it("moves the top frame from future back to past", () => {
    const seeded = recordHistory(
      recordHistory(makeEmptyState(), frame("a")),
      frame("b"),
    );
    const undone = popUndo(seeded);
    if (!undone) throw new Error("popUndo returned null");
    const redone = popRedo(undone.state);
    expect(redone?.frame.entry.id).toBe("e-b");
    expect(redone?.state.historyPast.map((f) => f.entry.id)).toEqual([
      "e-a",
      "e-b",
    ]);
    expect(redone?.state.historyFuture).toEqual([]);
  });
});

describe("recordHistory after undo", () => {
  it("clears the future stack so redo is invalidated by a new action", () => {
    const seeded = recordHistory(
      recordHistory(makeEmptyState(), frame("a")),
      frame("b"),
    );
    const undone = popUndo(seeded);
    if (!undone) throw new Error("popUndo returned null");
    expect(undone.state.historyFuture).toHaveLength(1);
    const branched = recordHistory(undone.state, frame("c"));
    expect(branched.historyFuture).toEqual([]);
    expect(branched.historyPast.map((f) => f.entry.id)).toEqual(["e-a", "e-c"]);
  });
});
