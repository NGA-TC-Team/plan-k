/**
 * Unit tests for MediaUsagePopover helper logic.
 *
 * React Testing Library is not in this codebase, so we test the pure
 * formatBacklinkLabel() helper that drives list rendering.
 * Visual/interaction behaviour is covered by manual smoke-testing.
 */

import { describe, expect, test } from "bun:test";
import type { BacklinkRow } from "@/data/plans/backlinks";
import { formatBacklinkLabel } from "./usage-popover";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<BacklinkRow> = {}): BacklinkRow {
  return {
    srcId: "block-abc",
    kind: "media",
    label: "Hero image block",
    path: ["Page 1", "Section A"],
    ...overrides,
  };
}

// ─── formatBacklinkLabel ──────────────────────────────────────────────────────

describe("formatBacklinkLabel", () => {
  test("returns label and joined path for a normal row", () => {
    const result = formatBacklinkLabel(makeRow());
    expect(result.label).toBe("Hero image block");
    expect(result.path).toBe("Page 1 › Section A");
  });

  test("falls back to srcId when label is empty string", () => {
    const result = formatBacklinkLabel(makeRow({ label: "" }));
    expect(result.label).toBe("block-abc");
  });

  test("returns empty path string when path array is empty", () => {
    const result = formatBacklinkLabel(makeRow({ path: [] }));
    expect(result.path).toBe("");
  });

  test("handles single-segment path without separator", () => {
    const result = formatBacklinkLabel(makeRow({ path: ["Page 1"] }));
    expect(result.path).toBe("Page 1");
  });

  test("handles three-segment path with two separators", () => {
    const result = formatBacklinkLabel(
      makeRow({ path: ["Page 1", "Section A", "Sub-section"] }),
    );
    expect(result.path).toBe("Page 1 › Section A › Sub-section");
  });
});
