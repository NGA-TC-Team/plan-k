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

describe("layout manifest", () => {
  it("layout manifest exists in blockManifests", () => {
    expect(blockManifests.layout).toBeDefined();
  });

  it("layout manifest has correct schema keys (mode, cols, gap)", () => {
    const m = manifestFor("layout");
    const shape = (m.schema as { shape?: Record<string, unknown> }).shape;
    expect(shape).toBeDefined();
    expect(shape?.mode).toBeDefined();
    expect(shape?.cols).toBeDefined();
    expect(shape?.gap).toBeDefined();
  });

  it("layout defaults parse correctly via schema", () => {
    const m = manifestFor("layout");
    const parsed = m.schema.safeParse(m.defaults);
    expect(parsed.success).toBe(true);
  });

  it("layout manifest default mode is vstack and gap is md", () => {
    const defaults = defaultDataFor("layout");
    expect(defaults.mode).toBe("vstack");
    expect(defaults.gap).toBe("md");
    expect(defaults.cols).toBeUndefined();
  });

  it("layout schema rejects invalid mode", () => {
    const m = manifestFor("layout");
    const result = m.schema.safeParse({ mode: "diagonal", gap: "md" });
    expect(result.success).toBe(false);
  });

  it("layout schema rejects cols out of range (0 and 7)", () => {
    const m = manifestFor("layout");
    expect(
      m.schema.safeParse({ mode: "grid", gap: "sm", cols: 0 }).success,
    ).toBe(false);
    expect(
      m.schema.safeParse({ mode: "grid", gap: "sm", cols: 7 }).success,
    ).toBe(false);
  });

  it("layout schema accepts boundary cols (1 and 6)", () => {
    const m = manifestFor("layout");
    expect(
      m.schema.safeParse({ mode: "grid", gap: "sm", cols: 1 }).success,
    ).toBe(true);
    expect(
      m.schema.safeParse({ mode: "grid", gap: "sm", cols: 6 }).success,
    ).toBe(true);
  });

  it("layout appears in docs context registry", () => {
    const docsKinds = blockKindsForContext("docs");
    expect(docsKinds.find((s) => s.kind === "layout")).toBeDefined();
  });

  it("layout appears in app context registry", () => {
    const appKinds = blockKindsForContext("app");
    expect(appKinds.find((s) => s.kind === "layout")).toBeDefined();
  });

  it("layout summaryFor returns a string", () => {
    const summary = summaryFor("layout", defaultDataFor("layout"));
    expect(typeof summary).toBe("string");
    expect(summary.length).toBeGreaterThan(0);
  });
});
