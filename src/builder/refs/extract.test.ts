import { describe, expect, test } from "bun:test";
import { collectStrings, extractRefs, refRowId } from "./extract";

describe("collectStrings", () => {
  test("walks strings out of nested objects/arrays", () => {
    const data = {
      title: "hello",
      body: { text: "world", parts: ["one", { sub: "two" }] },
      count: 7,
      flag: true,
    };
    expect(collectStrings(data).sort()).toEqual([
      "hello",
      "one",
      "two",
      "world",
    ]);
  });

  test("ignores non-string leaves and null", () => {
    expect(collectStrings({ a: 1, b: null, c: undefined, d: false })).toEqual(
      [],
    );
  });
});

describe("extractRefs", () => {
  test("parses [[id]] as embed", () => {
    const refs = extractRefs({ body: "see [[block:abc-1]] for details" });
    expect(refs).toEqual([{ kind: "embed", dstId: "block:abc-1" }]);
  });

  test("parses @id as mention", () => {
    const refs = extractRefs({ body: "asked @persona:khan to review" });
    expect(refs).toEqual([{ kind: "mention", dstId: "persona:khan" }]);
  });

  test("dedupes repeated tokens within and across strings", () => {
    const refs = extractRefs({
      a: "[[section:s1]] [[section:s1]]",
      b: ["@persona:p1", "@persona:p1"],
      c: "[[section:s1]]",
    });
    expect(refs).toEqual([
      { kind: "embed", dstId: "section:s1" },
      { kind: "mention", dstId: "persona:p1" },
    ]);
  });

  test("ignores plain @words and email-like tokens", () => {
    const refs = extractRefs({
      body: "email khan@nextgenai.kr or talk to @khan in #channel",
    });
    expect(refs).toEqual([]);
  });

  test("requires prefix-encoded id for embed", () => {
    expect(extractRefs({ body: "[[abc-1]]" })).toEqual([]);
    expect(extractRefs({ body: "[[block:abc-1]]" })).toEqual([
      { kind: "embed", dstId: "block:abc-1" },
    ]);
  });

  test("captures both kinds in mixed text", () => {
    const refs = extractRefs({
      body: "@persona:p1 wrote [[block:b2]] referencing @screen:home",
    });
    expect(refs).toEqual([
      { kind: "embed", dstId: "block:b2" },
      { kind: "mention", dstId: "persona:p1" },
      { kind: "mention", dstId: "screen:home" },
    ]);
  });
});

describe("refRowId", () => {
  test("is deterministic per (src, kind, dst)", () => {
    expect(refRowId("block:s", "mention", "persona:p")).toBe(
      "block:s::mention::persona:p",
    );
    expect(refRowId("block:s", "mention", "persona:p")).toBe(
      refRowId("block:s", "mention", "persona:p"),
    );
  });
});
