import { describe, expect, it } from "bun:test";
import { defaultIdFactory, deterministicIdFactory } from "./ids";

describe("ids.defaultIdFactory", () => {
  it("yields globally unique entry ids", () => {
    const f = defaultIdFactory();
    const set = new Set(Array.from({ length: 100 }, () => f.newEntryId()));
    expect(set.size).toBe(100);
  });

  it("namespaces origin id by label", () => {
    const f = defaultIdFactory();
    expect(f.newOriginId("human")).toMatch(/^human:[\w-]+$/);
    expect(f.newOriginId("claude")).toMatch(/^claude:[\w-]+$/);
  });
});

describe("ids.deterministicIdFactory", () => {
  it("yields a predictable monotonic sequence", () => {
    const f = deterministicIdFactory();
    expect(f.newEntryId()).toBe("entry-1");
    expect(f.newEntryId()).toBe("entry-2");
    expect(f.newOriginId("human")).toBe("human:3");
    expect(f.newOriginId("claude")).toBe("claude:4");
  });

  it("respects seed offset", () => {
    const f = deterministicIdFactory(10);
    expect(f.newEntryId()).toBe("entry-11");
  });
});
