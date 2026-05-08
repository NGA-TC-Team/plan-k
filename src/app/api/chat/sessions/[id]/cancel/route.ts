import { NextResponse } from "next/server";
import { cancelActiveRun } from "@/services/third-party-facade/claude-runner";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await ctx.params;
  const cancelled = cancelActiveRun(sessionId);
  return NextResponse.json({ ok: true, cancelled });
}
