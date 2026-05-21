import { describe, expect, it } from "bun:test";
import {
  FALLBACK_SPACING_DEFAULTS,
  migrateLegacySpacing,
  resolveSpacingPx,
  resolveSpacingStyle,
} from "./spacing";

// ─────────────────────────────────────────────────────────────────
// resolveSpacingPx
// ─────────────────────────────────────────────────────────────────
describe("resolveSpacingPx", () => {
  it("maps preset tokens to the canonical px values", () => {
    expect(resolveSpacingPx("none")).toBe(0);
    expect(resolveSpacingPx("sm")).toBe(4);
    expect(resolveSpacingPx("md")).toBe(8);
    expect(resolveSpacingPx("lg")).toBe(16);
    expect(resolveSpacingPx("xl")).toBe(24);
  });

  it("returns raw number as-is", () => {
    expect(resolveSpacingPx(0)).toBe(0);
    expect(resolveSpacingPx(10)).toBe(10);
    expect(resolveSpacingPx(512)).toBe(512);
  });

  it("returns undefined for undefined input", () => {
    expect(resolveSpacingPx(undefined)).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// migrateLegacySpacing
// ─────────────────────────────────────────────────────────────────
describe("migrateLegacySpacing", () => {
  it("returns undefined for undefined input", () => {
    expect(migrateLegacySpacing(undefined)).toBeUndefined();
  });

  it("returns undefined for an empty object", () => {
    expect(migrateLegacySpacing({})).toBeUndefined();
  });

  it("expands legacy padding shorthand to all 4 sides", () => {
    const result = migrateLegacySpacing({ padding: "md" });
    expect(result).toEqual({
      paddingTop: "md",
      paddingRight: "md",
      paddingBottom: "md",
      paddingLeft: "md",
    });
  });

  it("does not overwrite existing 4-side keys with legacy padding", () => {
    const result = migrateLegacySpacing({
      padding: "md",
      paddingTop: "lg", // explicit — wins over shorthand
      paddingBottom: "sm", // explicit — wins over shorthand
    });
    expect(result?.paddingTop).toBe("lg");
    expect(result?.paddingBottom).toBe("sm");
    // sides without explicit override get the shorthand value
    expect(result?.paddingRight).toBe("md");
    expect(result?.paddingLeft).toBe("md");
  });

  it("preserves existing 4-side marginTop/marginBottom without legacy shorthand", () => {
    const result = migrateLegacySpacing({
      marginTop: "sm",
      marginBottom: "lg",
    });
    expect(result).toEqual({ marginTop: "sm", marginBottom: "lg" });
  });

  it("handles partial 4-side definition correctly", () => {
    const result = migrateLegacySpacing({
      paddingTop: 12,
      marginRight: 8,
    });
    expect(result).toEqual({ paddingTop: 12, marginRight: 8 });
  });

  it("handles numeric px values alongside token-based legacy padding", () => {
    const result = migrateLegacySpacing({
      padding: "sm",
      paddingLeft: 20,
    });
    expect(result?.paddingTop).toBe("sm");
    expect(result?.paddingRight).toBe("sm");
    expect(result?.paddingBottom).toBe("sm");
    expect(result?.paddingLeft).toBe(20); // explicit numeric wins
  });

  it("drops the legacy `padding` key from the output", () => {
    const result = migrateLegacySpacing({ padding: "lg" });
    expect(result).not.toHaveProperty("padding");
  });

  it("handles all 8 sides set explicitly (no legacy key)", () => {
    const input = {
      paddingTop: 4,
      paddingRight: 8,
      paddingBottom: 4,
      paddingLeft: 8,
      marginTop: "sm" as const,
      marginRight: 0,
      marginBottom: "md" as const,
      marginLeft: 0,
    };
    const result = migrateLegacySpacing(input);
    expect(result).toEqual(input);
  });
});

// ─────────────────────────────────────────────────────────────────
// resolveSpacingStyle
// ─────────────────────────────────────────────────────────────────
describe("resolveSpacingStyle", () => {
  const defaults = FALLBACK_SPACING_DEFAULTS; // padding=md(8), marginTop=sm(4), marginBottom=sm(4)

  it("falls back to defaults when override is undefined", () => {
    const style = resolveSpacingStyle(undefined, defaults);
    expect(style.paddingTop).toBe(8);
    expect(style.paddingRight).toBe(8);
    expect(style.paddingBottom).toBe(8);
    expect(style.paddingLeft).toBe(8);
    expect(style.marginTop).toBe(4);
    expect(style.marginRight).toBe(0);
    expect(style.marginBottom).toBe(4);
    expect(style.marginLeft).toBe(0);
  });

  it("applies 4-side override over defaults", () => {
    const style = resolveSpacingStyle(
      { paddingTop: "xl", paddingBottom: 12, marginTop: "none" },
      defaults,
    );
    expect(style.paddingTop).toBe(24); // xl
    expect(style.paddingRight).toBe(8); // defaults.padding=md
    expect(style.paddingBottom).toBe(12); // raw px
    expect(style.paddingLeft).toBe(8); // defaults.padding=md
    expect(style.marginTop).toBe(0); // none
    expect(style.marginBottom).toBe(4); // defaults.marginBottom=sm
  });

  it("migrates legacy padding shorthand before resolving", () => {
    const style = resolveSpacingStyle({ padding: "lg" }, defaults);
    // lg=16 for all 4 padding sides
    expect(style.paddingTop).toBe(16);
    expect(style.paddingRight).toBe(16);
    expect(style.paddingBottom).toBe(16);
    expect(style.paddingLeft).toBe(16);
    // margin untouched → defaults
    expect(style.marginTop).toBe(4);
    expect(style.marginBottom).toBe(4);
  });
});
