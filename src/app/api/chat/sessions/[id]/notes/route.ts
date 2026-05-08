import { NextResponse } from "next/server";
import {
  appendMessage,
  getSession,
} from "@/services/third-party-facade/chat-store";
import { chatStream } from "@/services/third-party-facade/chat-stream";

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
  const body = (await req.json()) as { text?: string };
  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json(
      { ok: false, reason: "EMPTY_TEXT" },
      { status: 400 },
    );
  }
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
