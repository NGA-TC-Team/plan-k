import { describe, expect, it } from "bun:test";
import { parseBoolParam } from "./utils";

describe("parseBoolParam", () => {
  it("returns defaultVal for null", () => {
    expect(parseBoolParam(null, true)).toBe(true);
    expect(parseBoolParam(null, false)).toBe(false);
  });

  it("returns defaultVal for undefined", () => {
    expect(parseBoolParam(undefined, true)).toBe(true);
    expect(parseBoolParam(undefined, false)).toBe(false);
  });

  it("returns false for string 'false'", () => {
    expect(parseBoolParam("false", true)).toBe(false);
  });

  it("returns true for string 'true'", () => {
    expect(parseBoolParam("true", false)).toBe(true);
  });

  it("returns true for empty string (forgiving)", () => {
    expect(parseBoolParam("", false)).toBe(true);
  });

  it("returns true for string '0' (forgiving)", () => {
    expect(parseBoolParam("0", false)).toBe(true);
  });

  it("returns false for array ['false']", () => {
    expect(parseBoolParam(["false"], true)).toBe(false);
  });

  it("returns defaultVal for empty array", () => {
    expect(parseBoolParam([], true)).toBe(true);
    expect(parseBoolParam([], false)).toBe(false);
  });

  it("uses first element of array", () => {
    expect(parseBoolParam(["true", "false"], false)).toBe(true);
    expect(parseBoolParam(["false", "true"], true)).toBe(false);
  });
});
