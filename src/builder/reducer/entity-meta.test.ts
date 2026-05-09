import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import { invertEntityMeta } from "../inverse/entity-meta";
import type { AgentNode, BlockEntity, ScreenEntity } from "../types/entity";
import { applyEntityMeta } from "./entity-meta";

// ---------------------------------------------------------------------------
// Minimal entity factories for presence checks
// ---------------------------------------------------------------------------

const makeSection = (id: string) => ({
  id,
  planId: "p1",
  parentId: null as null,
  kind: "custom" as const,
  title: id,
});

const makeBlock = (id: string): BlockEntity => ({
  id,
  parentId: "screen-1",
  kind: "text",
  data: {},
  context: "app",
});

const makeScreen = (id: string): ScreenEntity => ({
  id,
  planId: "p1",
  title: id,
});

const makeAgentNode = (id: string): AgentNode => ({
  id,
  role: "llm",
  label: id,
  data: {},
});

// ---------------------------------------------------------------------------
// applyEntityMeta — reducer tests
// ---------------------------------------------------------------------------

describe("applyEntityMeta.UPDATE_ENTITY_META", () => {
  it("sets status on a section that did not have one", () => {
    const state = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
    });
    const out = applyEntityMeta(
      state,
      makeEntry({
        type: "UPDATE_ENTITY_META",
        entityId: "sec1",
        patch: { status: "in-progress" },
      }),
    );
    expect(out?.state.entityMeta.sec1?.status).toBe("in-progress");
  });

  it("updates lamport+origin on every change", () => {
    const state = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
    });
    const out = applyEntityMeta(
      state,
      makeEntry(
        {
          type: "UPDATE_ENTITY_META",
          entityId: "sec1",
          patch: { status: "approved" },
        },
        { lamport: 42, origin: "human:alice" },
      ),
    );
    expect(out?.state.entityMeta.sec1?.lamport).toBe(42);
    expect(out?.state.entityMeta.sec1?.origin).toBe("human:alice");
  });

  it("null status removes the field", () => {
    const state = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
      entityMeta: {
        sec1: { lamport: 1, origin: "human:test", status: "pending" },
      },
    });
    const out = applyEntityMeta(
      state,
      makeEntry({
        type: "UPDATE_ENTITY_META",
        entityId: "sec1",
        patch: { status: null },
      }),
    );
    expect(out?.state.entityMeta.sec1).not.toHaveProperty("status");
  });

  it("tags array is replaced wholesale and deduplicated", () => {
    const state = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
      entityMeta: {
        sec1: { lamport: 1, origin: "human:test", tags: ["a", "b"] },
      },
    });
    const out = applyEntityMeta(
      state,
      makeEntry({
        type: "UPDATE_ENTITY_META",
        entityId: "sec1",
        patch: { tags: ["c", "c", "d"] },
      }),
    );
    expect(out?.state.entityMeta.sec1?.tags).toEqual(["c", "d"]);
  });

  it("noop on unknown entityId", () => {
    const state = makeEmptyState();
    const out = applyEntityMeta(
      state,
      makeEntry({
        type: "UPDATE_ENTITY_META",
        entityId: "does-not-exist",
        patch: { status: "approved" },
      }),
    );
    expect(out).toBeNull();
  });

  it("ignores unrelated intents", () => {
    const state = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
    });
    const out = applyEntityMeta(
      state,
      makeEntry({ type: "SELECT_NODE", nodeId: "sec1" }),
    );
    expect(out).toBeNull();
  });

  it("preserves other entityMeta fields when patching only one", () => {
    const state = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
      entityMeta: {
        sec1: {
          lamport: 5,
          origin: "human:test",
          status: "pending",
          assignee: "alice",
          tags: ["x"],
        },
      },
    });
    const out = applyEntityMeta(
      state,
      makeEntry({
        type: "UPDATE_ENTITY_META",
        entityId: "sec1",
        patch: { status: "approved" },
      }),
    );
    const meta = out?.state.entityMeta.sec1;
    expect(meta?.status).toBe("approved");
    expect(meta?.assignee).toBe("alice");
    expect(meta?.tags).toEqual(["x"]);
  });

  it("works for blocks — presence verified by entityMeta key update", () => {
    const state = makeEmptyState({
      blocks: { blk1: makeBlock("blk1") },
    });
    const out = applyEntityMeta(
      state,
      makeEntry({
        type: "UPDATE_ENTITY_META",
        entityId: "blk1",
        patch: { assignee: "bob", dueDate: 1_700_000_000_000 },
      }),
    );
    expect(out?.state.entityMeta.blk1?.assignee).toBe("bob");
    expect(out?.state.entityMeta.blk1?.dueDate).toBe(1_700_000_000_000);
  });

  it("works for screens", () => {
    const state = makeEmptyState({
      screens: { scr1: makeScreen("scr1") },
    });
    const out = applyEntityMeta(
      state,
      makeEntry({
        type: "UPDATE_ENTITY_META",
        entityId: "scr1",
        patch: { tags: ["ui", "home"] },
      }),
    );
    expect(out?.state.entityMeta.scr1?.tags).toEqual(["ui", "home"]);
  });

  it("works for agentNodes", () => {
    const state = makeEmptyState({
      agentNodes: { ag1: makeAgentNode("ag1") },
    });
    const out = applyEntityMeta(
      state,
      makeEntry({
        type: "UPDATE_ENTITY_META",
        entityId: "ag1",
        patch: { status: "rejected" },
      }),
    );
    expect(out?.state.entityMeta.ag1?.status).toBe("rejected");
  });

  it("sets viewModeOverride on a section", () => {
    const state = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
    });
    const out = applyEntityMeta(
      state,
      makeEntry({
        type: "UPDATE_ENTITY_META",
        entityId: "sec1",
        patch: { viewModeOverride: "wireframe" },
      }),
    );
    expect(out?.state.entityMeta.sec1?.viewModeOverride).toBe("wireframe");
  });

  it("null viewModeOverride removes the field", () => {
    const state = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
      entityMeta: {
        sec1: {
          lamport: 1,
          origin: "human:test",
          viewModeOverride: "wireframe",
        },
      },
    });
    const out = applyEntityMeta(
      state,
      makeEntry({
        type: "UPDATE_ENTITY_META",
        entityId: "sec1",
        patch: { viewModeOverride: null },
      }),
    );
    expect(out?.state.entityMeta.sec1).not.toHaveProperty("viewModeOverride");
  });

  it("viewModeOverride does not affect other entityMeta fields", () => {
    const state = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
      entityMeta: {
        sec1: {
          lamport: 3,
          origin: "human:test",
          status: "in-progress",
          assignee: "alice",
        },
      },
    });
    const out = applyEntityMeta(
      state,
      makeEntry({
        type: "UPDATE_ENTITY_META",
        entityId: "sec1",
        patch: { viewModeOverride: "detail" },
      }),
    );
    const meta = out?.state.entityMeta.sec1;
    expect(meta?.viewModeOverride).toBe("detail");
    expect(meta?.status).toBe("in-progress");
    expect(meta?.assignee).toBe("alice");
  });

  it("tags empty array is preserved (explicit clear, not deleted)", () => {
    const state = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
      entityMeta: {
        sec1: { lamport: 1, origin: "human:test", tags: ["a", "b"] },
      },
    });
    const out = applyEntityMeta(
      state,
      makeEntry({
        type: "UPDATE_ENTITY_META",
        entityId: "sec1",
        patch: { tags: [] },
      }),
    );
    // Empty array preserved — not deleted from the record.
    expect(out?.state.entityMeta.sec1?.tags).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// invertEntityMeta — inverse tests
// ---------------------------------------------------------------------------

describe("invertEntityMeta", () => {
  it("round-trips status set → null (unset) → set", () => {
    const before = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
      // No prior status
    });
    const forward = makeEntry({
      type: "UPDATE_ENTITY_META",
      entityId: "sec1",
      patch: { status: "in-progress" },
    });
    const inv = invertEntityMeta(forward, before);
    expect(inv).toEqual({
      type: "UPDATE_ENTITY_META",
      entityId: "sec1",
      patch: { status: null },
    });

    // Apply forward then inverse to verify round-trip.
    const after = applyEntityMeta(before, forward);
    if (!after) throw new Error("forward apply failed");
    expect(after.state.entityMeta.sec1?.status).toBe("in-progress");

    const reverted = applyEntityMeta(after.state, makeEntry(inv as never));
    expect(reverted?.state.entityMeta.sec1).not.toHaveProperty("status");
  });

  it("round-trips tags array swap", () => {
    const before = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
      entityMeta: {
        sec1: { lamport: 1, origin: "human:test", tags: ["alpha", "beta"] },
      },
    });
    const forward = makeEntry({
      type: "UPDATE_ENTITY_META",
      entityId: "sec1",
      patch: { tags: ["gamma"] },
    });
    const inv = invertEntityMeta(forward, before);
    expect(inv).toMatchObject({
      type: "UPDATE_ENTITY_META",
      entityId: "sec1",
      patch: { tags: ["alpha", "beta"] },
    });

    const after = applyEntityMeta(before, forward);
    if (!after) throw new Error("forward apply failed");
    const reverted = applyEntityMeta(after.state, makeEntry(inv as never));
    expect(reverted?.state.entityMeta.sec1?.tags).toEqual(["alpha", "beta"]);
  });

  it("preserves assignee/dueDate when only status changed", () => {
    const before = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
      entityMeta: {
        sec1: {
          lamport: 2,
          origin: "human:test",
          status: "pending",
          assignee: "carol",
          dueDate: 9999,
        },
      },
    });
    const forward = makeEntry({
      type: "UPDATE_ENTITY_META",
      entityId: "sec1",
      patch: { status: "approved" },
    });
    const inv = invertEntityMeta(forward, before);
    // Only status should be in inverse patch; assignee/dueDate not touched.
    expect(inv).toEqual({
      type: "UPDATE_ENTITY_META",
      entityId: "sec1",
      patch: { status: "pending" },
    });

    const after = applyEntityMeta(before, forward);
    if (!after) throw new Error("forward apply failed");
    const reverted = applyEntityMeta(after.state, makeEntry(inv as never));
    const meta = reverted?.state.entityMeta.sec1;
    expect(meta?.status).toBe("pending");
    expect(meta?.assignee).toBe("carol");
    expect(meta?.dueDate).toBe(9999);
  });

  it("round-trips viewModeOverride set → null (unset)", () => {
    const before = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
    });
    const forward = makeEntry({
      type: "UPDATE_ENTITY_META",
      entityId: "sec1",
      patch: { viewModeOverride: "wireframe" },
    });
    const inv = invertEntityMeta(forward, before);
    // Prior had no override → inverse should null it out.
    expect(inv).toEqual({
      type: "UPDATE_ENTITY_META",
      entityId: "sec1",
      patch: { viewModeOverride: null },
    });

    const after = applyEntityMeta(before, forward);
    if (!after) throw new Error("forward apply failed");
    expect(after.state.entityMeta.sec1?.viewModeOverride).toBe("wireframe");

    const reverted = applyEntityMeta(after.state, makeEntry(inv as never));
    expect(reverted?.state.entityMeta.sec1).not.toHaveProperty(
      "viewModeOverride",
    );
  });

  it("round-trips viewModeOverride change (detail → wireframe)", () => {
    const before = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
      entityMeta: {
        sec1: {
          lamport: 2,
          origin: "human:test",
          viewModeOverride: "detail",
        },
      },
    });
    const forward = makeEntry({
      type: "UPDATE_ENTITY_META",
      entityId: "sec1",
      patch: { viewModeOverride: "wireframe" },
    });
    const inv = invertEntityMeta(forward, before);
    expect(inv).toEqual({
      type: "UPDATE_ENTITY_META",
      entityId: "sec1",
      patch: { viewModeOverride: "detail" },
    });

    const after = applyEntityMeta(before, forward);
    if (!after) throw new Error("forward apply failed");
    const reverted = applyEntityMeta(after.state, makeEntry(inv as never));
    expect(reverted?.state.entityMeta.sec1?.viewModeOverride).toBe("detail");
  });

  it("returns null for unrelated intents", () => {
    const out = invertEntityMeta(makeEntry({ type: "UNDO" }), makeEmptyState());
    expect(out).toBeNull();
  });
});
