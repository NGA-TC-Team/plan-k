import { NextResponse } from "next/server";
import {
  createSession,
  listSessionsForPlan,
} from "@/services/third-party-facade/chat-store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const planId = url.searchParams.get("planId");
  if (!planId) {
    return NextResponse.json(
      { ok: false, reason: "MISSING_PLAN_ID" },
      { status: 400 },
    );
  }
  return NextResponse.json(listSessionsForPlan(planId));
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    planId?: string;
    title?: string;
    mode?: "auto" | "approval";
    model?: "opus" | "sonnet" | "haiku";
  };
  if (!body.planId) {
    return NextResponse.json(
      { ok: false, reason: "MISSING_PLAN_ID" },
      { status: 400 },
    );
  }
  const session = createSession({
    planId: body.planId,
    title: body.title,
    mode: body.mode,
    model: body.model,
  });
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "PLAN_NOT_FOUND" },
      { status: 404 },
    );
  }
  return NextResponse.json(session, { status: 201 });
}
