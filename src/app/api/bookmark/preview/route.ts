import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-validation";
import { safeFetchSSRF } from "@/services/third-party-facade/ssrf-guard";

// ─── Response shape ─────────────────────────────────────────────────────────

export type BookmarkPreviewResponse = {
  title: string;
  description: string;
  faviconUrl: string;
};

const EMPTY_META: BookmarkPreviewResponse = {
  title: "",
  description: "",
  faviconUrl: "",
};

// Maximum HTML bytes to read for meta extraction (512 KB).
const MAX_HTML_BYTES = 512 * 1024;

// Maximum URL length accepted.
const MAX_URL_LENGTH = 2048;

// ─── HTML entity decoder (basic subset) ──────────────────────────────────────

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

// ─── Meta extractors (regex-based, no external deps) ─────────────────────────

function extractTitle(html: string): string {
  // 1. og:title
  const og = html.match(
    /<meta[^>]+property\s*=\s*["']og:title["'][^>]+content\s*=\s*["']([^"']+)["']/i,
  );
  if (og?.[1]) return decodeHtmlEntities(og[1].trim());

  // og:title with content first
  const og2 = html.match(
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+property\s*=\s*["']og:title["']/i,
  );
  if (og2?.[1]) return decodeHtmlEntities(og2[1].trim());

  // 2. twitter:title
  const tw = html.match(
    /<meta[^>]+name\s*=\s*["']twitter:title["'][^>]+content\s*=\s*["']([^"']+)["']/i,
  );
  if (tw?.[1]) return decodeHtmlEntities(tw[1].trim());

  const tw2 = html.match(
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+name\s*=\s*["']twitter:title["']/i,
  );
  if (tw2?.[1]) return decodeHtmlEntities(tw2[1].trim());

  // 3. <title>
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (title?.[1]) return decodeHtmlEntities(title[1].trim());

  return "";
}

function extractDescription(html: string): string {
  // 1. og:description
  const og = html.match(
    /<meta[^>]+property\s*=\s*["']og:description["'][^>]+content\s*=\s*["']([^"']+)["']/i,
  );
  if (og?.[1]) return decodeHtmlEntities(og[1].trim());

  const og2 = html.match(
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+property\s*=\s*["']og:description["']/i,
  );
  if (og2?.[1]) return decodeHtmlEntities(og2[1].trim());

  // 2. twitter:description
  const tw = html.match(
    /<meta[^>]+name\s*=\s*["']twitter:description["'][^>]+content\s*=\s*["']([^"']+)["']/i,
  );
  if (tw?.[1]) return decodeHtmlEntities(tw[1].trim());

  const tw2 = html.match(
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+name\s*=\s*["']twitter:description["']/i,
  );
  if (tw2?.[1]) return decodeHtmlEntities(tw2[1].trim());

  // 3. name=description
  const desc = html.match(
    /<meta[^>]+name\s*=\s*["']description["'][^>]+content\s*=\s*["']([^"']+)["']/i,
  );
  if (desc?.[1]) return decodeHtmlEntities(desc[1].trim());

  const desc2 = html.match(
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+name\s*=\s*["']description["']/i,
  );
  if (desc2?.[1]) return decodeHtmlEntities(desc2[1].trim());

  return "";
}

function extractFavicon(html: string, baseUrl: string): string {
  // 1. <link rel="icon">
  const icon = html.match(
    /<link[^>]+rel\s*=\s*["']icon["'][^>]+href\s*=\s*["']([^"']+)["']/i,
  );
  if (icon?.[1]) return resolveUrl(icon[1].trim(), baseUrl);

  // rel and href reversed
  const icon2 = html.match(
    /<link[^>]+href\s*=\s*["']([^"']+)["'][^>]+rel\s*=\s*["']icon["']/i,
  );
  if (icon2?.[1]) return resolveUrl(icon2[1].trim(), baseUrl);

  // 2. <link rel="shortcut icon">
  const shortcut = html.match(
    /<link[^>]+rel\s*=\s*["']shortcut icon["'][^>]+href\s*=\s*["']([^"']+)["']/i,
  );
  if (shortcut?.[1]) return resolveUrl(shortcut[1].trim(), baseUrl);

  const shortcut2 = html.match(
    /<link[^>]+href\s*=\s*["']([^"']+)["'][^>]+rel\s*=\s*["']shortcut icon["']/i,
  );
  if (shortcut2?.[1]) return resolveUrl(shortcut2[1].trim(), baseUrl);

  return "";
}

/**
 * Resolve a potentially relative favicon href to an absolute URL.
 * Returns empty string if resolution fails.
 */
function resolveUrl(href: string, base: string): string {
  if (!href) return "";
  // Already absolute
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  // Data URI — return as-is
  if (href.startsWith("data:")) return href;
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const BookmarkPreviewBodySchema = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(MAX_URL_LENGTH, { message: "URL exceeds maximum allowed length" }),
});

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  // ── 1. Parse + validate request body ────────────────────────────────────────
  const parsed = await parseJsonBody(req, BookmarkPreviewBodySchema);
  if (!parsed.ok) return parsed.response;
  const trimmedUrl = parsed.data.url;

  // ── 2. SSRF-safe fetch (validates URL + each redirect hop, max 5 hops) ────────
  // safeFetchSSRF: URL parse, protocol whitelist, hostname/IP check, DNS lookup
  // at initial URL and every redirect destination. redirect:"manual" internally.
  const fetchResult = await safeFetchSSRF(trimmedUrl, {
    signal: AbortSignal.timeout(5000),
  });

  if (!fetchResult.ok) {
    return NextResponse.json(
      { error: `Forbidden: ${fetchResult.reason}` },
      { status: 400 },
    );
  }

  const response = fetchResult.response;

  // ── 3. Parse HTML ─────────────────────────────────────────────────────────────
  try {
    // content-type guard: only parse text/html
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return NextResponse.json(EMPTY_META);
    }

    // Read up to MAX_HTML_BYTES only
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json(EMPTY_META);
    }

    let totalBytes = 0;
    const chunks: Uint8Array[] = [];

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        const remaining = MAX_HTML_BYTES - totalBytes;
        if (remaining <= 0) {
          await reader.cancel();
          break;
        }
        const slice =
          value.length > remaining ? value.slice(0, remaining) : value;
        chunks.push(slice);
        totalBytes += slice.length;
      }
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      concatUint8Arrays(chunks),
    );

    // ── 4. Extract meta ────────────────────────────────────────────────────────
    // Use fetchResult.finalUrl as base for favicon resolution (follows redirects).
    const title = extractTitle(html);
    const description = extractDescription(html);
    const faviconUrl = extractFavicon(html, fetchResult.finalUrl);

    return NextResponse.json({ title, description, faviconUrl });
  } catch {
    // All parse errors → fail-soft: return empty meta with 200
    return NextResponse.json(EMPTY_META);
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
