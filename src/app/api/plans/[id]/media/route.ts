import { NextResponse } from "next/server";
import {
  ALLOWED_MEDIA_MIMES,
  createMedia,
  listByPlan,
  MAX_MEDIA_BYTES,
  type MediaValidationError,
  validateAndClassifyMediaBuffer,
} from "@/services/third-party-facade/media-store";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";

export const runtime = "nodejs";

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

  // ── 4. Declared mime pre-check (fast-fail before buffering) ──────────────
  // The shared validateAndClassifyMediaBuffer will do the authoritative sniff
  // after buffering, but we can fast-fail here for clearly unsupported types.
  const declaredMime = file.type || "application/octet-stream";
  if (!ALLOWED_MEDIA_MIMES.has(declaredMime)) {
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

  // ── 6–8. Mime sniff + SVG guard + dimension extraction (shared helper) ────
  let meta: Awaited<ReturnType<typeof validateAndClassifyMediaBuffer>>;
  try {
    meta = await validateAndClassifyMediaBuffer(buffer, declaredMime);
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

  // ── 9. Persist ─────────────────────────────────────────────────────────────
  let row: Awaited<ReturnType<typeof createMedia>>;
  try {
    row = await createMedia({
      planId,
      kind: meta.kind,
      mimeType: meta.mimeType,
      originalName: file.name || "upload",
      buffer,
      width: meta.width,
      height: meta.height,
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
