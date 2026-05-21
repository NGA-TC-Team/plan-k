import { NextResponse } from "next/server";
import type { IntentLogEntry } from "@/builder/types/intent";
import { IntentLogEntrySchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/api-validation";
import { appendIntent } from "@/services/third-party-facade/plan-store";

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, IntentLogEntrySchema);
  if (!parsed.ok) return parsed.response;
  const result = await appendIntent(parsed.data as IntentLogEntry);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
