import { NextResponse } from "next/server";
import type { IntentLogEntry } from "@/builder/types/intent";
import {
  getSession,
  stageIntent,
} from "@/services/third-party-facade/chat-store";
import { chatStream } from "@/services/third-party-facade/chat-stream";

export const runtime = "nodejs";

// Approval-mode mirror of /api/intents. The subprocess POSTs IntentLogEntry
// here (with ?messageId=...) and the human reviews + applies in the UI.

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await ctx.params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "SESSION_NOT_FOUND" },
      { status: 404 },
    );
  }
  const url = new URL(req.url);
  const messageId = url.searchParams.get("messageId");
  if (!messageId) {
    return NextResponse.json(
      { ok: false, reason: "MISSING_MESSAGE_ID" },
      { status: 400 },
    );
  }
  const entry = (await req.json()) as IntentLogEntry;
  if (!entry?.id || !entry.planId) {
    return NextResponse.json(
      { ok: false, reason: "INVALID_ENTRY" },
      { status: 400 },
    );
  }
  if (entry.planId !== session.planId) {
    return NextResponse.json(
      { ok: false, reason: "PLAN_MISMATCH" },
      { status: 400 },
    );
  }
  const staged = stageIntent({ sessionId, messageId, entry });
  chatStream.emit(sessionId, {
    kind: "staged_intent",
    messageId,
    stagedId: staged.id,
    entry,
  });
  return NextResponse.json({ ok: true, stagedId: staged.id });
}
