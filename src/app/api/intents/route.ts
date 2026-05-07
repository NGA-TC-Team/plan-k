import { NextResponse } from "next/server";
import type { IntentLogEntry } from "@/builder/types/intent";
import { appendIntent } from "@/services/third-party-facade/plan-store";

export async function POST(req: Request) {
  const entry = (await req.json()) as IntentLogEntry;
  if (!entry?.id || !entry.planId) {
    return NextResponse.json(
      { ok: false, reason: "INVALID_ENTRY" },
      { status: 400 },
    );
  }
  const result = await appendIntent(entry);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
