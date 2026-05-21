import { NextResponse } from "next/server";
import { z } from "zod";
import { ChatModeSchema, ClaudeModelSchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/api-validation";
import {
  deleteSession,
  getSession,
  listAttachments,
  listMessages,
  listStaged,
  updateSession,
} from "@/services/third-party-facade/chat-store";
import { deleteSessionDir } from "@/services/third-party-facade/chat-uploads";

const SessionPatchBodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  mode: ChatModeSchema.optional(),
  model: ClaudeModelSchema.optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "NOT_FOUND" },
      { status: 404 },
    );
  }
  return NextResponse.json({
    session,
    messages: listMessages(id),
    attachments: listAttachments(id),
    staged: listStaged(id, "staged"),
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const parsed = await parseJsonBody(req, SessionPatchBodySchema);
  if (!parsed.ok) return parsed.response;
  const session = updateSession(id, parsed.data);
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "NOT_FOUND" },
      { status: 404 },
    );
  }
  return NextResponse.json(session);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "NOT_FOUND" },
      { status: 404 },
    );
  }
  deleteSession(id);
  // Cascade FK clears DB rows; remove on-disk uploads next.
  await deleteSessionDir(id);
  return NextResponse.json({ ok: true });
}
