import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { extractBlockText } from "@/builder/blocks/extract-text";
import type { BlockEntity } from "@/builder/types/entity";
import {
  findAction,
  type InlineActionId,
} from "@/components/builder/inline-ai/actions";
import { db, plans } from "@/db";
import {
  appendMessage,
  createAdhocSession,
} from "@/services/third-party-facade/chat-store";
import { startChatRun } from "@/services/third-party-facade/claude-runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RequestBody = {
  planId: string;
  blockId: string;
  actionId: InlineActionId;
};

// Triggers an inline AI action. Loads the block from the plan
// snapshot, builds the prompt, spins up a hidden ad-hoc chat session
// in approval mode, and starts the Claude Code run. The actual diff
// shows up in chatStagedIntents and is reviewed via the staging
// drawer in PR-3 (or the existing chat panel staging strip in the
// meantime).
export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "INVALID_JSON" },
      { status: 400 },
    );
  }
  if (!body?.planId || !body?.blockId || !body?.actionId) {
    return NextResponse.json(
      { ok: false, reason: "MISSING_FIELDS" },
      { status: 400 },
    );
  }
  const action = findAction(body.actionId);
  if (!action) {
    return NextResponse.json(
      { ok: false, reason: "UNKNOWN_ACTION" },
      { status: 400 },
    );
  }

  const planRow = db
    .select({ id: plans.id, snapshot: plans.snapshot })
    .from(plans)
    .where(eq(plans.id, body.planId))
    .get();
  if (!planRow) {
    return NextResponse.json(
      { ok: false, reason: "PLAN_NOT_FOUND" },
      { status: 404 },
    );
  }

  const snapshot = JSON.parse(planRow.snapshot) as {
    blocks?: Record<string, BlockEntity>;
  };
  const block = snapshot.blocks?.[body.blockId];
  if (!block) {
    return NextResponse.json(
      { ok: false, reason: "BLOCK_NOT_FOUND" },
      { status: 404 },
    );
  }
  if (!action.available(block)) {
    return NextResponse.json(
      { ok: false, reason: "ACTION_NOT_AVAILABLE" },
      { status: 409 },
    );
  }

  const blockText = extractBlockText(block);
  const prompt = action.buildPrompt({ block, blockText });

  const session = createAdhocSession({
    planId: body.planId,
    label: `Inline ${action.group}: ${action.label} on ${block.kind}`,
  });
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "SESSION_CREATE_FAILED" },
      { status: 500 },
    );
  }

  // Echo the user message so the staging drawer can show what was
  // requested alongside the proposed edit.
  appendMessage({
    sessionId: session.id,
    role: "user",
    content: prompt,
    status: "complete",
  });

  const handle = await startChatRun({
    planId: body.planId,
    sessionId: session.id,
    userMessage: prompt,
    mentions: [],
    attachments: [],
    mode: "approval",
    model: session.model,
    history: [],
  });

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    runId: handle.runId,
    assistantMessageId: handle.assistantMessageId,
  });
}
