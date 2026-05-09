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
  guardUrl,
  isBlockedIPv4,
  isBlockedIPv6,
  SsrfError,
  type SsrfErrorCode,
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
