import { describe, expect, it } from "bun:test";
import { wrap } from "./envelope";
import { deterministicIdFactory } from "./ids";

describe("envelope.wrap", () => {
  it("packages an intent with all envelope fields", () => {
    const ids = deterministicIdFactory();
    const entry = wrap(
      { type: "SELECT_NODE", nodeId: "b1" },
      {
        planId: "plan-1",
        origin: "human:t1",
        lamport: 5,
        now: () => 1700000000000,
        newId: ids.newEntryId,
      },
    );
    expect(entry.planId).toBe("plan-1");
    expect(entry.origin).toBe("human:t1");
    expect(entry.lamport).toBe(5);
    expect(entry.kind).toBe("primary");
    expect(entry.createdAt).toBe(1700000000000);
    expect(entry.intent).toEqual({ type: "SELECT_NODE", nodeId: "b1" });
    expect(entry.id).toBe("entry-1");
    expect(entry.parentEntryId).toBeUndefined();
  });

  it("supports inverse kind and parent linkage", () => {
    const ids = deterministicIdFactory();
    const entry = wrap(
      { type: "CANCEL_EDIT" },
      {
        planId: "plan-1",
        origin: "human:t1",
        lamport: 6,
        parentEntryId: "entry-original",
        kind: "inverse",
        now: () => 0,
        newId: ids.newEntryId,
      },
    );
    expect(entry.kind).toBe("inverse");
    expect(entry.parentEntryId).toBe("entry-original");
  });

  it("preserves the intent reference (callers must treat intents as immutable)", () => {
    const ids = deterministicIdFactory();
    const intent = { type: "SELECT_NODE", nodeId: "b1" } as const;
    const entry = wrap(intent, {
      planId: "p",
      origin: "o",
      lamport: 1,
      now: () => 0,
      newId: ids.newEntryId,
    });
    expect(entry.intent).toBe(intent);
  });
});
