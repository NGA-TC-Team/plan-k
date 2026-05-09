/**
 * Unit tests for ssrf-guard.ts
 *
 * All SSRF policy tests run against the pure helpers (checkHostname,
 * isBlockedIPv4, isBlockedIPv6) and the integrated guardUrl function.
 * DNS-dependent tests use mock.module to stub dns/promises.lookup.
 */

import { mock } from "bun:test";

// Stub dns/promises BEFORE importing guardUrl so the module-level import
// in ssrf-guard.ts picks up the mock.
mock.module("node:dns/promises", () => ({
  lookup: async (hostname: string) => {
    const map: Record<string, string> = {
      "private-domain.internal": "10.0.0.50",
      "loopback-domain.example": "127.0.0.1",
      "link-local-domain.example": "169.254.169.254",
      "good-domain.example": "93.184.216.34", // example.com real IP
    };
    if (map[hostname]) return { address: map[hostname], family: 4 };
    // Simulate lookup failure for unknown test domains
    throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" });
  },
}));

import { describe, expect, it } from "bun:test";
import {
  checkHostname,
  type FetchLike,
  guardUrl,
  isBlockedIPv4,
  isBlockedIPv6,
  type SafeFetchErrorCode,
  SsrfError,
  type SsrfErrorCode,
  safeFetchSSRF,
} from "./ssrf-guard";

// ─── Helper: assert guardUrl throws with specific code ───────────────────────

async function assertGuardRejects(
  url: string,
  expectedCode: SsrfErrorCode,
): Promise<void> {
  try {
    await guardUrl(url);
    throw new Error(`Expected guardUrl to throw but it resolved for: ${url}`);
  } catch (err) {
    expect(err).toBeInstanceOf(SsrfError);
    expect((err as SsrfError).code).toBe(expectedCode);
  }
}

// ─── isBlockedIPv4 ────────────────────────────────────────────────────────────

describe("isBlockedIPv4", () => {
  it("blocks 127.0.0.1 (loopback)", () => {
    expect(isBlockedIPv4("127.0.0.1")).toBe(true);
  });

  it("blocks 127.255.255.255 (loopback /8 boundary)", () => {
    expect(isBlockedIPv4("127.255.255.255")).toBe(true);
  });

  it("blocks 10.0.0.1 (RFC1918 private /8)", () => {
    expect(isBlockedIPv4("10.0.0.1")).toBe(true);
  });

  it("blocks 10.255.255.255 (RFC1918 /8 boundary)", () => {
    expect(isBlockedIPv4("10.255.255.255")).toBe(true);
  });

  it("blocks 172.16.0.1 (RFC1918 private /12)", () => {
    expect(isBlockedIPv4("172.16.0.1")).toBe(true);
  });

  it("blocks 172.31.255.255 (RFC1918 /12 boundary)", () => {
    expect(isBlockedIPv4("172.31.255.255")).toBe(true);
  });

  it("does NOT block 172.32.0.1 (just outside /12)", () => {
    expect(isBlockedIPv4("172.32.0.1")).toBe(false);
  });

  it("blocks 192.168.1.1 (RFC1918 private /16)", () => {
    expect(isBlockedIPv4("192.168.1.1")).toBe(true);
  });

  it("blocks 169.254.169.254 (link-local / AWS metadata)", () => {
    expect(isBlockedIPv4("169.254.169.254")).toBe(true);
  });

  it("blocks 0.0.0.0 (unspecified)", () => {
    expect(isBlockedIPv4("0.0.0.0")).toBe(true);
  });

  it("does NOT block 93.184.216.34 (public IP)", () => {
    expect(isBlockedIPv4("93.184.216.34")).toBe(false);
  });

  it("does NOT block 8.8.8.8 (Google DNS)", () => {
    expect(isBlockedIPv4("8.8.8.8")).toBe(false);
  });

  it("returns false for non-IPv4 string", () => {
    expect(isBlockedIPv4("not-an-ip")).toBe(false);
  });
});

// ─── isBlockedIPv6 ────────────────────────────────────────────────────────────

describe("isBlockedIPv6", () => {
  it("blocks ::1 (loopback)", () => {
    expect(isBlockedIPv6("::1")).toBe(true);
  });

  it("blocks :: (unspecified)", () => {
    expect(isBlockedIPv6("::")).toBe(true);
  });

  it("blocks fe80::1 (link-local)", () => {
    expect(isBlockedIPv6("fe80::1")).toBe(true);
  });

  it("blocks fe80::abcd:1234 (link-local)", () => {
    expect(isBlockedIPv6("fe80::abcd:1234")).toBe(true);
  });

  it("blocks fc00::1 (unique-local /7)", () => {
    expect(isBlockedIPv6("fc00::1")).toBe(true);
  });

  it("blocks fd12:3456:789a::1 (unique-local /7 fd)", () => {
    expect(isBlockedIPv6("fd12:3456:789a::1")).toBe(true);
  });

  it("does NOT block 2001:db8::1 (documentation range, public-like)", () => {
    expect(isBlockedIPv6("2001:db8::1")).toBe(false);
  });

  it("handles bracketed IPv6 (URL.hostname format) — loopback", () => {
    expect(isBlockedIPv6("[::1]")).toBe(true);
  });

  it("handles bracketed IPv6 (URL.hostname format) — link-local", () => {
    expect(isBlockedIPv6("[fe80::1]")).toBe(true);
  });

  it("returns false for non-IPv6 string", () => {
    expect(isBlockedIPv6("not-ipv6")).toBe(false);
  });
});

// ─── checkHostname ────────────────────────────────────────────────────────────

describe("checkHostname", () => {
  it("blocks 'localhost'", () => {
    expect(checkHostname("localhost")).toBe("FORBIDDEN_HOST");
  });

  it("blocks 'LOCALHOST' (case-insensitive)", () => {
    expect(checkHostname("LOCALHOST")).toBe("FORBIDDEN_HOST");
  });

  it("blocks '*.localhost' suffix", () => {
    expect(checkHostname("evil.localhost")).toBe("FORBIDDEN_HOST");
  });

  it("blocks '*.local' suffix", () => {
    expect(checkHostname("printer.local")).toBe("FORBIDDEN_HOST");
  });

  it("blocks IPv4 loopback literal", () => {
    expect(checkHostname("127.0.0.1")).toBe("FORBIDDEN_HOST");
  });

  it("blocks IPv4 private literal", () => {
    expect(checkHostname("192.168.0.1")).toBe("FORBIDDEN_HOST");
  });

  it("blocks IPv6 loopback literal (with brackets)", () => {
    expect(checkHostname("[::1]")).toBe("FORBIDDEN_HOST");
  });

  it("blocks IPv6 link-local literal (with brackets)", () => {
    expect(checkHostname("[fe80::1]")).toBe("FORBIDDEN_HOST");
  });

  it("returns undefined for a public domain", () => {
    expect(checkHostname("example.com")).toBeUndefined();
  });

  it("returns undefined for a public IPv4 literal", () => {
    expect(checkHostname("93.184.216.34")).toBeUndefined();
  });
});

// ─── guardUrl — protocol rejection ───────────────────────────────────────────

describe("guardUrl — protocol rejection", () => {
  it("rejects 'file:///etc/passwd'", async () => {
    await assertGuardRejects("file:///etc/passwd", "UNSUPPORTED_PROTOCOL");
  });

  it("rejects 'data:image/png;base64,...'", async () => {
    await assertGuardRejects(
      "data:image/png;base64,abc",
      "UNSUPPORTED_PROTOCOL",
    );
  });

  it("rejects 'javascript:alert(1)'", async () => {
    await assertGuardRejects("javascript:alert(1)", "UNSUPPORTED_PROTOCOL");
  });

  it("rejects 'ftp://example.com/file'", async () => {
    await assertGuardRejects("ftp://example.com/file", "UNSUPPORTED_PROTOCOL");
  });
});

// ─── guardUrl — invalid URL ───────────────────────────────────────────────────

describe("guardUrl — invalid URL", () => {
  it("rejects bare string 'not-a-url'", async () => {
    await assertGuardRejects("not-a-url", "INVALID_URL");
  });

  it("rejects empty string", async () => {
    await assertGuardRejects("", "INVALID_URL");
  });
});

// ─── guardUrl — FORBIDDEN_HOST (IP literals, no DNS) ─────────────────────────

describe("guardUrl — FORBIDDEN_HOST (IP literals)", () => {
  it("rejects 'http://127.0.0.1/foo.png'", async () => {
    await assertGuardRejects("http://127.0.0.1/foo.png", "FORBIDDEN_HOST");
  });

  it("rejects 'http://localhost/foo.png'", async () => {
    await assertGuardRejects("http://localhost/foo.png", "FORBIDDEN_HOST");
  });

  it("rejects 'http://10.0.0.1/foo.png'", async () => {
    await assertGuardRejects("http://10.0.0.1/foo.png", "FORBIDDEN_HOST");
  });

  it("rejects 'http://172.16.0.1/foo.png'", async () => {
    await assertGuardRejects("http://172.16.0.1/foo.png", "FORBIDDEN_HOST");
  });

  it("rejects 'http://192.168.1.1/foo.png'", async () => {
    await assertGuardRejects("http://192.168.1.1/foo.png", "FORBIDDEN_HOST");
  });

  it("rejects 'http://169.254.169.254/latest/meta-data/' (AWS metadata)", async () => {
    await assertGuardRejects(
      "http://169.254.169.254/latest/meta-data/",
      "FORBIDDEN_HOST",
    );
  });

  it("rejects 'http://[::1]/foo.png'", async () => {
    await assertGuardRejects("http://[::1]/foo.png", "FORBIDDEN_HOST");
  });

  it("rejects 'http://[fe80::1]/foo.png'", async () => {
    await assertGuardRejects("http://[fe80::1]/foo.png", "FORBIDDEN_HOST");
  });
});

// ─── guardUrl — DNS rebinding / domain resolves to private IP ────────────────

describe("guardUrl — DNS resolves to private IP (mocked)", () => {
  it("rejects domain that resolves to 10.x private IP", async () => {
    await assertGuardRejects(
      "http://private-domain.internal/img.png",
      "FORBIDDEN_HOST",
    );
  });

  it("rejects domain that resolves to 127.x loopback", async () => {
    await assertGuardRejects(
      "http://loopback-domain.example/img.png",
      "FORBIDDEN_HOST",
    );
  });

  it("rejects domain that resolves to 169.254.x (link-local)", async () => {
    await assertGuardRejects(
      "http://link-local-domain.example/img.png",
      "FORBIDDEN_HOST",
    );
  });

  it("returns parsed URL for domain that resolves to public IP", async () => {
    const result = await guardUrl("https://good-domain.example/img.png");
    expect(result).toBeInstanceOf(URL);
    expect(result.hostname).toBe("good-domain.example");
  });
});

// ─── guardUrl — DNS_FAILURE ───────────────────────────────────────────────────

describe("guardUrl — DNS_FAILURE", () => {
  it("rejects unknown domain that fails DNS lookup", async () => {
    await assertGuardRejects(
      "https://this-domain-does-not-exist-xyz.example/img.png",
      "DNS_FAILURE",
    );
  });
});

// ─── safeFetchSSRF ────────────────────────────────────────────────────────────

/**
 * Build a minimal mock fetch that returns a controlled sequence of Responses.
 * Each call to the returned function pops the next entry from `responses`.
 * If the list is exhausted it throws to surface unexpected extra calls.
 */
function makeMockFetch(
  responses: Array<
    | { status: number; headers?: Record<string, string>; body?: string }
    | "abort"
    | "network-error"
  >,
): FetchLike {
  let idx = 0;
  return async (_input, _options) => {
    const entry = responses[idx++];
    if (entry === undefined) throw new Error("Unexpected extra fetch call");

    // Simulate an AbortSignal that is already aborted (timeout scenario).
    if (entry === "abort") {
      const err = new DOMException(
        "signal is aborted without reason",
        "AbortError",
      );
      throw err;
    }

    if (entry === "network-error") {
      throw new Error("fetch failed");
    }

    const { status, headers = {}, body = "" } = entry;
    return new Response(body, { status, headers });
  };
}

/** Assert safeFetchSSRF returns ok:false with the given code. */
async function assertSafeFetchFails(
  url: string,
  expectedCode: SafeFetchErrorCode,
  fetchImpl: FetchLike,
  opts?: { maxRedirects?: number },
): Promise<void> {
  const result = await safeFetchSSRF(url, { fetchImpl, ...opts });
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.code).toBe(expectedCode);
  }
}

describe("safeFetchSSRF", () => {
  // ── Happy path ────────────────────────────────────────────────────────────

  it("returns ok:true with finalUrl == input on 200 response", async () => {
    const fetchImpl = makeMockFetch([{ status: 200, body: "ok" }]);
    const result = await safeFetchSSRF("https://good-domain.example/img.png", {
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalUrl).toBe("https://good-domain.example/img.png");
      expect(result.response.status).toBe(200);
    }
  });

  it("follows 301 to same-domain path and returns updated finalUrl", async () => {
    const fetchImpl = makeMockFetch([
      {
        status: 301,
        headers: { location: "https://good-domain.example/new-path.png" },
      },
      { status: 200, body: "ok" },
    ]);
    const result = await safeFetchSSRF("https://good-domain.example/img.png", {
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalUrl).toBe("https://good-domain.example/new-path.png");
    }
  });

  it("resolves relative Location (/foo) against base URL", async () => {
    const fetchImpl = makeMockFetch([
      { status: 302, headers: { location: "/new/path.png" } },
      { status: 200, body: "ok" },
    ]);
    const result = await safeFetchSSRF("https://good-domain.example/img.png", {
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalUrl).toBe("https://good-domain.example/new/path.png");
    }
  });

  // ── Redirect to blocked destination ──────────────────────────────────────

  it("returns REDIRECT_FORBIDDEN when 302 → private IP (10.x)", async () => {
    // guardUrl will throw FORBIDDEN_HOST for 10.0.0.1 — no fetch call needed.
    const fetchImpl = makeMockFetch([
      { status: 302, headers: { location: "http://10.0.0.1/" } },
    ]);
    await assertSafeFetchFails(
      "https://good-domain.example/img.png",
      "REDIRECT_FORBIDDEN",
      fetchImpl,
    );
  });

  it("returns REDIRECT_FORBIDDEN when 302 → localhost", async () => {
    const fetchImpl = makeMockFetch([
      { status: 302, headers: { location: "http://localhost/secret" } },
    ]);
    await assertSafeFetchFails(
      "https://good-domain.example/img.png",
      "REDIRECT_FORBIDDEN",
      fetchImpl,
    );
  });

  // ── Redirect depth limit ──────────────────────────────────────────────────

  it("returns TOO_MANY_REDIRECTS after exceeding maxRedirects (5)", async () => {
    // 6 redirect responses (0-indexed 301s to the same safe URL).
    const redirectResponse = {
      status: 301,
      headers: { location: "https://good-domain.example/img.png" },
    };
    const fetchImpl = makeMockFetch([
      redirectResponse,
      redirectResponse,
      redirectResponse,
      redirectResponse,
      redirectResponse,
      redirectResponse, // 6th → hits cap
    ]);
    await assertSafeFetchFails(
      "https://good-domain.example/img.png",
      "TOO_MANY_REDIRECTS",
      fetchImpl,
    );
  });

  it("allows exactly maxRedirects hops then resolves", async () => {
    // With maxRedirects:1 — one redirect is allowed, second call returns 200.
    const fetchImpl = makeMockFetch([
      {
        status: 301,
        headers: { location: "https://good-domain.example/final.png" },
      },
      { status: 200, body: "ok" },
    ]);
    const result = await safeFetchSSRF("https://good-domain.example/img.png", {
      fetchImpl,
      maxRedirects: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalUrl).toBe("https://good-domain.example/final.png");
    }
  });

  // ── Timeout / network errors ──────────────────────────────────────────────

  it("returns FETCH_TIMEOUT when fetch throws AbortError", async () => {
    const fetchImpl = makeMockFetch(["abort"]);
    await assertSafeFetchFails(
      "https://good-domain.example/img.png",
      "FETCH_TIMEOUT",
      fetchImpl,
    );
  });

  it("returns FETCH_FAILED on network error", async () => {
    const fetchImpl = makeMockFetch(["network-error"]);
    await assertSafeFetchFails(
      "https://good-domain.example/img.png",
      "FETCH_FAILED",
      fetchImpl,
    );
  });

  // ── Non-2xx responses are passed through (guard's responsibility ends) ────

  it("returns ok:true for 4xx response (route handler decides)", async () => {
    const fetchImpl = makeMockFetch([{ status: 404, body: "not found" }]);
    const result = await safeFetchSSRF("https://good-domain.example/img.png", {
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.status).toBe(404);
    }
  });

  it("returns ok:true for 5xx response (route handler decides)", async () => {
    const fetchImpl = makeMockFetch([{ status: 503, body: "unavailable" }]);
    const result = await safeFetchSSRF("https://good-domain.example/img.png", {
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.status).toBe(503);
    }
  });

  // ── Initial URL guard failures propagate with original code ──────────────

  it("returns INVALID_URL for a malformed initial URL", async () => {
    const fetchImpl = makeMockFetch([]);
    await assertSafeFetchFails("not-a-url", "INVALID_URL", fetchImpl);
  });

  it("returns FORBIDDEN_HOST for initial URL pointing to private IP", async () => {
    const fetchImpl = makeMockFetch([]);
    await assertSafeFetchFails(
      "http://10.0.0.1/img.png",
      "FORBIDDEN_HOST",
      fetchImpl,
    );
  });
});
