import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import {
  getMedia,
  mediaAbsolutePath,
} from "@/services/third-party-facade/media-store";

export const runtime = "nodejs";

// GET /api/media/[id]/raw
// Serves the raw file associated with a media row. Files live outside
// public/ so cannot be served statically — this route performs a DB lookup
// and streams the bytes back with appropriate cache headers.
//
// Security: path is always constructed server-side from (planId, storagePath)
// retrieved from the DB. No user-supplied path component is used.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const row = getMedia(id);
  if (!row) {
    return NextResponse.json(
      { ok: false, reason: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const absPath = mediaAbsolutePath(row.planId, row.storagePath);

  let buffer: Buffer;
  try {
    buffer = await readFile(absPath);
  } catch {
    // File missing on disk — treat as not found (could happen if disk was
    // manually wiped while DB row remains).
    return NextResponse.json(
      { ok: false, reason: "FILE_NOT_FOUND" },
      { status: 404 },
    );
  }

  // Escape double-quotes in originalName for Content-Disposition.
  const safeName = row.originalName.replace(/"/g, '\\"');

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(row.sizeBytes),
      "Content-Disposition": `inline; filename="${safeName}"`,
      // Files are immutable once written (storagePath encodes the media id).
      // A new upload gets a new id, so this 7-day cache is safe.
      "Cache-Control": "private, max-age=604800, immutable",
    },
  });
}
