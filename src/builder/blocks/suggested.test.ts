import { describe, expect, it } from "bun:test";
import { BLOCK_KIND_REGISTRY } from "@/builder/defaults";
import type { BlockKind } from "@/builder/types/entity";
import { getSuggestedKinds } from "./suggested";

const registryKinds = new Set<BlockKind>(BLOCK_KIND_REGISTRY.map((s) => s.kind));

describe("getSuggestedKinds", () => {
  it("docs: returns 4–6 entries", () => {
    const result = getSuggestedKinds("docs");
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it("app: returns 4–6 entries", () => {
    const result = getSuggestedKinds("app");
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it("agent: returns empty array (out of scope for PR-C)", () => {
    expect(getSuggestedKinds("agent")).toEqual([]);
  });

  it("all returned kinds exist in BLOCK_KIND_REGISTRY", () => {
    for (const ctx of ["docs", "app"] as const) {
      for (const item of getSuggestedKinds(ctx)) {
        expect(registryKinds.has(item.kind)).toBe(true);
      }
    }
  });

  it("each entry has non-empty label and description", () => {
    for (const ctx of ["docs", "app"] as const) {
      for (const item of getSuggestedKinds(ctx)) {
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.description.length).toBeGreaterThan(0);
      }
    }
  });

  it("docs: contains heading and paragraph (Prose group first)", () => {
    const kinds = getSuggestedKinds("docs").map((s) => s.kind);
    expect(kinds).toContain("heading");
    expect(kinds).toContain("paragraph");
  });

  it("app: contains hero and form (key layout kinds)", () => {
    const kinds = getSuggestedKinds("app").map((s) => s.kind);
    expect(kinds).toContain("hero");
    expect(kinds).toContain("form");
  });

  it("no duplicate kinds within a context", () => {
    for (const ctx of ["docs", "app"] as const) {
      const kinds = getSuggestedKinds(ctx).map((s) => s.kind);
      expect(new Set(kinds).size).toBe(kinds.length);
    }
  });

  it("icon field equals kind (used as BLOCK_ICONS lookup key)", () => {
    for (const ctx of ["docs", "app"] as const) {
      for (const item of getSuggestedKinds(ctx)) {
        expect(item.icon).toBe(item.kind);
      }
    }
  });
});
