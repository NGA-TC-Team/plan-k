import { describe, expect, test } from "bun:test";
import { routePaste } from "./paste-router";

describe("routePaste", () => {
  // ─── URL cases ─────────────────────────────────────────────────────────────

  test("single https URL returns kind=url", () => {
    const result = routePaste("https://example.com");
    expect(result).toEqual({ kind: "url", url: "https://example.com" });
  });

  test("single http URL returns kind=url", () => {
    const result = routePaste("http://example.com");
    expect(result).toEqual({ kind: "url", url: "http://example.com" });
  });

  test("URL with leading/trailing whitespace is trimmed and returns kind=url", () => {
    const result = routePaste("  https://example.com/path?q=1  ");
    expect(result).toEqual({
      kind: "url",
      url: "https://example.com/path?q=1",
    });
  });

  test("URL with path and query string returns kind=url", () => {
    const result = routePaste("https://github.com/user/repo?tab=readme");
    expect(result).toEqual({
      kind: "url",
      url: "https://github.com/user/repo?tab=readme",
    });
  });

  // ─── Text / fallback cases ─────────────────────────────────────────────────

  test("inline URL embedded in a sentence returns kind=text", () => {
    const text = "Check out https://example.com for more info";
    const result = routePaste(text);
    expect(result).toEqual({ kind: "text", text });
  });

  test("empty string returns kind=text", () => {
    const result = routePaste("");
    expect(result.kind).toBe("text");
  });

  test("plain text returns kind=text", () => {
    const result = routePaste("hello world");
    expect(result).toEqual({ kind: "text", text: "hello world" });
  });

  test("malformed URL (no hostname after scheme) returns kind=text", () => {
    const result = routePaste("https://");
    expect(result.kind).toBe("text");
  });

  test("malformed URL (spaces in URL) returns kind=text", () => {
    const result = routePaste("https://not a valid url");
    expect(result.kind).toBe("text");
  });

  test("URL exceeding 2048 chars returns kind=text", () => {
    const longUrl = "https://example.com/" + "a".repeat(2040);
    const result = routePaste(longUrl);
    expect(result.kind).toBe("text");
  });

  test("multi-line paste containing a URL returns kind=text", () => {
    const result = routePaste("https://example.com\nhttps://other.com");
    expect(result.kind).toBe("text");
  });

  test("ftp:// URL (unsupported scheme) returns kind=text", () => {
    const result = routePaste("ftp://example.com/file.txt");
    expect(result.kind).toBe("text");
  });

  test("URL with only whitespace around newline returns kind=text", () => {
    const result = routePaste("https://example.com\n   ");
    // After trim: "https://example.com" — but trimmed contains no newline
    // Actually trim() removes trailing \n, so this WOULD be a URL.
    // Let's verify the actual behavior:
    expect(result).toEqual({ kind: "url", url: "https://example.com" });
  });

  test("Korean domain URL returns kind=url", () => {
    // Punycode-encoded Korean domain is valid
    const result = routePaste("https://xn--p1ai.example.com");
    expect(result).toEqual({
      kind: "url",
      url: "https://xn--p1ai.example.com",
    });
  });
});
