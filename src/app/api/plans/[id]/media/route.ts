import { NextResponse } from "next/server";
import {
  classifyMedia,
  createMedia,
  listByPlan,
  MAX_MEDIA_BYTES,
} from "@/services/third-party-facade/media-store";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";

export const runtime = "nodejs";

// ─── Allowlist ────────────────────────────────────────────────────────────────
// Declared mime types that are permitted for upload. `classifyMedia` returning
// "other" is an additional gate — only types that map to a known kind AND appear
// here pass through.
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "application/pdf",
]);

// ─── Magic-byte sniff helpers ─────────────────────────────────────────────────

/**
 * Return the detected mime type from the first 4 KB of `buf`, or undefined
 * if `file-type` cannot determine it (e.g. SVG / plain-text formats).
 */
async function sniffMimeType(buf: Buffer): Promise<string | undefined> {
  // Dynamic import keeps `file-type` (ESM-only) away from the module evaluation
  // phase — Next.js server components tolerate this pattern fine.
  const { fileTypeFromBuffer } = await import("file-type");
  const slice = buf.subarray(0, 4096);
  const result = await fileTypeFromBuffer(slice);
  return result?.mime;
}

/**
 * Validate that `declared` matches the magic bytes in `buf`.
 *
 * Rules:
 *  - If `file-type` detects a type AND it differs from declared → MIME_MISMATCH.
 *  - If `file-type` returns undefined (e.g. SVG, plain-text) → accept; the
 *    caller's allowlist and SVG script check provide the safety net.
 */
async function assertMimeMatch(
  declared: string,
  buf: Buffer,
): Promise<"ok" | "MIME_MISMATCH"> {
  const detected = await sniffMimeType(buf);
  if (detected && detected !== declared) {
    return "MIME_MISMATCH";
  }
  return "ok";
}

/**
 * SVG safety check: reject if the decoded text contains a `<script` element
 * (case-insensitive). This prevents stored XSS via crafted SVG uploads when the
 * file is later served with Content-Type: image/svg+xml.
 */
function svgHasScript(buf: Buffer): boolean {
  const text = buf.toString("utf-8");
  return /<script/i.test(text);
}

// ─── Optional: raster image dimensions ───────────────────────────────────────

async function extractImageDimensions(
  buf: Buffer,
  mimeType: string,
): Promise<{ width: number; height: number } | null> {
  // Only attempt for raster types — SVG intrinsic size is CSS, not pixel.
  if (
    ![
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/avif",
    ].includes(mimeType)
  ) {
    return null;
  }
  try {
    const { imageSize } = await import("image-size");
    const dims = imageSize(buf);
    if (dims.width && dims.height) {
      return { width: dims.width, height: dims.height };
    }
  } catch {
    // Best-effort — leave width/height null on any failure.
  }
  return null;
}

// ─── POST /api/plans/[id]/media ───────────────────────────────────────────────

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
    // getPlan may throw on unexpected DB errors (e.g. locked file, schema mismatch).
    // Do not surface the raw error to the client.
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

  // ── 2. Parse multipart body ────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart body", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const fileEntry = formData.get("file");
  if (!fileEntry || !(fileEntry instanceof File)) {
    return NextResponse.json(
      { error: "Missing `file` form field", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const file = fileEntry as File;

  // ── 3. Size check (before buffering entirely) ──────────────────────────────
  if (file.size === 0) {
    return NextResponse.json(
      { error: "File must not be empty (0 bytes)", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  if (file.size > MAX_MEDIA_BYTES) {
    return NextResponse.json(
      {
        error: `File exceeds ${MAX_MEDIA_BYTES / (1024 * 1024)} MiB limit`,
        code: "FILE_TOO_LARGE",
      },
      { status: 413 },
    );
  }

  // ── 4. Declared mime allowlist ─────────────────────────────────────────────
  const declaredMime = file.type || "application/octet-stream";
  const kind = classifyMedia(declaredMime);

  if (kind === "other" || !ALLOWED_MIMES.has(declaredMime)) {
    return NextResponse.json(
      {
        error: `Unsupported MIME type: ${declaredMime}`,
        code: "UNSUPPORTED_MIME",
      },
      { status: 415 },
    );
  }

  // ── 5. Buffer the file ─────────────────────────────────────────────────────
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch {
    // Multipart stream can be truncated / corrupted at read time.
    return NextResponse.json(
      { error: "Failed to read file data", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }
  const buffer = Buffer.from(arrayBuffer);

  // ── 6. Magic-byte MIME sniff ───────────────────────────────────────────────
  const sniffResult = await assertMimeMatch(declaredMime, buffer);
  if (sniffResult === "MIME_MISMATCH") {
    return NextResponse.json(
      {
        error: "Declared MIME type does not match file content",
        code: "MIME_MISMATCH",
      },
      { status: 415 },
    );
  }

  // ── 7. SVG script injection check ─────────────────────────────────────────
  if (declaredMime === "image/svg+xml" && svgHasScript(buffer)) {
    return NextResponse.json(
      {
        error: "SVG files must not contain <script> elements",
        code: "UNSUPPORTED_MIME",
      },
      { status: 415 },
    );
  }

  // ── 8. Extract image dimensions (best-effort) ──────────────────────────────
  const dims = await extractImageDimensions(buffer, declaredMime);

  // ── 9. Persist ─────────────────────────────────────────────────────────────
  let row: Awaited<ReturnType<typeof createMedia>>;
  try {
    row = await createMedia({
      planId,
      kind,
      mimeType: declaredMime,
      originalName: file.name || "upload",
      buffer,
      width: dims?.width,
      height: dims?.height,
    });
  } catch {
    // Do not surface raw error messages — they may contain absolute paths or
    // DB internals. createMedia throws only on fs write failure or DB error.
    return NextResponse.json(
      { error: "Failed to store media", code: "STORAGE_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ media: row }, { status: 201 });
}

// ─── GET /api/plans/[id]/media ────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: planId } = await params;

  // planId sanity check
  if (!planId || planId.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing plan id", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

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

  let items: ReturnType<typeof listByPlan>;
  try {
    items = listByPlan(planId);
  } catch {
    return NextResponse.json(
      { error: "Failed to list media", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ items });
}
