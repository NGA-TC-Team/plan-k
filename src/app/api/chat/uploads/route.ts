import { unlink, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import {
  getSession,
  recordAttachment,
} from "@/services/third-party-facade/chat-store";
import {
  buildStoragePath,
  classifyAttachment,
  ensureSessionDir,
  MAX_UPLOAD_BYTES,
} from "@/services/third-party-facade/chat-uploads";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// MIME whitelist (작업 4)
// ---------------------------------------------------------------------------
const ALLOWED_MIME_PREFIXES = [
  "image/",
  "application/pdf",
  "text/",
  "application/json",
  "application/zip",
  "application/octet-stream", // empty type fallback
] as const;

function isAllowedMime(type: string): boolean {
  const t = type.trim().toLowerCase();
  // Empty string falls back to octet-stream — allowed.
  if (t === "") return true;
  return ALLOWED_MIME_PREFIXES.some((prefix) => t.startsWith(prefix));
}

// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch (err) {
      console.error("[uploads] formData() parse failed", err);
      return NextResponse.json(
        { ok: false, reason: "INVALID_FORM" },
        { status: 400 },
      );
    }

    const sessionId = form.get("sessionId");
    const file = form.get("file");
    if (typeof sessionId !== "string" || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, reason: "INVALID_FORM" },
        { status: 400 },
      );
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { ok: false, reason: "SESSION_NOT_FOUND" },
        { status: 404 },
      );
    }

    // MIME check first — cheapest guard before I/O.
    if (!isAllowedMime(file.type)) {
      return NextResponse.json(
        { ok: false, reason: "MIME_NOT_ALLOWED" },
        { status: 415 },
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { ok: false, reason: "FILE_TOO_LARGE" },
        { status: 413 },
      );
    }

    await ensureSessionDir(sessionId);
    const { absolute, storedName } = buildStoragePath(sessionId, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absolute, buffer);

    // recordAttachment failure must not leave an orphan file on disk (작업 3).
    let attachment: ReturnType<typeof recordAttachment>;
    try {
      attachment = recordAttachment({
        sessionId,
        kind: classifyAttachment(file.type || "application/octet-stream"),
        mimeType: file.type || "application/octet-stream",
        originalName: file.name,
        storagePath: storedName,
        sizeBytes: file.size,
      });
    } catch (err) {
      console.error(
        "[uploads] recordAttachment failed — removing orphan file",
        {
          absolute,
          err,
        },
      );
      // Best-effort cleanup; unlink failure is swallowed + logged.
      try {
        await unlink(absolute);
      } catch (unlinkErr) {
        console.error("[uploads] unlink failed", { absolute, unlinkErr });
      }
      return NextResponse.json(
        { ok: false, reason: "RECORD_FAILED" },
        { status: 500 },
      );
    }

    return NextResponse.json(attachment, { status: 201 });
  } catch (err) {
    console.error("[uploads] unexpected", err);
    return NextResponse.json(
      { ok: false, reason: "INTERNAL" },
      { status: 500 },
    );
  }
}
