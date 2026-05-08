import { NextResponse } from "next/server";
import type { IntentLogEntry } from "@/builder/types/intent";
import {
  getStaged,
  markStaged,
} from "@/services/third-party-facade/chat-store";
import { chatStream } from "@/services/third-party-facade/chat-stream";
import { appendIntent } from "@/services/third-party-facade/plan-store";

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
  const result = await appendIntent(staged.entry as IntentLogEntry);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  markStaged(id, "applied");
  chatStream.emit(staged.sessionId, {
    kind: "staged_resolved",
    stagedId: id,
    status: "applied",
  });
  return NextResponse.json({ ok: true, serverVersion: result.serverVersion });
}
