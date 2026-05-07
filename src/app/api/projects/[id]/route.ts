import { NextResponse } from "next/server";
import { deleteProject } from "@/services/third-party-facade/project-store";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const ok = await deleteProject(id);
  if (!ok) {
    return NextResponse.json(
      { ok: false, reason: "NOT_FOUND" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
