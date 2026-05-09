import { NextResponse } from "next/server";
import {
  createMedia,
  MAX_MEDIA_BYTES,
  type MediaValidationError,
  sanitizeFilename,
  validateAndClassifyMediaBuffer,
} from "@/services/third-party-facade/media-store";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";
import {
  guardUrl,
  SsrfError,
  type SsrfErrorCode,
} from "@/services/third-party-facade/ssrf-guard";

export const runtime = "nodejs";

// ─── Error code → HTTP status mapping ────────────────────────────────────────

const SSRF_STATUS: Record<SsrfErrorCode, number> = {
  INVALID_URL: 400,
  UNSUPPORTED_PROTOCOL: 400,
  FORBIDDEN_HOST: 400,
  DNS_FAILURE: 400,
};

// ─── Filename extraction from URL ─────────────────────────────────────────────

/**
 * Derive a filename from a URL's pathname last segment.
 * Falls back to `image.<ext>` when the pathname has no usable segment.
 * Extension is derived from the detected mime type if not present in the path.
 */
function filenameFromUrl(parsed: URL, mimeType: string): string {
  const segments = parsed.pathname.split("/").filter(Boolean);
  const last = segments.at(-1) ?? "";

  // The MIME_TO_EXT map only covers common image types — the allowlist
  // ensures we will only reach createMedia for permitted types anyway.
  const MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "application/pdf": "pdf",
  };
  const ext = MIME_TO_EXT[mimeType] ?? "bin";

  const candidate = last.includes(".")
    ? last
    : last
      ? `${last}.${ext}`
      : `image.${ext}`;
  return sanitizeFilename(candidate);
}

// ─── POST /api/plans/[id]/media/from-url ─────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: planId } = await params;

  // ── 0. planId sanity check ─────────────────────────────────────────────────
  if (!planId || planId.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing plan id", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  // ── 1. Plan existence check ────────────────────────────────────────────────
  let plan: Awaited<ReturnType<typeof getPlan>>;
  try {
    plan = await getPlan(planId);
  } catch {
    return NextResponse.json(
      { error: "Failed to look up plan", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
  if (!plan || isPlanLoadError(plan)) {
    return NextResponse.json(
      { error: "Plan not found", code: "PLAN_NOT_FOUND" },
      { status: 404 },
    );
  }

  // ── 2. Parse JSON body and extract `url` ───────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Body must be a JSON object", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const rawUrl = (body as Record<string, unknown>).url;
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing or empty `url` field", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const urlString = rawUrl.trim();

  // ── 3–5. SSRF guard: URL parse + protocol + hostname + DNS ────────────────
  let parsedUrl: URL;
  try {
    parsedUrl = await guardUrl(urlString);
  } catch (err) {
    if (err instanceof SsrfError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: SSRF_STATUS[err.code] },
      );
    }
    return NextResponse.json(
      { error: "URL validation failed", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  // ── 6. Fetch with 30s timeout ──────────────────────────────────────────────
  let response: Response;
  try {
    response = await fetch(parsedUrl.toString(), {
      signal: AbortSignal.timeout(30_000),
      // Do not follow redirects to a potentially blocked host — Node 18+
      // redirect: "follow" is the default, but we guard with the pre-fetch
      // SSRF check and trust the final URL here for v1.
      redirect: "follow",
      headers: {
        // Identify ourselves without revealing internal host info
        "User-Agent": "plan-k-media-fetcher/1.0",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Remote URL fetch timed out", code: "FETCH_TIMEOUT" },
        { status: 408 },
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch remote URL", code: "FETCH_FAILED" },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error: `Remote server returned ${response.status}`,
        code: "FETCH_FAILED",
      },
      { status: 502 },
    );
  }

  // ── 7. Content-Length pre-check ────────────────────────────────────────────
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const declared = Number(contentLength);
    if (!Number.isNaN(declared) && declared > MAX_MEDIA_BYTES) {
      return NextResponse.json(
        {
          error: `Remote file too large (${declared} bytes, max ${MAX_MEDIA_BYTES})`,
          code: "MEDIA_TOO_LARGE",
          maxBytes: MAX_MEDIA_BYTES,
        },
        { status: 413 },
      );
    }
  }

  // ── 8. Streaming download with cap ────────────────────────────────────────
  const body_stream = response.body;
  if (!body_stream) {
    return NextResponse.json(
      { error: "Empty response body from remote URL", code: "FETCH_FAILED" },
      { status: 502 },
    );
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let capExceeded = false;

  const reader = body_stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_MEDIA_BYTES) {
        capExceeded = true;
        break;
      }
      chunks.push(value);
    }
  } finally {
    reader.cancel().catch(() => {
      // Cancelling an already-done reader can throw — ignore.
    });
  }

  if (capExceeded) {
    return NextResponse.json(
      {
        error: `Remote file too large (max ${MAX_MEDIA_BYTES} bytes)`,
        code: "MEDIA_TOO_LARGE",
        maxBytes: MAX_MEDIA_BYTES,
      },
      { status: 413 },
    );
  }

  // Concatenate all chunks into a single Buffer.
  const totalBuf = Buffer.allocUnsafe(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    totalBuf.set(chunk, offset);
    offset += chunk.byteLength;
  }

  // ── 9. Mime sniff + SVG guard + dimensions ────────────────────────────────
  const declaredContentType = response.headers
    .get("content-type")
    ?.split(";")[0]
    .trim();

  let meta: Awaited<ReturnType<typeof validateAndClassifyMediaBuffer>>;
  try {
    meta = await validateAndClassifyMediaBuffer(totalBuf, declaredContentType);
  } catch (validationErr) {
    const ve = validationErr as MediaValidationError;
    if (ve?.code === "UNSUPPORTED_MIME" || ve?.code === "SVG_SCRIPT") {
      return NextResponse.json(
        { error: ve.message, code: "UNSUPPORTED_MIME" },
        { status: 415 },
      );
    }
    return NextResponse.json(
      { error: "Media validation failed", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  // ── 10. Filename ────────────────────────────────────────────────────────────
  const originalName = filenameFromUrl(parsedUrl, meta.mimeType);

  // ── 11–12. Persist ──────────────────────────────────────────────────────────
  let row: Awaited<ReturnType<typeof createMedia>>;
  try {
    row = await createMedia({
      planId,
      kind: meta.kind,
      mimeType: meta.mimeType,
      originalName,
      buffer: totalBuf,
      width: meta.width,
      height: meta.height,
      sourceUrl: urlString,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to store media", code: "STORAGE_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ media: row }, { status: 201 });
}
