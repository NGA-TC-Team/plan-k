import { writeFile } from "node:fs/promises";
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

export async function POST(req: Request) {
  const form = await req.formData();
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

  const attachment = recordAttachment({
    sessionId,
    kind: classifyAttachment(file.type || "application/octet-stream"),
    mimeType: file.type || "application/octet-stream",
    originalName: file.name,
    storagePath: storedName,
    sizeBytes: file.size,
  });

  return NextResponse.json(attachment, { status: 201 });
}
