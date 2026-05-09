import { describe, expect, it } from "bun:test";
import { mediaRefToUrl, useMediaUrl } from "./use-media-url.hook";

// Both the hook and the pure helper share the same logic. Tests run against
// mediaRefToUrl (no React runtime needed) plus a smoke-check that useMediaUrl
// returns identical results.

describe("mediaRefToUrl", () => {
  it("converts media: ref to /api/media/<id>/raw", () => {
    expect(mediaRefToUrl("media:abc123")).toBe("/api/media/abc123/raw");
  });

  it("converts a longer media id correctly", () => {
    expect(mediaRefToUrl("media:med_abc123def456")).toBe(
      "/api/media/med_abc123def456/raw",
    );
  });

  it("passes through an https URL unchanged", () => {
    expect(mediaRefToUrl("https://x.com/y.png")).toBe("https://x.com/y.png");
  });

  it("passes through an http URL unchanged", () => {
    expect(mediaRefToUrl("http://example.com/img.jpg")).toBe(
      "http://example.com/img.jpg",
    );
  });

  it("returns undefined for undefined input", () => {
    expect(mediaRefToUrl(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(mediaRefToUrl("")).toBeUndefined();
  });

  it("returns undefined for malformed media: with empty id segment", () => {
    expect(mediaRefToUrl("media:")).toBeUndefined();
  });

  it("passes through media: ref with slash-containing id as-is (documents opaque-id behaviour)", () => {
    // mediaRefToUrl does NOT sanitise the id segment — it trusts the caller to
    // supply a valid DB id. A slash in the id produces a multi-segment path
    // (`/api/media/foo/bar/raw`), which the raw route handler will 404 on.
    // This test pins the current behaviour so any future path-segment
    // sanitisation becomes a conscious, tested change.
    expect(mediaRefToUrl("media:foo/bar")).toBe("/api/media/foo/bar/raw");
  });
});

// useMediaUrl is a thin wrapper around mediaRefToUrl — no React state involved.
// Biome's useHookAtTopLevel rule fires when hook-named functions are called
// inside loops or conditionals. We test each case individually to satisfy it.
describe("useMediaUrl (hook wrapper)", () => {
  it("media: ref → /api/media/.../raw", () => {
    expect(useMediaUrl("media:abc")).toBe(mediaRefToUrl("media:abc"));
  });

  it("https URL → unchanged", () => {
    expect(useMediaUrl("https://x.com/y.png")).toBe(
      mediaRefToUrl("https://x.com/y.png"),
    );
  });

  it("undefined → undefined", () => {
    expect(useMediaUrl(undefined)).toBe(mediaRefToUrl(undefined));
  });

  it("empty string → undefined", () => {
    expect(useMediaUrl("")).toBe(mediaRefToUrl(""));
  });

  it("media: with empty id → undefined", () => {
    expect(useMediaUrl("media:")).toBe(mediaRefToUrl("media:"));
  });
});
