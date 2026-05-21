import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { extractBlockText } from "@/builder/blocks/extract-text";
import type { BlockEntity } from "@/builder/types/entity";
import {
  buildBulkPrompt,
  findAction,
  type InlineActionId,
} from "@/components/builder/inline-ai/actions";
import { db, plans } from "@/db";
import { parseJsonBody } from "@/lib/api-validation";
import {
  appendMessage,
  createAdhocSession,
} from "@/services/third-party-facade/chat-store";
import { startChatRun } from "@/services/third-party-facade/claude-runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const InlineAiBodySchema = z.object({
  planId: z.string().min(1),
  blockId: z.string().min(1).optional(),
  blockIds: z.array(z.string().min(1)).optional(),
  actionId: z.string().min(1),
});

// Triggers an inline AI action against one or many blocks. Loads each
// block from the plan snapshot, composes a single prompt that asks the
// runner to emit one staged intent per block, and starts the run in a
// hidden ad-hoc chat session running in approval mode.
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, InlineAiBodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const ids = body.blockIds?.length
    ? body.blockIds
    : body.blockId
      ? [body.blockId]
      : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { ok: false, reason: "MISSING_BLOCK" },
      { status: 400 },
    );
  }
  const action = findAction(body.actionId as InlineActionId);
  if (!action) {
    return NextResponse.json(
      { ok: false, reason: "UNKNOWN_ACTION" },
      { status: 400 },
    );
  }
  if (ids.length > 1 && !action.bulkable) {
    return NextResponse.json(
      { ok: false, reason: "ACTION_NOT_BULKABLE" },
      { status: 409 },
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
  const blocks: { block: BlockEntity; blockText: string }[] = [];
  for (const id of ids) {
    const block = snapshot.blocks?.[id];
    if (!block) {
      return NextResponse.json(
        { ok: false, reason: "BLOCK_NOT_FOUND", blockId: id },
        { status: 404 },
      );
    }
    if (!action.available(block)) {
      return NextResponse.json(
        { ok: false, reason: "ACTION_NOT_AVAILABLE", blockId: id },
        { status: 409 },
      );
    }
    blocks.push({ block, blockText: extractBlockText(block) });
  }

  const prompt =
    blocks.length === 1
      ? action.buildPrompt(blocks[0])
      : buildBulkPrompt(action, blocks);

  const labelTarget =
    blocks.length === 1 ? `${blocks[0].block.kind}` : `${blocks.length} blocks`;

  const session = createAdhocSession({
    planId: body.planId,
    label: `Inline ${action.group}: ${action.label} on ${labelTarget}`,
  });
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: "SESSION_CREATE_FAILED" },
      { status: 500 },
    );
  }

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
    blockCount: blocks.length,
  });
}
