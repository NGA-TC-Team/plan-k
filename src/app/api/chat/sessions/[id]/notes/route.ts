import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-validation";
import {
  appendMessage,
  getSession,
} from "@/services/third-party-facade/chat-store";
import { chatStream } from "@/services/third-party-facade/chat-stream";

const NotesBodySchema = z.object({
  text: z.string().trim().min(1),
});

export const runtime = "nodejs";

// Tool-style notes from the assistant subprocess (plan-k-chat skill
// `record_assistant_note`). Persisted as a `tool` role message so the UI
// timeline can render them as small step pills.

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await ctx.params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "NOT_FOUND" },
      { status: 404 },
    );
  }
  const parsed = await parseJsonBody(req, NotesBodySchema);
  if (!parsed.ok) return parsed.response;
  const text = parsed.data.text;
  const message = appendMessage({
    sessionId,
    role: "tool",
    content: text,
  });
  chatStream.emit(sessionId, {
    kind: "assistant_delta",
    messageId: message.id,
    text,
  });
  return NextResponse.json(message, { status: 201 });
}
