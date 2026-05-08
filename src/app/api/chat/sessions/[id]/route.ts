import { NextResponse } from "next/server";
import {
  deleteSession,
  getSession,
  listAttachments,
  listMessages,
  listStaged,
  updateSession,
} from "@/services/third-party-facade/chat-store";
import { deleteSessionDir } from "@/services/third-party-facade/chat-uploads";

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
  const body = (await req.json()) as {
    title?: string;
    mode?: "auto" | "approval";
    model?: "opus" | "sonnet" | "haiku";
  };
  const session = updateSession(id, body);
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
