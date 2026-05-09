import { describe, expect, it } from "bun:test";
import { isInDarkWindow } from "./time-window";

describe("isInDarkWindow", () => {
  // ── Wrapping window (18–7, crosses midnight) ──────────────────────────────

  it("returns true when hour is after start (wrapping, evening)", () => {
    expect(isInDarkWindow(20, 18, 7)).toBe(true);
  });

  it("returns true at exactly start hour (wrapping)", () => {
    expect(isInDarkWindow(18, 18, 7)).toBe(true);
  });

  it("returns false for midday hour outside dark window (wrapping)", () => {
    expect(isInDarkWindow(12, 18, 7)).toBe(false);
  });

  it("returns true for midnight / early morning (wrapping, wrap branch)", () => {
    expect(isInDarkWindow(0, 18, 7)).toBe(true);
  });

  it("returns true for hour just before end (wrapping)", () => {
    expect(isInDarkWindow(6, 18, 7)).toBe(true);
  });

  it("returns false at exactly end hour (end is exclusive, wrapping)", () => {
    expect(isInDarkWindow(7, 18, 7)).toBe(false);
  });

  it("returns false for hour just after end (wrapping)", () => {
    expect(isInDarkWindow(8, 18, 7)).toBe(false);
  });

  // ── Non-wrapping window (9–17, daytime) ───────────────────────────────────

  it("returns true for hour inside non-wrapping window", () => {
    expect(isInDarkWindow(15, 9, 17)).toBe(true);
  });

  it("returns true at exactly start hour (non-wrapping)", () => {
    expect(isInDarkWindow(9, 9, 17)).toBe(true);
  });

  it("returns false at exactly end hour (non-wrapping, end exclusive)", () => {
    expect(isInDarkWindow(17, 9, 17)).toBe(false);
  });

  it("returns false before start (non-wrapping)", () => {
    expect(isInDarkWindow(8, 9, 17)).toBe(false);
  });

  it("returns false after end (non-wrapping)", () => {
    expect(isInDarkWindow(18, 9, 17)).toBe(false);
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it("returns false when start === end (degenerate, no window)", () => {
    expect(isInDarkWindow(12, 12, 12)).toBe(false);
  });
});
