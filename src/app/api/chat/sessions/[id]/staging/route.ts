import { NextResponse } from "next/server";
import { z } from "zod";
import type { IntentLogEntry } from "@/builder/types/intent";
import { IntentLogEntrySchema } from "@/lib/api-schemas";
import { parseJsonBody, parseSearchParams } from "@/lib/api-validation";
import {
  getSession,
  stageIntent,
} from "@/services/third-party-facade/chat-store";
import { chatStream } from "@/services/third-party-facade/chat-stream";

const StagingQuerySchema = z.object({
  messageId: z.string().min(1),
});

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
  const queryParsed = parseSearchParams(new URL(req.url), StagingQuerySchema);
  if (!queryParsed.ok) return queryParsed.response;
  const { messageId } = queryParsed.data;

  const bodyParsed = await parseJsonBody(req, IntentLogEntrySchema);
  if (!bodyParsed.ok) return bodyParsed.response;
  const entry = bodyParsed.data as IntentLogEntry;

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
