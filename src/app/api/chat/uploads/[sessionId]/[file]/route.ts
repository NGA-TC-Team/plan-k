import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { NextResponse } from "next/server";
import {
  getAttachment,
  getSession,
} from "@/services/third-party-facade/chat-store";
import { resolveAttachmentPath } from "@/services/third-party-facade/chat-uploads";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sessionId: string; file: string }> },
) {
  const { sessionId, file } = await ctx.params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "NOT_FOUND" },
      { status: 404 },
    );
  }

  // `file` may be the attachment id (preferred) or the on-disk stored name.
  const att = getAttachment(file);
  const storedName = att?.storagePath ?? file;
  if (att && att.sessionId !== sessionId) {
    return NextResponse.json(
      { ok: false, reason: "MISMATCH" },
      { status: 403 },
    );
  }

  const abs = resolveAttachmentPath(sessionId, storedName);
  if (!abs) {
    return NextResponse.json(
      { ok: false, reason: "BAD_PATH" },
      { status: 400 },
    );
  }
  let size: number;
  try {
    const st = await stat(abs);
    size = st.size;
  } catch {
    return NextResponse.json({ ok: false, reason: "MISSING" }, { status: 404 });
  }
  const nodeStream = createReadStream(abs);
  const webStream = Readable.toWeb(
    nodeStream,
  ) as NodeReadableStream<Uint8Array>;
  return new Response(webStream as unknown as ReadableStream<Uint8Array>, {
    status: 200,
    headers: {
      "Content-Type": att?.mimeType ?? "application/octet-stream",
      "Content-Length": String(size),
      "Cache-Control": "private, max-age=600",
    },
  });
}
