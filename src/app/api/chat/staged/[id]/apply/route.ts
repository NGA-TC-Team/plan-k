import { NextResponse } from "next/server";
import type { IntentLogEntry } from "@/builder/types/intent";
import {
  getStaged,
  markStaged,
} from "@/services/third-party-facade/chat-store";
import { chatStream } from "@/services/third-party-facade/chat-stream";
import { appendIntent } from "@/services/third-party-facade/plan-store";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const staged = getStaged(id);
    if (!staged) {
      return NextResponse.json(
        { ok: false, reason: "NOT_FOUND" },
        { status: 404 },
      );
    }
    if (staged.status !== "staged") {
      return NextResponse.json(
        { ok: false, reason: "ALREADY_RESOLVED" },
        { status: 409 },
      );
    }

    const result = await appendIntent(staged.entry as IntentLogEntry);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    // intent is now persisted — subsequent failures should not block the 200 response.

    try {
      markStaged(id, "applied");
    } catch (err) {
      // staged status mismatch is recoverable; intent is already durable.
      console.error("[staged/apply] markStaged failed", { stagedId: id, err });
    }

    try {
      chatStream.emit(staged.sessionId, {
        kind: "staged_resolved",
        stagedId: id,
        status: "applied",
      });
    } catch (err) {
      console.error("[staged/apply] chatStream.emit failed", {
        stagedId: id,
        err,
      });
    }

    return NextResponse.json({ ok: true, serverVersion: result.serverVersion });
  } catch (err) {
    console.error("[staged/apply] unexpected", err);
    return NextResponse.json(
      { ok: false, reason: "INTERNAL" },
      { status: 500 },
    );
  }
}
