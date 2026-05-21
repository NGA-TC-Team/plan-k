import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-validation";
import {
  type AttachmentRef,
  appendMessage,
  getSession,
  listAttachments,
  listMessages,
  type MentionRef,
} from "@/services/third-party-facade/chat-store";
import { startChatRun } from "@/services/third-party-facade/claude-runner";

const MessagesBodySchema = z.object({
  content: z.string().trim().min(1),
  mentions: z.array(z.unknown()).optional(),
  attachmentIds: z.array(z.string().min(1)).optional(),
});

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

  const parsed = await parseJsonBody(req, MessagesBodySchema);
  if (!parsed.ok) return parsed.response;
  const content = parsed.data.content;

  // Resolve attachment metadata so the runner can hand absolute paths to Claude.
  const allAttachments = listAttachments(sessionId);
  const attachmentRefs: AttachmentRef[] = (parsed.data.attachmentIds ?? [])
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
    mentions: (parsed.data.mentions ?? []) as MentionRef[],
    attachments: attachmentRefs,
  });

  const history = listMessages(sessionId);

  const handle = await startChatRun({
    planId: session.planId,
    sessionId,
    userMessage: content,
    mentions: (parsed.data.mentions ?? []) as MentionRef[],
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
