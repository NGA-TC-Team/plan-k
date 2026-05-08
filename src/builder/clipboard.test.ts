import { describe, expect, it } from "bun:test";
import { intentsForPaste, serializeBlocks } from "./clipboard";
import { makeEmptyState, withBlocks } from "./fixtures";

describe("clipboard", () => {
  it("serializes single block with no children", () => {
    const state = withBlocks(makeEmptyState(), [{ id: "a", parentId: "s1" }]);
    const payload = serializeBlocks(state, ["a"], "test");
    expect(payload).not.toBeNull();
    expect(payload?.roots).toHaveLength(1);
    expect(payload?.roots[0]?.block.id).toBe("a");
    expect(payload?.roots[0]?.children).toHaveLength(0);
  });

  it("serializes nested children", () => {
    const state = withBlocks(makeEmptyState(), [
      { id: "p", parentId: "s1" },
      { id: "c1", parentId: "p" },
      { id: "c2", parentId: "p" },
    ]);
    const payload = serializeBlocks(state, ["p"], "test");
    expect(payload?.roots[0]?.children.map((n) => n.block.id)).toEqual([
      "c1",
      "c2",
    ]);
  });

  it("drops descendants when an ancestor is also selected", () => {
    const state = withBlocks(makeEmptyState(), [
      { id: "p", parentId: "s1" },
      { id: "c", parentId: "p" },
    ]);
    const payload = serializeBlocks(state, ["p", "c"], "test");
    expect(payload?.roots).toHaveLength(1);
    expect(payload?.roots[0]?.block.id).toBe("p");
  });

  it("orders multi-root payload by sibling order", () => {
    const state = withBlocks(makeEmptyState(), [
      { id: "a", parentId: "s1" },
      { id: "b", parentId: "s1" },
      { id: "c", parentId: "s1" },
    ]);
    const payload = serializeBlocks(state, ["c", "a"], "test");
    expect(payload?.roots.map((r) => r.block.id)).toEqual(["a", "c"]);
  });

  it("intentsForPaste regenerates ids and remaps parents", () => {
    const state = withBlocks(makeEmptyState(), [
      { id: "p", parentId: "s1" },
      { id: "c", parentId: "p" },
    ]);
    const payload = serializeBlocks(state, ["p"], "test");
    expect(payload).not.toBeNull();
    if (!payload) return;
    let n = 0;
    const intents = intentsForPaste(payload, "target", 0, () => `new-${++n}`);
    expect(intents.length).toBe(2);
    expect(intents[0]).toMatchObject({
      type: "INSERT_BLOCK",
      parentId: "target",
      block: { id: "new-1", parentId: "target" },
    });
    expect(intents[1]).toMatchObject({
      type: "INSERT_BLOCK",
      parentId: "new-1",
      block: { id: "new-2", parentId: "new-1" },
    });
  });
});
