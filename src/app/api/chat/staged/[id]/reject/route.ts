import { NextResponse } from "next/server";
import {
  getStaged,
  markStaged,
} from "@/services/third-party-facade/chat-store";
import { chatStream } from "@/services/third-party-facade/chat-stream";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const staged = getStaged(id);
  if (!staged) {
    return NextResponse.json(
      { ok: false, reason: "NOT_FOUND" },
      { status: 404 },
    );
  }
  if (staged.status !== "staged") {
    return NextResponse.json(
      { ok: false, reason: "ALREADY_RESOLVED" },
      { status: 409 },
    );
  }
  markStaged(id, "rejected");
  chatStream.emit(staged.sessionId, {
    kind: "staged_resolved",
    stagedId: id,
    status: "rejected",
  });
  return NextResponse.json({ ok: true });
}
