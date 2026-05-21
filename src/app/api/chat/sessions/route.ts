import { NextResponse } from "next/server";
import { z } from "zod";
import { ChatModeSchema, ClaudeModelSchema } from "@/lib/api-schemas";
import { parseJsonBody, parseSearchParams } from "@/lib/api-validation";
import {
  createSession,
  listSessionsForPlan,
} from "@/services/third-party-facade/chat-store";

const SessionsQuerySchema = z.object({
  planId: z.string().min(1),
});

const SessionsBodySchema = z.object({
  planId: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  mode: ChatModeSchema.optional(),
  model: ClaudeModelSchema.optional(),
});

export async function GET(req: Request) {
  const parsed = parseSearchParams(new URL(req.url), SessionsQuerySchema);
  if (!parsed.ok) return parsed.response;
  return NextResponse.json(listSessionsForPlan(parsed.data.planId));
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, SessionsBodySchema);
  if (!parsed.ok) return parsed.response;
  const { planId, title, mode, model } = parsed.data;
  const session = createSession({ planId, title, mode, model });
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "PLAN_NOT_FOUND" },
      { status: 404 },
    );
  }
  return NextResponse.json(session, { status: 201 });
}
