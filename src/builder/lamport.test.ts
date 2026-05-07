import { describe, expect, it } from "bun:test";
import { compareStamps, isStrictlyGreater, merge, tick } from "./lamport";

describe("lamport.tick", () => {
  it("increments by 1", () => {
    expect(tick(0)).toBe(1);
    expect(tick(7)).toBe(8);
  });
});

describe("lamport.merge", () => {
  it("returns max(local, incoming) + 1", () => {
    expect(merge(3, 5)).toBe(6);
    expect(merge(5, 3)).toBe(6);
    expect(merge(5, 5)).toBe(6);
    expect(merge(0, 0)).toBe(1);
  });
});

describe("lamport.compareStamps", () => {
  it("orders by lamport first", () => {
    expect(
      compareStamps({ lamport: 1, origin: "a" }, { lamport: 2, origin: "a" }),
    ).toBe(-1);
    expect(
      compareStamps({ lamport: 3, origin: "a" }, { lamport: 1, origin: "a" }),
    ).toBe(1);
  });

  it("tiebreaks by origin in lex order", () => {
    expect(
      compareStamps({ lamport: 1, origin: "a" }, { lamport: 1, origin: "b" }),
    ).toBe(-1);
    expect(
      compareStamps({ lamport: 1, origin: "b" }, { lamport: 1, origin: "a" }),
    ).toBe(1);
  });

  it("returns 0 only on full equality", () => {
    expect(
      compareStamps({ lamport: 1, origin: "a" }, { lamport: 1, origin: "a" }),
    ).toBe(0);
  });
});

describe("lamport.isStrictlyGreater", () => {
  it("respects total order strictly", () => {
    expect(
      isStrictlyGreater(
        { lamport: 2, origin: "a" },
        { lamport: 1, origin: "z" },
      ),
    ).toBe(true);
    expect(
      isStrictlyGreater(
        { lamport: 1, origin: "b" },
        { lamport: 1, origin: "a" },
      ),
    ).toBe(true);
    expect(
      isStrictlyGreater(
        { lamport: 1, origin: "a" },
        { lamport: 1, origin: "a" },
      ),
    ).toBe(false);
    expect(
      isStrictlyGreater(
        { lamport: 1, origin: "a" },
        { lamport: 1, origin: "b" },
      ),
    ).toBe(false);
  });
});
