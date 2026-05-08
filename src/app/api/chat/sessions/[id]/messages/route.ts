import { NextResponse } from "next/server";
import {
  type AttachmentRef,
  appendMessage,
  getSession,
  listAttachments,
  listMessages,
  type MentionRef,
} from "@/services/third-party-facade/chat-store";
import { startChatRun } from "@/services/third-party-facade/claude-runner";

export const runtime = "nodejs";

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

  const body = (await req.json()) as {
    content?: string;
    mentions?: MentionRef[];
    attachmentIds?: string[];
  };
  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json(
      { ok: false, reason: "EMPTY_CONTENT" },
      { status: 400 },
    );
  }

  // Resolve attachment metadata so the runner can hand absolute paths to Claude.
  const allAttachments = listAttachments(sessionId);
  const attachmentRefs: AttachmentRef[] = (body.attachmentIds ?? [])
    .map((id) => allAttachments.find((a) => a.id === id))
    .filter((a): a is (typeof allAttachments)[number] => Boolean(a))
    .map((a) => ({
      id: a.id,
      kind: a.kind,
      mimeType: a.mimeType,
      originalName: a.originalName,
      sizeBytes: a.sizeBytes,
    }));

  const userMessage = appendMessage({
    sessionId,
    role: "user",
    content,
    mentions: body.mentions ?? [],
    attachments: attachmentRefs,
  });

  const history = listMessages(sessionId);

  const handle = await startChatRun({
    planId: session.planId,
    sessionId,
    userMessage: content,
    mentions: body.mentions ?? [],
    attachments: attachmentRefs,
    mode: session.mode,
    model: session.model,
    history,
  });

  return NextResponse.json({
    userMessage,
    runId: handle.runId,
    assistantMessageId: handle.assistantMessageId,
  });
}

export async function GET(
  _req: Request,
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
  return NextResponse.json(listMessages(sessionId));
}
