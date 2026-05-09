/**
 * SSRF guard utilities for the from-url media fetch route.
 *
 * All functions are pure (no I/O side effects) except `resolveAndGuardHost`
 * which performs a DNS lookup. Exported individually for unit testing.
 *
 * Threat model:
 *  - Prevent Server-Side Request Forgery by refusing requests to:
 *    loopback, private, link-local, and unspecified addresses.
 *  - Protocol whitelist: only http: and https: are allowed.
 *  - DNS rebinding 1st-pass defense: resolve the hostname once before fetch
 *    and apply the same IP checks. TOCTOU gap (DNS could change between
 *    lookup and connect) is acknowledged as a v1 limitation — full mitigation
 *    requires post-connect peer-IP inspection at OS/socket level.
 */

import { lookup } from "node:dns/promises";

// ─── Error code type ──────────────────────────────────────────────────────────

export type SsrfErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_PROTOCOL"
  | "FORBIDDEN_HOST"
  | "DNS_FAILURE";

export class SsrfError extends Error {
  constructor(
    public readonly code: SsrfErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SsrfError";
  }
}

// ─── Protocol whitelist ───────────────────────────────────────────────────────

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

// ─── IPv4 range checkers ──────────────────────────────────────────────────────

/**
 * Parse a dotted-decimal IPv4 string into a 32-bit unsigned integer.
 * Returns undefined if the string is not a valid IPv4 address.
 */
function parseIPv4(ip: string): number | undefined {
  const parts = ip.split(".");
  if (parts.length !== 4) return undefined;
  let n = 0;
  for (const part of parts) {
    // Each octet must be a non-negative integer 0–255 with no leading zeros.
    if (!/^\d+$/.test(part)) return undefined;
    const octet = Number(part);
    if (octet < 0 || octet > 255) return undefined;
    n = (n << 8) | octet;
  }
  // Ensure unsigned 32-bit.
  return n >>> 0;
}

/**
 * Return true if the IPv4 address (as a 32-bit unsigned int) falls within a
 * blocked range.
 *
 * Blocked ranges:
 *  - 127.0.0.0/8   (loopback)
 *  - 10.0.0.0/8    (RFC1918 private)
 *  - 172.16.0.0/12 (RFC1918 private)
 *  - 192.168.0.0/16 (RFC1918 private)
 *  - 169.254.0.0/16 (link-local / AWS metadata)
 *  - 0.0.0.0        (unspecified)
 */
function isBlockedIPv4Int(n: number): boolean {
  // 0.0.0.0 exactly
  if (n === 0) return true;
  // 127.0.0.0/8 → top byte is 0x7f (127)
  if (n >>> 24 === 0x7f) return true;
  // 10.0.0.0/8 → top byte is 0x0a (10)
  if (n >>> 24 === 0x0a) return true;
  // 172.16.0.0/12 → top 12 bits are 0xac1 (172.16–31.x.x)
  if (n >>> 20 === 0xac1) return true;
  // 192.168.0.0/16 → top 16 bits are 0xc0a8 (192.168)
  if (n >>> 16 === 0xc0a8) return true;
  // 169.254.0.0/16 → top 16 bits are 0xa9fe (169.254)
  if (n >>> 16 === 0xa9fe) return true;
  return false;
}

/**
 * Return true if `ip` is an IPv4 address in a blocked range.
 */
export function isBlockedIPv4(ip: string): boolean {
  const n = parseIPv4(ip);
  if (n === undefined) return false; // not a valid IPv4 — let caller handle
  return isBlockedIPv4Int(n);
}

// ─── IPv6 range checkers ──────────────────────────────────────────────────────

/**
 * Expand a compressed IPv6 address string to 8 groups of 16-bit hex values.
 * Returns undefined if parsing fails.
 */
function parseIPv6Groups(ip: string): number[] | undefined {
  // Strip brackets if present (URL.hostname includes them for IPv6 literals).
  const raw = ip.replace(/^\[|\]$/g, "");

  // Handle :: expansion.
  const halves = raw.split("::");
  if (halves.length > 2) return undefined;

  const toGroups = (s: string): number[] | undefined => {
    if (s === "") return [];
    const parts = s.split(":");
    const groups: number[] = [];
    for (const part of parts) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return undefined;
      groups.push(parseInt(part, 16));
    }
    return groups;
  };

  if (halves.length === 1) {
    const groups = toGroups(halves[0]);
    if (!groups || groups.length !== 8) return undefined;
    return groups;
  }

  // Has ::
  const left = toGroups(halves[0]);
  const right = toGroups(halves[1]);
  if (!left || !right) return undefined;
  const fill = 8 - left.length - right.length;
  if (fill < 0) return undefined;
  return [...left, ...Array<number>(fill).fill(0), ...right];
}

/**
 * Return true if `ip` is an IPv6 address in a blocked range.
 *
 * Blocked ranges:
 *  - ::1           (loopback)
 *  - ::            (unspecified)
 *  - fe80::/10     (link-local)
 *  - fc00::/7      (unique-local / ULA)
 */
export function isBlockedIPv6(ip: string): boolean {
  const groups = parseIPv6Groups(ip);
  if (!groups) return false; // not a valid IPv6

  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;

  // :: (unspecified)
  if (
    g0 === 0 &&
    g1 === 0 &&
    g2 === 0 &&
    g3 === 0 &&
    g4 === 0 &&
    g5 === 0 &&
    g6 === 0 &&
    g7 === 0
  )
    return true;

  // ::1 (loopback)
  if (
    g0 === 0 &&
    g1 === 0 &&
    g2 === 0 &&
    g3 === 0 &&
    g4 === 0 &&
    g5 === 0 &&
    g6 === 0 &&
    g7 === 1
  )
    return true;

  // fe80::/10 — top 10 bits are 1111 1110 10 → first group starts with 0xfe8..0xfeb
  // g0 in range [0xfe80, 0xfebf]
  if (g0 >= 0xfe80 && g0 <= 0xfebf) return true;

  // fc00::/7 — top 7 bits are 1111 110 → g0 in range [0xfc00, 0xfdff]
  if (g0 >= 0xfc00 && g0 <= 0xfdff) return true;

  return false;
}

// ─── Hostname SSRF check (string-only, no DNS) ─────────────────────────────

/**
 * Return an SsrfErrorCode if the hostname should be blocked, or undefined if
 * it is acceptable.
 *
 * Checks performed (no DNS lookup):
 *  - Exact match: "localhost"
 *  - Suffix match: ".localhost", ".local"
 *  - IPv4 literal in blocked ranges
 *  - IPv6 literal in blocked ranges
 */
export function checkHostname(hostname: string): SsrfErrorCode | undefined {
  const lower = hostname.toLowerCase();

  // localhost and *.localhost
  if (lower === "localhost" || lower.endsWith(".localhost")) {
    return "FORBIDDEN_HOST";
  }

  // *.local (mDNS / Bonjour)
  if (lower.endsWith(".local")) {
    return "FORBIDDEN_HOST";
  }

  // IPv6 literal (URL.hostname includes brackets)
  if (hostname.startsWith("[")) {
    const ip = hostname.slice(1, -1);
    if (isBlockedIPv6(ip)) return "FORBIDDEN_HOST";
    // Non-blocked IPv6 — pass through (let DNS lookup skip apply)
    return undefined;
  }

  // IPv4 literal
  const ipv4n = parseIPv4(hostname);
  if (ipv4n !== undefined) {
    if (isBlockedIPv4Int(ipv4n)) return "FORBIDDEN_HOST";
    // Non-blocked IPv4 literal — pass through
    return undefined;
  }

  // Domain name — DNS lookup required (handled in resolveAndGuardHost)
  return undefined;
}

// ─── Full URL guard (parse + protocol + hostname + optional DNS) ──────────

/**
 * Validate a URL string for safe outbound fetch.
 *
 * Steps:
 *  1. URL parse (INVALID_URL on failure)
 *  2. Protocol whitelist (UNSUPPORTED_PROTOCOL)
 *  3. Hostname string checks (FORBIDDEN_HOST for literals/localhost/local)
 *  4. For domain hostnames: DNS lookup + IP check (DNS_FAILURE / FORBIDDEN_HOST)
 *
 * Throws SsrfError on any violation, returns the parsed URL on success.
 */
export async function guardUrl(rawUrl: string): Promise<URL> {
  // ── 1. Parse ──────────────────────────────────────────────────────────────
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfError("INVALID_URL", `Invalid URL: ${rawUrl}`);
  }

  // ── 2. Protocol whitelist ─────────────────────────────────────────────────
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new SsrfError(
      "UNSUPPORTED_PROTOCOL",
      `Protocol not allowed: ${parsed.protocol}`,
    );
  }

  // ── 3. Hostname string checks ─────────────────────────────────────────────
  const hostnameError = checkHostname(parsed.hostname);
  if (hostnameError) {
    throw new SsrfError(hostnameError, `Blocked host: ${parsed.hostname}`);
  }

  // ── 4. DNS lookup for domain names ───────────────────────────────────────
  // Skip lookup for IP literals — already checked above.
  const isIPLiteral =
    parsed.hostname.startsWith("[") || parseIPv4(parsed.hostname) !== undefined;

  if (!isIPLiteral) {
    let resolvedAddress: string;
    try {
      const result = await lookup(parsed.hostname);
      resolvedAddress = result.address;
    } catch {
      throw new SsrfError(
        "DNS_FAILURE",
        `DNS resolution failed for: ${parsed.hostname}`,
      );
    }

    // Apply the same IP checks to the resolved address.
    if (isBlockedIPv4(resolvedAddress) || isBlockedIPv6(resolvedAddress)) {
      throw new SsrfError(
        "FORBIDDEN_HOST",
        `Resolved IP is in a blocked range: ${resolvedAddress}`,
      );
    }
  }

  return parsed;
}
