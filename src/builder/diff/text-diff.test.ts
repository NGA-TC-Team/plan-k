import { expect, it } from "bun:test";
import { makeBlock } from "@/builder/fixtures";
import { diffBlockText, extractTextForDiff } from "./text-diff";

// 1. Empty before and after → single neutral part
it("empty before and after → empty diff", () => {
  const parts = diffBlockText("", "");
  // diffLines on two empty strings returns one part with empty string
  expect(parts.every((p) => !p.added && !p.removed)).toBe(true);
});

// 2. Multi-line addition
it("multi-line addition → added parts", () => {
  const before = "line one\n";
  const after = "line one\nline two\nline three\n";
  const parts = diffBlockText(before, after);
  const added = parts.filter((p) => p.added);
  expect(added.length).toBeGreaterThan(0);
  const addedText = added.map((p) => p.value).join("");
  expect(addedText).toContain("line two");
  expect(addedText).toContain("line three");
});

// 3. Multi-line removal
it("multi-line removal → removed parts", () => {
  const before = "line one\nline two\nline three\n";
  const after = "line one\n";
  const parts = diffBlockText(before, after);
  const removed = parts.filter((p) => p.removed);
  expect(removed.length).toBeGreaterThan(0);
  const removedText = removed.map((p) => p.value).join("");
  expect(removedText).toContain("line two");
});

// 4. Mixed: some added, some removed, some unchanged
it("mixed diff → has added, removed, and neutral parts", () => {
  const before = "unchanged\nold line\n";
  const after = "unchanged\nnew line\n";
  const parts = diffBlockText(before, after);
  expect(parts.some((p) => p.removed)).toBe(true);
  expect(parts.some((p) => p.added)).toBe(true);
  expect(parts.some((p) => !p.added && !p.removed)).toBe(true);
});

// 5. extractTextForDiff returns null for blocks with no text
it("extractTextForDiff returns null for image block (no text)", () => {
  const block = makeBlock("blk-img", "sec-1", "image", {
    src: "https://example.com/img.png",
  });
  const result = extractTextForDiff(block);
  expect(result).toBeNull();
});

// 6. extractTextForDiff returns text for heading block
it("extractTextForDiff returns text for heading block", () => {
  const block = makeBlock("blk-h", "sec-1", "heading", { text: "Hello World" });
  const result = extractTextForDiff(block);
  expect(result).toBe("Hello World");
});
