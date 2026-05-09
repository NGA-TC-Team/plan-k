import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry, withBlocks } from "../fixtures";
import { decideSelection } from "./selection";

describe("decideSelection", () => {
  it("returns null for unrelated intent (slice composition)", () => {
    const out = decideSelection(
      makeEmptyState(),
      makeEntry({ type: "COMMIT_EDIT" }),
    );
    expect(out).toBeNull();
  });

  it("accepts select on existing block", () => {
    const state = withBlocks(makeEmptyState(), [{ id: "b1", parentId: "s1" }]);
    const out = decideSelection(
      state,
      makeEntry({ type: "SELECT_NODE", nodeId: "b1" }),
    );
    expect(out).toEqual({ ok: true });
  });

  it("rejects select on missing node with NOT_FOUND", () => {
    const out = decideSelection(
      makeEmptyState(),
      makeEntry({ type: "SELECT_NODE", nodeId: "ghost" }),
    );
    expect(out).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("accepts deselect (nodeId=null) regardless of state", () => {
    expect(
      decideSelection(
        makeEmptyState(),
        makeEntry({ type: "SELECT_NODE", nodeId: null }),
      ),
    ).toEqual({ ok: true });
  });

  it("accepts select on screen id", () => {
    const state = makeEmptyState({
      screens: { s1: { id: "s1", planId: "p1", title: "Home" } },
    });
    const out = decideSelection(
      state,
      makeEntry({ type: "SELECT_NODE", nodeId: "s1" }),
    );
    expect(out).toEqual({ ok: true });
  });

  it("accepts select on agent node id", () => {
    const state = makeEmptyState({
      agentNodes: { n1: { id: "n1", role: "input", label: "Start", data: {} } },
    });
    const out = decideSelection(
      state,
      makeEntry({ type: "SELECT_NODE", nodeId: "n1" }),
    );
    expect(out).toEqual({ ok: true });
  });

  it("accepts select on section id", () => {
    const state = makeEmptyState({
      sections: {
        sec1: {
          id: "sec1",
          planId: "p1",
          parentId: null,
          kind: "overview" as const,
          title: "Overview",
        },
      },
    });
    const out = decideSelection(
      state,
      makeEntry({ type: "SELECT_NODE", nodeId: "sec1" }),
    );
    expect(out).toEqual({ ok: true });
  });
});
