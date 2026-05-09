import { stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getAttachment,
  getSession,
  setAttachmentMediaId,
} from "@/services/third-party-facade/chat-store";
import { UPLOAD_ROOT } from "@/services/third-party-facade/chat-uploads";
import {
  createMediaFromPath,
  getMedia,
} from "@/services/third-party-facade/media-store";

export const runtime = "nodejs";

// POST /api/chat/attachments/[id]/promote
//
// Promotes a chat attachment to the plan's media library.
// The underlying file is MOVED (not copied) from the chat upload directory
// into the plan media directory. The chat_attachments row gains a mediaId
// back-pointer on success.
//
// Idempotent: if mediaId is already set and the media row still exists,
// returns 200 with the existing media row. If the media row has been deleted
// (race/manual cleanup), the back-pointer is cleared and the file is
// re-promoted.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // ── 1. Param sanity ─────────────────────────────────────────────────────────
  if (!id || id.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing attachment id", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  // ── 2. Attachment lookup ────────────────────────────────────────────────────
  const attachment = getAttachment(id);
  if (!attachment) {
    return NextResponse.json(
      { error: "Attachment not found", code: "ATTACHMENT_NOT_FOUND" },
      { status: 404 },
    );
  }

  // ── 3. Idempotency check ────────────────────────────────────────────────────
  if (attachment.mediaId) {
    const existing = getMedia(attachment.mediaId);
    if (existing) {
      return NextResponse.json({ media: existing }, { status: 200 });
    }
    // Media row was deleted (race / manual cleanup) — clear the stale pointer
    // and proceed with re-promotion below.
    setAttachmentMediaId(id, null);
  }

  // ── 4. Session lookup → planId ──────────────────────────────────────────────
  const session = getSession(attachment.sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "Session not found", code: "SESSION_NOT_FOUND" },
      { status: 404 },
    );
  }
  const { planId } = session;

  // ── 5. Resolve chat file path and verify it exists ──────────────────────────
  // storagePath in chat_attachments is the bare filename (no directory component).
  // Reconstruct the absolute path under UPLOAD_ROOT/<sessionId>/.
  const chatPath = path.join(
    UPLOAD_ROOT,
    attachment.sessionId,
    attachment.storagePath,
  );

  let fileStat: Awaited<ReturnType<typeof stat>>;
  try {
    fileStat = await stat(chatPath);
  } catch {
    return NextResponse.json(
      {
        error: "Attachment file not found on disk",
        code: "ATTACHMENT_FILE_MISSING",
      },
      { status: 404 },
    );
  }

  const sizeBytes = fileStat.size;

  // ── 6. Best-effort image dimension extraction (image-size, 4 KB slice) ──────
  let width: number | undefined;
  let height: number | undefined;
  if (attachment.kind === "image") {
    try {
      const { readFile } = await import("node:fs/promises");
      // Read up to 4 KB — enough for image-size header parsing.
      const fd = await import("node:fs/promises");
      const handle = await fd.open(chatPath, "r");
      try {
        const slice = Buffer.allocUnsafe(4096);
        const { bytesRead } = await handle.read(slice, 0, 4096, 0);
        const buf = slice.subarray(0, bytesRead);
        void readFile; // mark used
        const { imageSize } = await import("image-size");
        const dims = imageSize(buf);
        if (dims.width && dims.height) {
          width = dims.width;
          height = dims.height;
        }
      } finally {
        await handle.close();
      }
    } catch {
      // best-effort — dimensions left undefined
    }
  }

  // ── 7. Move file + insert DB row ────────────────────────────────────────────
  let newMedia: Awaited<ReturnType<typeof createMediaFromPath>>;
  try {
    newMedia = await createMediaFromPath({
      planId,
      kind: attachment.kind,
      mimeType: attachment.mimeType,
      originalName: attachment.originalName,
      sizeBytes,
      sourcePath: chatPath,
      sourceChatAttachmentId: attachment.id,
      width,
      height,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Failed to promote attachment to media library",
        code: "STORAGE_ERROR",
      },
      { status: 500 },
    );
  }

  // ── 8. Write back-pointer on the attachment row ─────────────────────────────
  // If this update fails the media row exists but lacks the back-pointer.
  // We return 201 anyway (the promote succeeded) and log the discrepancy.
  // The idempotency check in step 3 handles re-tries via sourceChatAttachmentId.
  try {
    setAttachmentMediaId(id, newMedia.id);
  } catch (err) {
    console.error(
      "[promote] setAttachmentMediaId failed — back-pointer missing for attachment",
      id,
      "media",
      newMedia.id,
      err,
    );
  }

  return NextResponse.json({ media: newMedia }, { status: 201 });
}
