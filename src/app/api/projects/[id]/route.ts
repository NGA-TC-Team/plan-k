import { NextResponse } from "next/server";
import type { IntentLogEntry } from "@/builder/types/intent";
import { appendIntent } from "@/services/third-party-facade/plan-store";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  // Route deletion through the intent path so all mutations have a single
  // shape. The cascade-delete side-effect lives in `appendIntent`.
  const entry: IntentLogEntry = {
    id: crypto.randomUUID(),
    planId: id,
    origin: "server:delete-project",
    lamport: Date.now(),
    intent: { type: "DELETE_PROJECT", projectId: id },
    createdAt: Date.now(),
    kind: "primary",
  };
  const result = await appendIntent(entry);
  if (!result.ok) {
    const status = result.reason === "PLAN_NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      {
        ok: false,
        reason:
          result.reason === "PLAN_NOT_FOUND" ? "NOT_FOUND" : result.reason,
      },
      { status },
    );
  }
  return NextResponse.json({ ok: true });
}
