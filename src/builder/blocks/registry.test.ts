import { describe, expect, it } from "bun:test";
import { BLOCK_KIND_REGISTRY } from "@/builder/defaults";
import type { BlockKind } from "@/builder/types/entity";
import {
  blockKindsForContext,
  blockManifests,
  defaultDataFor,
  manifestFor,
  summaryFor,
} from "./registry";

describe("blockManifests", () => {
  it("covers every kind that BLOCK_KIND_REGISTRY references", () => {
    const fromRegistry = new Set(BLOCK_KIND_REGISTRY.map((s) => s.kind));
    const fromManifests = new Set(Object.keys(blockManifests) as BlockKind[]);
    expect(fromManifests).toEqual(fromRegistry);
  });

  it("has a schema, defaults and label for every kind", () => {
    for (const kind of Object.keys(blockManifests) as BlockKind[]) {
      const m = manifestFor(kind);
      expect(m.schema).toBeDefined();
      expect(m.defaults).toBeDefined();
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.group.length).toBeGreaterThan(0);
    }
  });

  it("schema parses its own defaults (round-trip)", () => {
    for (const kind of Object.keys(blockManifests) as BlockKind[]) {
      const m = manifestFor(kind);
      const parsed = m.schema.safeParse(m.defaults);
      expect({
        kind,
        ok: parsed.success,
        error: parsed.success ? undefined : parsed.error.message,
      }).toEqual({ kind, ok: true, error: undefined });
    }
  });

  it("defaultDataFor returns a fresh clone each call", () => {
    const a = defaultDataFor("hero");
    const b = defaultDataFor("hero");
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("summaryFor returns a string for every kind", () => {
    for (const kind of Object.keys(blockManifests) as BlockKind[]) {
      const summary = summaryFor(kind, defaultDataFor(kind));
      expect(typeof summary).toBe("string");
    }
  });

  it("blockKindsForContext respects platform gating", () => {
    const mobileOnly = Object.values(blockManifests).filter(
      (m) => m.platform === "mobile",
    );
    const webApp = blockKindsForContext("app", "web");
    const mobileApp = blockKindsForContext("app", "mobile");
    for (const m of mobileOnly) {
      expect(webApp.find((s) => s.kind === m.kind)).toBeUndefined();
      expect(mobileApp.find((s) => s.kind === m.kind)).toBeDefined();
    }
  });
});
